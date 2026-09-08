import type { ConnectionInput, RepositoryScope, SourceBundle, SourceDocument } from "../shared/types.js";
import { AppError } from "./errors.js";
import { makeDocumentKey, makeSourceDigest } from "./domain/identity.js";

const API_ORIGIN = "https://api.github.com";
const TIMEOUT_MS = 15_000;

type Fetcher = typeof fetch;

interface GitHubRepository { default_branch: string }
interface GitHubCommit { sha: string; commit?: { tree?: { sha?: string } } }
interface GitHubTree { truncated: boolean; tree: Array<{ path: string; type: string; sha: string; mode: string }> }
interface GitHubBlob { encoding: string; content: string; sha: string; size: number }

const validSha = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);

const isText = (value: unknown): value is string => typeof value === "string";

const json = async <T>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new AppError("SOURCE_INVALID", "GitHub returned an invalid response.", false, { cause });
  }
};

export class GitHubSource {
  public constructor(private readonly fetcher: Fetcher = fetch) {}

  public validateConnection(input: ConnectionInput): RepositoryScope {
    const raw = (input.repositoryUrl ?? "").trim();
    if (input.sourceType === "local" || /[\\\x00-\x1f\x7f]/.test(input.repositoryUrl ?? "") || !/^https:\/\/github\.com(?::443)?\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i.test(raw)) {
      throw new AppError("INVALID_INPUT", "Enter a public GitHub repository URL without credentials or extra paths.", false);
    }
    const [owner, repositoryPart] = raw.replace(/^https:\/\/github\.com(?::443)?\//i, "").replace(/\/$/, "").split("/");
    const repository = repositoryPart!.replace(/\.git$/i, "");
    if (!owner || !repository || [owner, repository].some(part => part === "." || part === "..")) {
      throw new AppError("INVALID_INPUT", "Enter a GitHub URL in the form https://github.com/owner/repository.", false);
    }
    if (/[\\\x00-\x1f\x7f]/.test(input.folderPath) || input.folderPath.trim().startsWith("/")) {
      throw new AppError("INVALID_INPUT", "Folder path must be a repository-relative path.", false);
    }
    let folderPath = input.folderPath.trim().replace(/\/+$/, "");
    if (folderPath === ".") folderPath = "";
    if (folderPath && folderPath.split("/").some(part => !part || part === "." || part === "..")) {
      throw new AppError("INVALID_INPUT", "Folder path must be a repository-relative path.", false);
    }
    return {
      repositoryKey: `${owner}/${repository}`.toLowerCase(),
      canonicalUrl: `https://github.com/${owner}/${repository}`,
      folderPath
    };
  }

  public async loadMarkdown(scope: RepositoryScope): Promise<SourceBundle> {
    const [owner, repository] = scope.repositoryKey.split("/");
    const repositoryInfo = await this.get<GitHubRepository>(`/repos/${owner}/${repository}`);
    if (!repositoryInfo || !isText(repositoryInfo.default_branch) || !repositoryInfo.default_branch) {
      throw new AppError("SOURCE_INVALID", "GitHub did not provide a default branch.", false);
    }
    const commit = await this.get<GitHubCommit>(`/repos/${owner}/${repository}/commits/${encodeURIComponent(repositoryInfo.default_branch)}`);
    const revision = commit?.sha;
    const treeSha = commit?.commit?.tree?.sha;
    if (!validSha(revision) || !validSha(treeSha)) {
      throw new AppError("SOURCE_INVALID", "GitHub did not provide a complete commit.", false);
    }
    const readTree = async (id: string): Promise<GitHubTree> => {
      const tree = await this.get<GitHubTree>(`/repos/${owner}/${repository}/git/trees/${id}`);
      if (!tree || tree.truncated !== false || !Array.isArray(tree.tree) || tree.tree.some(entry => !entry || !isText(entry.path) || !entry.path || /[\/\\\x00-\x1f\x7f]/.test(entry.path) || entry.path === "." || entry.path === ".." || !validSha(entry.sha) || !["tree", "blob", "commit"].includes(entry.type)) || new Set(tree.tree.map(entry => entry.path)).size !== tree.tree.length) {
        throw new AppError("SOURCE_INVALID", "GitHub returned an incomplete or invalid file tree.", false);
      }
      return tree;
    };
    let tree = await readTree(treeSha);
    for (const part of scope.folderPath ? scope.folderPath.split("/") : []) {
      const folder = tree.tree.find(entry => entry.path === part && entry.type === "tree" && entry.mode === "040000");
      if (!folder) throw new AppError("SOURCE_NOT_FOUND", "The requested folder was not found in the default branch.", false);
      tree = await readTree(folder.sha);
    }
    const documents: SourceDocument[] = [];
    const visit = async (current: GitHubTree, prefix: string, ancestors: Set<string>): Promise<void> => {
      for (const entry of current.tree) {
        const relativePath = prefix ? `${prefix}/${entry.path}` : entry.path;
        if (entry.type === "tree" && entry.mode === "040000") {
          if (ancestors.has(entry.sha)) throw new AppError("SOURCE_INVALID", "GitHub returned a cyclic file tree.", false);
          await visit(await readTree(entry.sha), relativePath, new Set([...ancestors, entry.sha]));
        } else if (entry.type === "blob" && ["100644", "100755"].includes(entry.mode) && entry.path.toLowerCase().endsWith(".md")) {
          documents.push(await this.loadDocument(scope, owner!, repository!, revision, relativePath, entry.sha));
        }
      }
    };
    await visit(tree, scope.folderPath, new Set());
    documents.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    return { scope, defaultBranch: repositoryInfo.default_branch, resolvedRevision: revision, documents };
  }

  private async loadDocument(scope: RepositoryScope, owner: string, repository: string, commitSha: string, relativePath: string, expectedBlobSha: string): Promise<SourceDocument> {
    const blob = await this.get<GitHubBlob>(`/repos/${owner}/${repository}/git/blobs/${expectedBlobSha}`);
    if (!blob || blob.encoding !== "base64" || !isText(blob.content) || blob.sha !== expectedBlobSha || !Number.isSafeInteger(blob.size)) {
      throw new AppError("SOURCE_INVALID", `GitHub returned an invalid Markdown blob for ${relativePath}.`, false);
    }
    const sourceBytes = Buffer.from(blob.content.replace(/\s/g, ""), "base64");
    if (sourceBytes.length !== blob.size || sourceBytes.toString("base64").replace(/=+$/, "") !== blob.content.replace(/\s/g, "").replace(/=+$/, "")) {
      throw new AppError("SOURCE_INVALID", `GitHub returned corrupt Markdown bytes for ${relativePath}.`, false);
    }
    const decoder = new TextDecoder("utf-8", { fatal: true });
    try {
      decoder.decode(sourceBytes);
    } catch (cause) {
      throw new AppError("SOURCE_INVALID", `Markdown ${relativePath} is not valid UTF-8.`, false, { cause });
    }
    return {
      documentKey: makeDocumentKey(scope.repositoryKey, relativePath),
      repositoryKey: scope.repositoryKey,
      relativePath,
      sourceBytes,
      sourceVersion: { commitSha, blobSha: blob.sha, sourceDigest: makeSourceDigest(sourceBytes) }
    };
  }

  private async get<T>(pathname: string): Promise<T> {
    const url = new URL(pathname, API_ORIGIN);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetcher(url, {
        method: "GET", redirect: "manual", signal: controller.signal,
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", "User-Agent": "planrepo-local" }
      });
      if (response.redirected || response.url !== url.href || response.status >= 300 && response.status < 400) {
        throw new AppError("SOURCE_REDIRECT", "GitHub redirected the request; enter the repository's current URL.", false);
      }
      if (response.status === 404) throw new AppError("SOURCE_NOT_FOUND", "The repository or source document was not found.", false);
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        const rateLimited = response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after");
        throw new AppError(rateLimited ? "SOURCE_RATE_LIMIT" : "SOURCE_ACCESS_DENIED", rateLimited ? "GitHub rate limit reached; try again later." : "The GitHub source is not publicly accessible.", rateLimited);
      }
      if (!response.ok) throw new AppError("SOURCE_UNAVAILABLE", "GitHub returned an unavailable response.", true);
      return await json<T>(response);
    } catch (cause) {
      if (controller.signal.aborted) throw new AppError("SOURCE_TIMEOUT", "GitHub did not respond in time.", true, { cause });
      if (cause instanceof AppError) throw cause;
      throw new AppError("SOURCE_UNAVAILABLE", "GitHub could not be reached.", true, { cause });
    } finally {
      clearTimeout(timer);
    }
  }
}

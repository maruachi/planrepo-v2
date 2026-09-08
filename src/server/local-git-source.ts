import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { ConnectionInput, RepositoryScope, SourceBundle, SourceDocument } from "../shared/types.js";
import { AppError } from "./errors.js";
import { makeDocumentKey, makeSourceDigest } from "./domain/identity.js";

const inside = (child: string, parent: string) => { const rel = path.relative(parent, child); return rel === "" || (!rel.startsWith(`..${path.sep}`) && rel !== ".."); };
const git = (root: string, args: string[]) => {
  try { return execFileSync("git", ["-C", root, ...args], { encoding: "buffer", stdio: ["ignore", "pipe", "ignore"] }); }
  catch { throw new AppError("SOURCE_INVALID", "The local source must be a readable Git work tree with HEAD.", false); }
};

export class LocalGitSource {
  public constructor(private readonly workspaceRoot: string) {}
  public validateConnection(input: ConnectionInput): RepositoryScope {
    const raw = input.localPath ?? "";
    if (input.sourceType !== "local" || !path.isAbsolute(raw) || /\x00/.test(raw)) throw new AppError("INVALID_INPUT", "Enter an absolute local repository path.", false);
    let root: string;
    try { root = fs.realpathSync(raw); } catch { throw new AppError("SOURCE_NOT_FOUND", "The local repository path was not found.", false); }
    if (!inside(root, this.workspaceRoot)) throw new AppError("SOURCE_ACCESS_DENIED", "Local repositories must be inside the PlanRepo workspace.", false);
    const top = git(root, ["rev-parse", "--show-toplevel"]).toString("utf8").trim();
    if (path.resolve(top) !== root) throw new AppError("SOURCE_INVALID", "Enter the root of a Git work tree.", false);
    const folderPath = input.folderPath.trim().replace(/\/+$/, "");
    if (folderPath.startsWith("/") || folderPath.split("/").some(part => !part || part === "." || part === "..")) throw new AppError("INVALID_INPUT", "Folder path must be repository-relative.", false);
    return { repositoryKey: `local:${root}`, canonicalUrl: root, folderPath };
  }
  public async loadMarkdown(scope: RepositoryScope): Promise<SourceBundle> {
    const root = scope.canonicalUrl; const revision = git(root, ["rev-parse", "HEAD"]).toString("utf8").trim();
    const prefix = scope.folderPath ? `${scope.folderPath}/` : "";
    const paths = git(root, ["ls-tree", "-r", "-z", "--name-only", "HEAD", "--", scope.folderPath || "."]).toString("utf8").split("\0").filter(p => p.toLowerCase().endsWith(".md"));
    if (scope.folderPath && !git(root, ["cat-file", "-e", `HEAD:${scope.folderPath}`])) throw new AppError("SOURCE_NOT_FOUND", "The requested local folder was not found in HEAD.", false);
    const documents: SourceDocument[] = paths.map(relativePath => { const bytes = git(root, ["show", `HEAD:${relativePath}`]); const blobSha = git(root, ["rev-parse", `HEAD:${relativePath}`]).toString("utf8").trim(); return { documentKey: makeDocumentKey(scope.repositoryKey, relativePath), repositoryKey: scope.repositoryKey, relativePath, sourceBytes: bytes, sourceVersion: { commitSha: revision, blobSha, sourceDigest: makeSourceDigest(bytes) } }; });
    return { scope, defaultBranch: "HEAD", resolvedRevision: revision, documents: documents.sort((a, b) => a.relativePath.localeCompare(b.relativePath)) };
  }
}

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const original = readFileSync(new URL("./fixtures/questions.md", import.meta.url));
export const changed = readFileSync(new URL("./fixtures/changed-questions.md", import.meta.url));
const sha = value => createHash("sha1").update(value).digest("hex");

// A fetch-level HTTP fixture: the real source adapter still constructs every URL.
export const githubFixture = (bytes = original) => {
  const state = { bytes, failure: null, calls: [] };
  const fetcher = async (input, options) => {
    const url = new URL(String(input));
    state.calls.push({ url: url.href, method: options.method });
    if (url.origin !== "https://api.github.com" || options.method !== "GET" || options.redirect !== "manual") throw new Error("Unexpected source request");
    const respond = (payload, status = 200, headers = {}) => {
      const response = new Response(JSON.stringify(payload), { status, headers });
      Object.defineProperty(response, "url", { value: url.href });
      return response;
    };
    if (state.failure === "network") throw new TypeError("fixture network failure");
    if (state.failure === "redirect") return respond({}, 302, { location: "https://example.com/" });
    if (state.failure === "rate") return respond({}, 403, { "x-ratelimit-remaining": "0" });
    if (state.failure === "missing") return respond({}, 404);
    const other = Buffer.from("# 다른 문서\n\n문서를 전환했습니다.\n");
    const documentSha = sha(state.bytes);
    const otherSha = sha(other);
    const rootSha = sha("root"), docsSha = sha("docs"), subSha = sha("sub"), emptySha = sha("empty");
    const entry = (path, type, value) => ({ path, type, sha: value, mode: type === "tree" ? "040000" : "100644" });
    const trees = {
      [rootSha]: [entry("docs", "tree", docsSha), entry("empty", "tree", emptySha), entry("outside.md", "blob", otherSha)],
      [docsSha]: [entry("questions.md", "blob", documentSha), entry("sub", "tree", subSha), entry("note.txt", "blob", otherSha), { ...entry("symlink.md", "blob", otherSha), mode: "120000" }],
      [subSha]: [entry("other.md", "blob", otherSha)],
      [emptySha]: []
    };
    if (url.pathname === "/repos/example/planrepo") return respond({ default_branch: "main" });
    if (url.pathname === "/repos/example/planrepo/commits/main") return respond({ sha: sha(state.bytes), commit: { tree: { sha: rootSha } } });
    const treeId = url.pathname.match(/\/git\/trees\/([a-f0-9]+)$/)?.[1];
    if (treeId && trees[treeId]) {
      if (url.searchParams.has("recursive")) {
        return respond({ sha: treeId, truncated: state.failure === "truncated", tree: [entry("docs", "tree", docsSha), entry("empty", "tree", emptySha), entry("docs/questions.md", "blob", documentSha), entry("docs/sub/other.md", "blob", otherSha), entry("outside.md", "blob", otherSha), { ...entry("docs/symlink.md", "blob", otherSha), mode: "120000" }] });
      }
      return respond({ sha: treeId, truncated: state.failure === "truncated", tree: trees[treeId] });
    }
    const blobId = url.pathname.match(/\/git\/blobs\/([a-f0-9]+)$/)?.[1];
    if (blobId === documentSha || blobId === otherSha) {
      const content = blobId === documentSha ? state.bytes : other;
      return respond({ sha: blobId, encoding: "base64", size: content.length, content: content.toString("base64") });
    }
    return respond({}, 404);
  };
  return { state, fetcher };
};

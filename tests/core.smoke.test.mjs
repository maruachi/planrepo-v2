import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { createApp } from "../dist/server/app.js";
import { loadAppConfig } from "../dist/server/app-config.js";
import { QuestionParser } from "../dist/server/markdown/question-parser.js";
import { MarkdownExporter } from "../dist/server/markdown/exporter.js";
import { makeDocumentKey, makeSourceDigest } from "../dist/server/domain/identity.js";
import { githubFixture, original, changed } from "./github-fixture.mjs";

const input = { repositoryUrl: "https://github.com/example/planrepo", folderPath: "docs" };
const headers = { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" };
const setup = async (t, bytes = original) => {
  const directory = await mkdtemp(path.join(tmpdir(), "planrepo-smoke-"));
  const config = loadAppConfig({ PLANREPO_DB_PATH: path.join(directory, "state.sqlite") });
  const fixture = githubFixture(bytes);
  let app = await createApp(config, { fetcher: fixture.fetcher });
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  return {
    config, fixture,
    request: (method, url, payload, extra = {}) => app.inject({ method, url, headers, ...(payload === undefined ? {} : { payload }), ...extra }),
    restart: async () => { await app.close(); app = await createApp(config, { fetcher: fixture.fetcher }); }
  };
};
const connected = async context => {
  const response = await context.request("POST", "/api/connection", input);
  assert.equal(response.statusCode, 200, response.body);
  return response.json();
};
const documentUrl = (route, workspace) => `/api/${route}?${new URLSearchParams({ snapshotId: workspace.snapshotId, documentKey: workspace.documents.find(document => document.relativePath === "docs/questions.md").documentKey })}`;
const selectionsFor = workspace => ["1", "2"].map(number => ({ questionKey: workspace.unresolvedQuestions.find(question => question.number === number).questionKey, optionLetter: "A" }));

test("SM-02: connection boundaries, complete document set, parsing and safe rendering", async t => {
  const context = await setup(t);
  for (const url of ["/src/server/main.ts", "/.local/planrepo.sqlite", "/package.json"]) assert.equal((await context.request("GET", url)).statusCode, 404);
  for (const repositoryUrl of ["https://example.com/owner/repo", "https://user:password@github.com/owner/repo", "https://github.com:444/owner/repo", "https://github.com/a/../owner/repo", "https://github.com/owner//repo", "https://github.com/owner/repo?x=1", "https://github.com/owner/repo\\"]) {
    assert.equal((await context.request("POST", "/api/connection", { ...input, repositoryUrl })).statusCode, 400, repositoryUrl);
  }
  for (const folderPath of ["/docs", "docs\\child", "../docs", "docs/../other", "docs\u0000"]) assert.equal((await context.request("POST", "/api/connection", { ...input, folderPath })).statusCode, 400, folderPath);
  assert.equal(context.fixture.state.calls.length, 0);
  assert.equal((await context.request("POST", "/api/connection", input, { headers: { host: "evil.test:3000", origin: "http://evil.test:3000" } })).statusCode, 403);
  assert.equal((await context.request("POST", "/api/connection", input, { headers: { host: headers.host } })).statusCode, 403);
  assert.equal((await context.request("POST", "/api/connection", input, { headers: { ...headers, origin: "null" } })).statusCode, 403);
  assert.equal((await context.request("POST", "/api/connection", { ...input, extra: true })).statusCode, 400);
  assert.equal((await context.request("POST", "/api/connection", { ...input, folderPath: 1 })).statusCode, 400);
  assert.equal((await context.request("POST", "/api/connection", "x", { headers: { ...headers, "content-type": "text/plain" } })).statusCode, 415);
  const workspace = await connected(context);
  assert.deepEqual(workspace.documents.map(document => document.relativePath), ["docs/questions.md", "docs/sub/other.md"]);
  assert.deepEqual(workspace.unresolvedQuestions.map(question => question.number), ["1", "2", "4"]);
  assert.ok(workspace.warnings.some(warning => warning.code === "MALFORMED_QUESTION"));
  assert.equal(workspace.warnings.filter(warning => warning.code === "AMBIGUOUS_QUESTION").length, 2);
  const document = (await context.request("GET", documentUrl("document", workspace))).json();
  assert.ok(document.safeHtml.includes("&lt;script&gt;"));
  assert.ok(!/<script|href="javascript:/i.test(document.safeHtml));
  assert.ok(document.safeHtml.includes('id="검토-문서"'));
  assert.ok(document.safeHtml.includes('alt="대체 텍스트"'));
  assert.ok(document.safeHtml.includes("https://github.com/example/planrepo/blob/"));
  assert.ok(document.effectiveQuestions.some(question => question.number === "3" && question.status === "source_answered"));
  for (const [failure, expected] of [["redirect", "SOURCE_REDIRECT"], ["network", "SOURCE_UNAVAILABLE"], ["truncated", "SOURCE_INVALID"], ["rate", "SOURCE_RATE_LIMIT"], ["missing", "SOURCE_NOT_FOUND"]]) {
    context.fixture.state.failure = failure;
    assert.equal((await context.request("POST", "/api/connection", input)).json().error.code, expected);
    assert.equal((await context.request("GET", `/api/workspace?snapshotId=${workspace.snapshotId}`)).statusCode, 200);
  }
  context.fixture.state.failure = null;
  assert.equal((await context.request("POST", "/api/connection", { ...input, folderPath: "does-not-exist" })).statusCode, 404);
  assert.equal((await context.request("POST", "/api/connection", { ...input, folderPath: "docs/questions.md" })).statusCode, 404);
  const empty = await context.request("POST", "/api/connection", { ...input, folderPath: "empty" });
  assert.equal(empty.statusCode, 200);
  assert.deepEqual(empty.json().documents, []);
  assert.equal((await context.request("GET", `/api/workspace?snapshotId=${workspace.snapshotId}`)).statusCode, 409);
  assert.ok(context.fixture.state.calls.every(call => call.method === "GET"));
});

test("SM-03: atomic confirmation, retries, persistence and changed-source merge", async t => {
  const context = await setup(t);
  let workspace = await connected(context);
  const selections = selectionsFor(workspace);
  const payload = { snapshotId: workspace.snapshotId, selections };
  assert.equal((await context.request("POST", "/api/answers", { ...payload, selections: [selections[0], { ...selections[1], optionLetter: "Z" }] })).statusCode, 400);
  assert.equal((await context.request("POST", "/api/answers", { ...payload, selections: [selections[0], selections[0]] })).statusCode, 400);
  const db = new Database(context.config.databasePath);
  try {
    db.exec("CREATE TRIGGER smoke_fail BEFORE INSERT ON decisions WHEN (SELECT COUNT(*) FROM decisions) = 1 BEGIN SELECT RAISE(ABORT, 'simulated disk failure'); END");
    const failed = await context.request("POST", "/api/answers", payload);
    assert.equal(failed.statusCode, 503);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM decisions").get().count, 0);
    assert.ok(!failed.body.includes("simulated disk failure"));
    db.exec("DROP TRIGGER smoke_fail");
  } finally { db.close(); }
  const saved = await context.request("POST", "/api/answers", payload);
  assert.equal(saved.statusCode, 200, saved.body);
  assert.equal(saved.json().workspace.unresolvedQuestions.length, 1);
  const retry = await context.request("POST", "/api/answers", payload);
  assert.deepEqual(retry.json().decisions, saved.json().decisions);
  assert.equal((await context.request("POST", "/api/answers", { ...payload, selections: [{ ...selections[0], optionLetter: "B" }] })).statusCode, 409);
  await context.restart();
  assert.deepEqual((await context.request("GET", "/api/connection")).json().recentConnection, input);
  assert.equal((await context.request("GET", `/api/workspace?snapshotId=${workspace.snapshotId}`)).statusCode, 409);
  workspace = await connected(context);
  assert.equal(workspace.unresolvedQuestions.length, 1);
  context.fixture.state.bytes = Buffer.concat([Buffer.from("소개가 추가되었습니다.\n\n"), original]);
  workspace = await connected(context);
  assert.equal(workspace.unresolvedQuestions.length, 1);
  const exported = await context.request("GET", documentUrl("export", workspace));
  assert.ok(exported.body.includes("[Answer]: \tA"), "compatible answers survive unrelated source changes in exports");
  context.fixture.state.bytes = changed;
  workspace = await connected(context);
  assert.deepEqual(workspace.unresolvedQuestions.map(question => question.number), ["2"]);
  assert.ok(workspace.warnings.some(warning => warning.code === "DECISION_CONFLICT"));
  assert.ok(workspace.warnings.some(warning => warning.code === "UNMATCHED_DECISION"));
  assert.deepEqual((await context.request("GET", documentUrl("export", workspace))).rawPayload, changed);
  const database = new Database(context.config.databasePath);
  try {
    database.prepare("UPDATE decisions SET canonical_identity = ?").run("corrupt");
    const failed = await context.request("POST", "/api/connection", { ...input, folderPath: "." });
    assert.equal(failed.json().error.code, "STORAGE_INVALID");
    assert.deepEqual((await context.request("GET", "/api/connection")).json().recentConnection, input);
  } finally { database.close(); }
});

test("SM-04: byte-preserving download, pending answers and reparse", async t => {
  const bytes = Buffer.from("\uFEFF" + original.toString("utf8").trimEnd().replace(/\n/g, "\r\n"));
  const context = await setup(t, bytes);
  const workspace = await connected(context);
  assert.deepEqual((await context.request("GET", documentUrl("export", workspace))).rawPayload, bytes);
  const result = await context.request("POST", "/api/answers", { snapshotId: workspace.snapshotId, selections: selectionsFor(workspace) });
  assert.equal(result.statusCode, 200);
  const downloaded = await context.request("GET", documentUrl("export", workspace));
  const expected = Buffer.from(bytes.toString("utf8").replace("[Answer]: \t\r\n", "[Answer]: \tA\r\n").replace("[Answer]:\r\n", "[Answer]: A\r\n"));
  assert.deepEqual(downloaded.rawPayload, expected);
  assert.match(downloaded.headers["content-disposition"], /^attachment;/);
  const source = { repositoryKey: "example/planrepo", relativePath: "docs/questions.md", documentKey: makeDocumentKey("example/planrepo", "docs/questions.md"), sourceBytes: expected, sourceVersion: { commitSha: "a".repeat(40), blobSha: "b".repeat(40), sourceDigest: makeSourceDigest(expected) } };
  const parser = new QuestionParser();
  assert.deepEqual(parser.parse(source).questions.map(question => [question.number, question.sourceAnswer.trim()]), [["1", "A"], ["2", "A"], ["3", "B"], ["4", ""]]);
  const crSource = { ...source, sourceBytes: Buffer.from(expected.toString("utf8").replace(/\r\n/g, "\r")) };
  assert.equal(parser.parse(crSource).questions.length, 4);
  const unanswered = { ...source, sourceBytes: bytes, sourceVersion: { ...source.sourceVersion, sourceDigest: makeSourceDigest(bytes) } };
  const question = parser.parse(unanswered).questions[0];
  const decision = { ...question, selectedLetter: "A", uniqueAtDecision: true, sourceVersionAtDecision: unanswered.sourceVersion };
  const invalid = { ...question, answerSpan: { ...question.answerSpan, colonOffset: 0 } };
  assert.throws(() => new MarkdownExporter().export(unanswered, [invalid], [decision]), error => error.code === "EXPORT_MISMATCH");
  assert.ok(context.fixture.state.calls.every(call => call.method === "GET"));
});

test("SM-05: local Git HEAD source is read-only and excludes working-tree changes", async t => {
  const context = await setup(t);
  const localInput = { sourceType: "local", localPath: process.cwd(), folderPath: "aidlc-docs/inception/requirements" };
  const workspace = (await context.request("POST", "/api/connection", localInput)).json();
  assert.ok(workspace.documents.some(document => document.relativePath.endsWith("requirements.md")));
  const document = (await context.request("GET", `/api/document?${new URLSearchParams({ snapshotId: workspace.snapshotId, documentKey: workspace.documents.find(document => document.relativePath.endsWith("requirements.md")).documentKey })}`)).json();
  assert.ok(!document.safeHtml.includes("로컬 Git 작업 트리"), "working-tree requirement edits must not appear in HEAD output");
  assert.equal((await context.request("POST", "/api/connection", { sourceType: "local", localPath: "/tmp", folderPath: "" })).statusCode, 422);
});

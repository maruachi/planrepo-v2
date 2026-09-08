import type { Buffer } from "node:buffer";

export type DocumentKey = string;
export type QuestionKey = string;
export type SnapshotId = string;
export type RepositoryKey = string;

export interface ConnectionInput {
  sourceType?: "github" | "local";
  repositoryUrl?: string;
  localPath?: string;
  folderPath: string;
}

export interface RepositoryScope {
  repositoryKey: RepositoryKey;
  canonicalUrl: string;
  folderPath: string;
}

export interface SourceVersion {
  commitSha: string;
  blobSha: string;
  sourceDigest: string;
}

export interface SourceDocument {
  documentKey: DocumentKey;
  repositoryKey: RepositoryKey;
  relativePath: string;
  sourceBytes: Buffer;
  sourceVersion: SourceVersion;
}

export interface SourceBundle {
  scope: RepositoryScope;
  defaultBranch: string;
  resolvedRevision: string;
  documents: SourceDocument[];
}

export interface Option {
  letter: string;
  content: string;
}

export interface AnswerSpan {
  lineStart: number;
  lineEnd: number;
  colonOffset: number;
  insertOffset: number;
  valueStart: number;
  valueEnd: number;
}

export interface ParsedQuestion {
  questionKey: QuestionKey;
  documentKey: DocumentKey;
  documentPath: string;
  number: string;
  prompt: string;
  options: Option[];
  sourceAnswer: string;
  canonicalIdentity: string;
  identityVersion: 1;
  identityDigest: string;
  answerSpan: AnswerSpan;
  lineNumber: number;
}

export type WarningCode =
  | "MALFORMED_QUESTION"
  | "AMBIGUOUS_QUESTION"
  | "SOURCE_ANSWER_INVALID"
  | "DECISION_CONFLICT"
  | "UNMATCHED_DECISION";

export interface Warning {
  code: WarningCode;
  documentKey: DocumentKey;
  lineNumber: number;
  message: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  warnings: Warning[];
}

export interface AnswerSelection {
  questionKey: QuestionKey;
  optionLetter: string;
}

export interface SavedDecision {
  documentKey: DocumentKey;
  documentPath: string;
  questionKey: QuestionKey;
  identityVersion: 1;
  identityDigest: string;
  canonicalIdentity: string;
  selectedLetter: string;
  decidedAt: string;
  sourceVersionAtDecision: SourceVersion;
  uniqueAtDecision: true;
}

export type QuestionStatus = "unresolved" | "local_confirmed" | "source_answered";
export type AnswerOrigin = "none" | "local" | "source";

export interface EffectiveQuestion {
  questionKey: QuestionKey;
  documentKey: DocumentKey;
  documentPath: string;
  number: string;
  prompt: string;
  options: Option[];
  status: QuestionStatus;
  effectiveAnswer: string | null;
  answerOrigin: AnswerOrigin;
}

export interface DocumentSummary {
  documentKey: DocumentKey;
  relativePath: string;
  unresolvedCount: number;
  completedCount: number;
}

export interface WorkspaceView {
  snapshotId: SnapshotId;
  connection: ConnectionInput;
  documents: DocumentSummary[];
  unresolvedQuestions: EffectiveQuestion[];
  warnings: Warning[];
}

export interface DocumentView {
  documentKey: DocumentKey;
  safeHtml: string;
  effectiveQuestions: EffectiveQuestion[];
  warnings: Warning[];
}

export interface CommitResult {
  decisions: Array<Pick<SavedDecision, "questionKey" | "documentKey" | "selectedLetter" | "decidedAt">>;
  workspace: WorkspaceView;
}

export interface DownloadFile {
  fileName: string;
  content: Buffer;
  contentType: "text/markdown; charset=utf-8";
}

export interface ReviewContext {
  snapshotId: SnapshotId;
  sourceBundle: SourceBundle;
  parseResults: Map<DocumentKey, ParseResult>;
}

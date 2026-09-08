import { createHash } from "node:crypto";
import type { DocumentKey, Option, QuestionKey, RepositoryKey, SourceVersion } from "../../shared/types.js";

export const IDENTITY_VERSION = 1 as const;

const encode = (value: unknown): string => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

export const normalizeComparableText = (value: string): string => value.replace(/\r\n?/g, "\n").trim();

export const makeDocumentKey = (repositoryKey: RepositoryKey, relativePath: string): DocumentKey => encode([repositoryKey, relativePath]);

export const makeCanonicalIdentity = (number: string, prompt: string, options: Option[]): string =>
  JSON.stringify([
    IDENTITY_VERSION,
    number,
    normalizeComparableText(prompt),
    options.map(({ letter, content }) => [letter, normalizeComparableText(content)])
  ]);

export const makeIdentityDigest = (canonicalIdentity: string): string =>
  createHash("sha256").update(canonicalIdentity, "utf8").digest("hex");

export const makeQuestionKey = (documentKey: DocumentKey, identityDigest: string): QuestionKey =>
  encode([documentKey, IDENTITY_VERSION, identityDigest]);

export const makeSourceDigest = (sourceBytes: Buffer): string => createHash("sha256").update(sourceBytes).digest("hex");

export const serializeSourceVersion = (sourceVersion: SourceVersion): string => JSON.stringify(sourceVersion);

export const sameSourceVersion = (left: SourceVersion, right: SourceVersion): boolean =>
  left.commitSha === right.commitSha && left.blobSha === right.blobSha && left.sourceDigest === right.sourceDigest;

export const nowIso = (): string => new Date().toISOString();

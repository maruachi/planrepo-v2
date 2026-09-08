import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { ConnectionInput, RepositoryKey, SavedDecision, SourceVersion } from "../../shared/types.js";
import { AppError } from "../errors.js";
import { initializeSchema } from "./schema.js";
import { makeDocumentKey, makeIdentityDigest, makeQuestionKey, makeCanonicalIdentity } from "../domain/identity.js";

interface DecisionRow {
  repository_key: string;
  document_path: string;
  identity_version: number;
  identity_digest: string;
  question_key: string;
  canonical_identity: string;
  selected_letter: string;
  decided_at: string;
  source_version_at_decision: string;
  unique_at_decision: number;
}

const toSourceVersion = (value: string): SourceVersion => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as SourceVersion).commitSha === "string" &&
      typeof (parsed as SourceVersion).blobSha === "string" &&
      typeof (parsed as SourceVersion).sourceDigest === "string" &&
      /^[a-f0-9]{40}$/.test((parsed as SourceVersion).commitSha) &&
      /^[a-f0-9]{40}$/.test((parsed as SourceVersion).blobSha) &&
      /^[a-f0-9]{64}$/.test((parsed as SourceVersion).sourceDigest)
    ) {
      return parsed as SourceVersion;
    }
  } catch {
    // Deliberately handled below as local database corruption.
  }
  throw new AppError("STORAGE_INVALID", "A saved local decision is invalid.", false);
};

const toDecision = (row: DecisionRow): SavedDecision => {
  try {
    const identity: unknown = JSON.parse(row.canonical_identity);
    if (!Array.isArray(identity) || identity.length !== 4 || identity[0] !== 1 || typeof identity[1] !== "string" || !/^[0-9]+$/.test(identity[1]) || typeof identity[2] !== "string" || !identity[2].trim() || !Array.isArray(identity[3]) || identity[3].length < 2 || identity[3].some(option => !Array.isArray(option) || option.length !== 2 || typeof option[0] !== "string" || !/^[A-Z]$/.test(option[0]) || typeof option[1] !== "string" || !option[1].trim())) throw new Error("Invalid identity");
    const options = identity[3].map(option => ({ letter: option[0] as string, content: option[1] as string }));
    const documentKey = makeDocumentKey(row.repository_key, row.document_path);
    if (row.identity_version !== 1 || row.unique_at_decision !== 1 || new Set(options.map(option => option.letter)).size !== options.length || !options.some(option => option.letter === row.selected_letter) || makeCanonicalIdentity(identity[1], identity[2], options) !== row.canonical_identity || makeIdentityDigest(row.canonical_identity) !== row.identity_digest || makeQuestionKey(documentKey, row.identity_digest) !== row.question_key || !Number.isFinite(Date.parse(row.decided_at))) throw new Error("Invalid decision");
    return {
  documentKey,
  documentPath: row.document_path,
  questionKey: row.question_key,
  identityVersion: 1,
  identityDigest: row.identity_digest,
  canonicalIdentity: row.canonical_identity,
  selectedLetter: row.selected_letter,
  decidedAt: row.decided_at,
  sourceVersionAtDecision: toSourceVersion(row.source_version_at_decision),
  uniqueAtDecision: true
    };
  } catch (cause) {
    throw new AppError("STORAGE_INVALID", "A saved local decision is invalid.", false, { cause });
  }
};

export class DecisionStore {
  private constructor(private readonly database: Database.Database) {}

  public static open(databasePath: string): DecisionStore {
    let database: Database.Database | undefined;
    try {
      fs.mkdirSync(path.dirname(databasePath), { recursive: true });
      database = new Database(databasePath);
      initializeSchema(database);
      return new DecisionStore(database);
    } catch (error) {
      database?.close();
      if (error instanceof AppError) throw error;
      throw new AppError("STORAGE_UNAVAILABLE", "The local PlanRepo database could not be opened.", true, { cause: error });
    }
  }

  public close(): void {
    this.database.close();
  }

  public getRecentConnection(): (ConnectionInput & { repositoryKey: RepositoryKey }) | null {
    try {
    const row = this.database.prepare("SELECT repository_key, canonical_url, folder_path FROM recent_connection WHERE singleton_id = 1").get() as
      | { repository_key: RepositoryKey; canonical_url: string; folder_path: string }
      | undefined;
    return row ? { repositoryKey: row.repository_key, repositoryUrl: row.canonical_url, folderPath: row.folder_path } : null;
    } catch (cause) {
      throw new AppError("STORAGE_UNAVAILABLE", "The recent connection could not be read.", true, { cause });
    }
  }

  public saveRecentConnection(connection: ConnectionInput & { repositoryKey: RepositoryKey }): void {
    try {
      this.database
        .prepare(
          `INSERT INTO recent_connection (singleton_id, repository_key, canonical_url, folder_path, updated_at)
           VALUES (1, @repositoryKey, @repositoryUrl, @folderPath, @updatedAt)
           ON CONFLICT(singleton_id) DO UPDATE SET
             repository_key = excluded.repository_key,
             canonical_url = excluded.canonical_url,
             folder_path = excluded.folder_path,
             updated_at = excluded.updated_at`
        )
        .run({ ...connection, updatedAt: new Date().toISOString() });
    } catch (error) {
      throw new AppError("STORAGE_UNAVAILABLE", "The recent connection could not be saved.", true, { cause: error });
    }
  }

  public listDecisions(repositoryKey: RepositoryKey, documentPaths: string[]): SavedDecision[] {
    if (documentPaths.length === 0) return [];
    try {
      const placeholders = documentPaths.map(() => "?").join(", ");
      const rows = this.database
        .prepare(`SELECT * FROM decisions WHERE repository_key = ? AND document_path IN (${placeholders})`)
        .all(repositoryKey, ...documentPaths) as DecisionRow[];
      return rows.map(toDecision);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("STORAGE_UNAVAILABLE", "Saved decisions could not be read.", true, { cause: error });
    }
  }

  public saveDecisions(repositoryKey: RepositoryKey, decisions: SavedDecision[]): SavedDecision[] {
    try {
      return this.database.transaction((candidates: SavedDecision[]) => {
        const select = this.database.prepare(
          "SELECT * FROM decisions WHERE repository_key = ? AND document_path = ? AND identity_version = ? AND identity_digest = ?"
        );
        const insert = this.database.prepare(
          `INSERT INTO decisions (
             repository_key, document_path, identity_version, identity_digest, question_key,
             canonical_identity, selected_letter, decided_at, source_version_at_decision, unique_at_decision
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        );
        const saved: SavedDecision[] = [];
        for (const candidate of candidates) {
          const existing = select.get(repositoryKey, candidate.documentPath, candidate.identityVersion, candidate.identityDigest) as DecisionRow | undefined;
          if (existing) {
            if (existing.canonical_identity !== candidate.canonicalIdentity || existing.selected_letter !== candidate.selectedLetter) {
              throw new AppError("DECISION_CONFLICT", "A different answer was already confirmed for this question.", false);
            }
            saved.push({ ...toDecision(existing), documentKey: candidate.documentKey });
            continue;
          }
          insert.run(
            repositoryKey,
            candidate.documentPath,
            candidate.identityVersion,
            candidate.identityDigest,
            candidate.questionKey,
            candidate.canonicalIdentity,
            candidate.selectedLetter,
            candidate.decidedAt,
            JSON.stringify(candidate.sourceVersionAtDecision)
          );
          saved.push(candidate);
        }
        return saved;
      })(decisions);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("STORAGE_UNAVAILABLE", "The selected answers could not be saved.", true, { cause: error });
    }
  }
}

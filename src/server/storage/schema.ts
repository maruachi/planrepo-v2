import type Database from "better-sqlite3";
import { AppError } from "../errors.js";

const schemaSql = `
CREATE TABLE recent_connection (
  singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
  repository_key TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE decisions (
  repository_key TEXT NOT NULL,
  document_path TEXT NOT NULL,
  identity_version INTEGER NOT NULL CHECK (identity_version = 1),
  identity_digest TEXT NOT NULL,
  question_key TEXT NOT NULL,
  canonical_identity TEXT NOT NULL,
  selected_letter TEXT NOT NULL CHECK (length(selected_letter) = 1 AND selected_letter GLOB '[A-Z]'),
  decided_at TEXT NOT NULL,
  source_version_at_decision TEXT NOT NULL,
  unique_at_decision INTEGER NOT NULL CHECK (unique_at_decision = 1),
  PRIMARY KEY (repository_key, document_path, identity_version, identity_digest)
);`;

const expectedTables = ["recent_connection", "decisions"] as const;

export const initializeSchema = (database: Database.Database): void => {
  try {
    database.transaction(() => {
      const version = Number(database.pragma("user_version", { simple: true }));
      const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>;
      if (version === 0 && tables.length === 0) {
        database.exec(schemaSql);
        database.pragma("user_version = 1");
        return;
      }
      if (version !== 1 || tables.length !== expectedTables.length || !expectedTables.every(name => tables.some(table => table.name === name))) {
        throw new AppError("STORAGE_INVALID", "The local PlanRepo database schema is not supported.", false);
      }
      const expected: Record<string, Array<[string, string, number, number]>> = {
        recent_connection: [["singleton_id", "INTEGER", 0, 1], ["repository_key", "TEXT", 1, 0], ["canonical_url", "TEXT", 1, 0], ["folder_path", "TEXT", 1, 0], ["updated_at", "TEXT", 1, 0]],
        decisions: [["repository_key", "TEXT", 1, 1], ["document_path", "TEXT", 1, 2], ["identity_version", "INTEGER", 1, 3], ["identity_digest", "TEXT", 1, 4], ["question_key", "TEXT", 1, 0], ["canonical_identity", "TEXT", 1, 0], ["selected_letter", "TEXT", 1, 0], ["decided_at", "TEXT", 1, 0], ["source_version_at_decision", "TEXT", 1, 0], ["unique_at_decision", "INTEGER", 1, 0]]
      };
      for (const name of expectedTables) {
        const columns = database.pragma(`table_info(${name})`) as Array<{ name: string; type: string; notnull: number; pk: number }>;
        if (JSON.stringify(columns.map(column => [column.name, column.type.toUpperCase(), column.notnull, column.pk])) !== JSON.stringify(expected[name])) {
          throw new AppError("STORAGE_INVALID", "The local PlanRepo database columns or keys are not supported.", false);
        }
      }
    })();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("STORAGE_INVALID", "The local PlanRepo database could not be initialized.", false, { cause: error });
  }
};

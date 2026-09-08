import path from "node:path";
import { AppError } from "./errors.js";

const isInside = (candidate: string, parent: string): boolean => {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
};

const parsePort = (value: string | undefined): number => {
  if (value === undefined || value === "") return 3000;
  if (!/^[0-9]+$/.test(value)) {
    throw new AppError("INVALID_INPUT", "PLANREPO_PORT must be a valid TCP port.", false);
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new AppError("INVALID_INPUT", "PLANREPO_PORT must be a valid TCP port.", false);
  }
  return port;
};

export interface AppConfig {
  rootDirectory: string;
  databasePath: string;
  staticDirectory: string;
  host: "127.0.0.1";
  port: number;
}

export const loadAppConfig = (environment: NodeJS.ProcessEnv = process.env, rootDirectory = process.cwd()): AppConfig => {
  const root = path.resolve(rootDirectory);
  const staticDirectory = path.join(root, "dist", "client");
  const configuredPath = environment.PLANREPO_DB_PATH;
  const databasePath = path.resolve(root, configuredPath || path.join(".local", "planrepo.sqlite"));

  if (isInside(databasePath, staticDirectory)) {
    throw new AppError("INVALID_INPUT", "PLANREPO_DB_PATH must not be inside the static UI directory.", false);
  }

  return { rootDirectory: root, databasePath, staticDirectory, host: "127.0.0.1", port: parsePort(environment.PLANREPO_PORT) };
};

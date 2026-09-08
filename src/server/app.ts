import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import type { AppConfig } from "./app-config.js";
import { AppError, internalError } from "./errors.js";
import { GitHubSource } from "./github-source.js";
import { registerRoutes } from "./http/routes.js";
import { MarkdownExporter } from "./markdown/exporter.js";
import { MarkdownRenderer } from "./markdown/renderer.js";
import { QuestionParser } from "./markdown/question-parser.js";
import { PlanRepoService } from "./planrepo-service.js";
import { DecisionStore } from "./storage/decision-store.js";

export const createApp = async (config: AppConfig, options: { fetcher?: typeof fetch } = {}) => {
  const app = Fastify({ logger: false, trustProxy: false, ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } } });
  const store = DecisionStore.open(config.databasePath);
  app.addHook("onClose", async () => store.close());
  app.addHook("onRequest", async (request, reply) => {
    const host = request.headers.host;
    if (host !== `127.0.0.1:${config.port}` && host !== `localhost:${config.port}`) {
      throw new AppError("FORBIDDEN_HOST", "Use the local PlanRepo address and configured port.", false);
    }
    const origin = request.headers.origin;
    if ((request.method === "POST" || origin !== undefined) && origin !== `http://${host}`) {
      throw new AppError("FORBIDDEN_ORIGIN", "Open PlanRepo and submit from the same local address.", false);
    }
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    if (request.url.startsWith("/api/")) reply.header("Cache-Control", "no-store");
    if (request.method === "POST" && !/^application\/json(?:\s*;|$)/i.test(request.headers["content-type"] ?? "")) {
      return reply.code(415).send(new AppError("INVALID_INPUT", "Submit an application/json request.", false).toResponse());
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    const framework = error as { validation?: unknown; statusCode?: number };
    if (framework.validation || [400, 413, 415].includes(framework.statusCode ?? 0) && !(error instanceof AppError)) {
      return reply.code(framework.statusCode ?? 400).send(new AppError("INVALID_INPUT", "The request format is invalid.", false).toResponse());
    }
    if ([403, 404].includes(framework.statusCode ?? 0) && !(error instanceof AppError)) {
      return reply.code(404).send(new AppError("DOCUMENT_NOT_FOUND", "The requested resource was not found.", false).toResponse());
    }
    const safe = internalError(error);
    return reply.code(safe.statusCode).send(safe.toResponse());
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send(new AppError("DOCUMENT_NOT_FOUND", "The requested resource was not found.", false).toResponse()));
  try {
    registerRoutes(app, new PlanRepoService(new GitHubSource(options.fetcher), new QuestionParser(), new MarkdownRenderer(), store, new MarkdownExporter()));
    await app.register(fastifyStatic, { root: config.staticDirectory, dotfiles: "deny", index: ["index.html"] });
    await app.ready();
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
};

import type { FastifyInstance } from "fastify";
import type { AnswerSelection, ConnectionInput } from "../../shared/types.js";
import type { PlanRepoService } from "../planrepo-service.js";
import { answersSchema, connectionSchema, documentSchema, snapshotSchema } from "./schemas.js";

type SnapshotQuery = { snapshotId: string };
type DocumentQuery = SnapshotQuery & { documentKey: string };

export const registerRoutes = (app: FastifyInstance, service: PlanRepoService): void => {
  app.get("/api/connection", async () => ({ recentConnection: service.getRecentConnection() }));
  app.post<{ Body: ConnectionInput }>("/api/connection", { schema: { body: connectionSchema } }, async (request) => service.connect(request.body));
  app.get<{ Querystring: SnapshotQuery }>("/api/workspace", { schema: { querystring: snapshotSchema } }, async (request) => service.getWorkspace(request.query.snapshotId));
  app.get<{ Querystring: DocumentQuery }>("/api/document", { schema: { querystring: documentSchema } }, async (request) => service.getDocument(request.query.snapshotId, request.query.documentKey));
  app.post<{ Body: SnapshotQuery & { selections: AnswerSelection[] } }>("/api/answers", { schema: { body: answersSchema } }, async (request) => service.commitAnswers(request.body.snapshotId, request.body.selections));
  app.get<{ Querystring: DocumentQuery }>("/api/export", { schema: { querystring: documentSchema } }, async (request, reply) => {
    const file = service.exportDocument(request.query.snapshotId, request.query.documentKey);
    const encoded = encodeURIComponent(file.fileName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    return reply.type(file.contentType).header("Content-Disposition", `attachment; filename="document.md"; filename*=UTF-8''${encoded}`).send(file.content);
  });
};

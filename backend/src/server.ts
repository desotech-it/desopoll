import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import type { Env } from "./env.js";
import { db } from "./db.js";
import { redis } from "./redis.js";
import { type RealtimeTransport } from "./realtime.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerQuizRoutes } from "./routes/quizzes.js";
import { registerQuestionRoutes } from "./routes/questions.js";
import { registerShareRoutes } from "./routes/shares.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerGroupRoutes } from "./routes/groups.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerSessionRoutes } from "./routes/sessions.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerGameWebsocket } from "./game/ws.js";

export async function buildServer(env: Env, realtime: RealtimeTransport): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.NODE_ENV === "development" ? "info" : "warn" },
    // Raised from the 1 MiB default so questions can carry inline data-URL images.
    // The per-question image is additionally size-validated in the quiz routes.
    bodyLimit: 8 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  });
  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(websocket);

  await registerAuthRoutes(app, env);
  await registerQuizRoutes(app);
  await registerQuestionRoutes(app);
  await registerShareRoutes(app);
  await registerUserRoutes(app);
  await registerGroupRoutes(app);
  await registerAdminRoutes(app);
  await registerSessionRoutes(app);
  await registerReportRoutes(app);

  // Liveness: process is up.
  app.get("/healthz", async () => ({ status: "ok" }));

  // Readiness: dependencies reachable.
  app.get("/readyz", async (_req, reply) => {
    try {
      await db().query("SELECT 1");
      await redis().ping();
      return { status: "ready" };
    } catch (err) {
      reply.code(503);
      return { status: "unavailable", error: err instanceof Error ? err.message : String(err) };
    }
  });

  app.get("/api/health", async () => ({
    service: "desopoll-backend",
    version: process.env.APP_VERSION ?? "0.1.0",
    languages: env.languages,
    defaultLanguage: env.DEFAULT_LANGUAGE,
  }));

  // Live-game WebSocket: join / answer / host actions, fanned out via Redis pub/sub.
  registerGameWebsocket(app, realtime);

  return app;
}

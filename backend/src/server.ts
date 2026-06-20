import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import type { Env } from "./env.js";
import { db } from "./db.js";
import { redis } from "./redis.js";
import { type RealtimeTransport, sessionChannel } from "./realtime.js";
import { registerAuthRoutes } from "./auth/routes.js";
import { registerQuizRoutes } from "./routes/quizzes.js";
import { registerAdminRoutes } from "./routes/admin.js";

export async function buildServer(env: Env, realtime: RealtimeTransport): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: env.NODE_ENV === "development" ? "info" : "warn" } });

  await app.register(cors, {
    origin: env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
  });
  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(websocket);

  await registerAuthRoutes(app, env);
  await registerQuizRoutes(app);
  await registerAdminRoutes(app);

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

  // WebSocket entrypoint. A client joins a live session channel; events published by any
  // backend pod (via Redis pub/sub) are fanned out to every connected socket.
  app.get("/ws", { websocket: true }, async (socket, req) => {
    const { session } = (req.query ?? {}) as { session?: string };
    if (!session) {
      socket.send(JSON.stringify({ type: "error", message: "missing session" }));
      socket.close();
      return;
    }
    const channel = sessionChannel(session);
    const unsubscribe = await realtime.subscribe(channel, (event) => {
      socket.send(JSON.stringify(event));
    });

    socket.on("message", (raw: Buffer) => {
      let msg: { type?: string };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === "ping") socket.send(JSON.stringify({ type: "pong" }));
      // Game actions (join/answer/next/...) will be handled here in later iterations.
    });

    socket.on("close", () => {
      void unsubscribe();
    });
  });

  return app;
}

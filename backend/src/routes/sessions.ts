// REST around live sessions. The realtime flow runs over /ws; these endpoints bootstrap it:
// the host creates a session from a quiz, players resolve a PIN to a session id to connect.
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/guard.js";
import { createSession, snapshotFor } from "../game/engine.js";
import { resolvePin } from "../game/store.js";
import { isValidPin } from "../game/pin.js";
import { playersEvent, stateEvent } from "../game/engine.js";

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  // Host: start a live session from one of their quizzes.
  app.post("/api/sessions", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const b = (req.body ?? {}) as { quizId?: string; language?: string };
    if (!b.quizId) return reply.code(400).send({ error: "quizId required" });
    const res = await createSession({ quizId: b.quizId, hostId: user.id, language: b.language });
    if ("error" in res) return reply.code(400).send(res);
    return reply.code(201).send(res);
  });

  // Player: resolve a PIN to a joinable session (only while in the lobby).
  app.get("/api/sessions/by-pin/:pin", async (req, reply) => {
    const { pin } = req.params as { pin: string };
    if (!isValidPin(pin)) return reply.code(400).send({ error: "invalid pin" });
    const sessionId = await resolvePin(pin);
    if (!sessionId) return reply.code(404).send({ error: "no game with this pin" });
    const rt = await snapshotFor(sessionId);
    if (!rt) return reply.code(404).send({ error: "no game with this pin" });
    return {
      sessionId: rt.id,
      title: rt.title,
      state: rt.state,
      joinable: rt.state === "lobby",
    };
  });

  // Host: snapshot of a session they own (lobby view, reconnect).
  app.get("/api/sessions/:id", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const rt = await snapshotFor(id);
    if (!rt) return reply.code(404).send({ error: "session not found" });
    if (rt.hostId !== user.id) return reply.code(403).send({ error: "not the host" });
    return {
      session: { id: rt.id, pin: rt.pin, title: rt.title, ...stateEvent(rt) },
      ...playersEvent(rt),
    };
  });
}

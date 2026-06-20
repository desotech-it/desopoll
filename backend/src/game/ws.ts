// WebSocket entrypoint for live games. Players join by nickname, submit answers; the host
// drives the flow. Events are fanned out via the RealtimeTransport (Redis pub/sub) so any
// pod's sockets receive them. Host actions require the authenticated owner of the session.
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { loadUser } from "../auth/guard.js";
import { type RealtimeTransport, sessionChannel } from "../realtime.js";
import {
  hostAction,
  joinPlayer,
  playersEvent,
  snapshotFor,
  stateEvent,
  submitAnswer,
} from "./engine.js";
import { currentQuestion } from "./runtime.js";
import { publicQuestion, podium, leaderboard, resultsSnapshot } from "./snapshots.js";
import type { AnswerPayload } from "./types.js";
import type { HostAction } from "./state.js";

function send(socket: WebSocket, obj: unknown): void {
  try {
    socket.send(JSON.stringify(obj));
  } catch {
    /* socket closed */
  }
}

// Replay the current state to a socket that just connected.
async function sendSnapshot(socket: WebSocket, sessionId: string): Promise<void> {
  const rt = await snapshotFor(sessionId);
  if (!rt) {
    send(socket, { type: "error", message: "session not found" });
    socket.close();
    return;
  }
  const s = stateEvent(rt);
  send(socket, { type: "hello", title: rt.title, state: s.state, currentIndex: s.currentIndex, total: s.total });
  send(socket, playersEvent(rt));
  const q = currentQuestion(rt);
  if (rt.state === "question_active" && q) {
    send(socket, { type: "question", question: publicQuestion(q, rt.questions.length), serverTime: Date.now() });
  } else if (rt.state === "question_results" && q) {
    send(socket, { type: "results", results: resultsSnapshot(rt, q), personalById: {} });
  } else if (rt.state === "podium") {
    send(socket, { type: "podium", podium: podium(rt.players), leaderboard: leaderboard(rt.players) });
  }
}

export function registerGameWebsocket(app: FastifyInstance, realtime: RealtimeTransport): void {
  app.get("/ws", { websocket: true }, async (socket, req) => {
    const { session } = (req.query ?? {}) as { session?: string };
    if (!session) {
      send(socket, { type: "error", message: "missing session" });
      socket.close();
      return;
    }
    const user = await loadUser(req);
    const channel = sessionChannel(session);
    const unsubscribe = await realtime.subscribe(channel, (event) => send(socket, event));
    await sendSnapshot(socket, session);

    socket.on("message", (raw: Buffer) => {
      void handleMessage(socket, realtime, session, user?.id ?? null, raw.toString());
    });
    socket.on("close", () => {
      void unsubscribe();
    });
  });
}

async function handleMessage(
  socket: WebSocket,
  realtime: RealtimeTransport,
  sessionId: string,
  userId: string | null,
  text: string,
): Promise<void> {
  let msg: { type?: string; nickname?: string; playerId?: string; payload?: AnswerPayload; action?: HostAction };
  try {
    msg = JSON.parse(text);
  } catch {
    return;
  }
  switch (msg.type) {
    case "ping":
      return send(socket, { type: "pong" });
    case "join": {
      const res = await joinPlayer(realtime, sessionId, msg.nickname ?? "");
      return send(socket, "error" in res ? { type: "error", message: res.error } : { type: "joined", playerId: res.playerId });
    }
    case "answer": {
      if (!msg.playerId || !msg.payload) return send(socket, { type: "error", message: "bad answer" });
      const res = await submitAnswer(realtime, sessionId, msg.playerId, msg.payload);
      return send(socket, "error" in res ? { type: "error", message: res.error } : { type: "answer_ack" });
    }
    case "host": {
      if (!userId) return send(socket, { type: "error", message: "not authenticated" });
      if (!msg.action) return send(socket, { type: "error", message: "missing action" });
      const res = await hostAction(realtime, sessionId, userId, msg.action);
      if ("error" in res) return send(socket, { type: "error", message: res.error });
      return;
    }
    default:
      return;
  }
}

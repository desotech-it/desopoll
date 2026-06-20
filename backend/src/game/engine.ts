// Live-game orchestration: builds runtime from a quiz, runs the host-driven state machine,
// grades+scores answers server-side, persists to Postgres, and publishes events over the
// RealtimeTransport. All mutations are serialized per session by an in-process lock.
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { type RealtimeTransport, sessionChannel } from "../realtime.js";
import { grade } from "./grading.js";
import { generatePin } from "./pin.js";
import {
  currentQuestion,
  hasMoreQuestions,
  type RuntimeQuestion,
  type RuntimeSession,
} from "./runtime.js";
import { optionsOf } from "./runtime.js";
import { computePoints } from "./scoring.js";
import { acceptsAnswers, type HostAction, resolveHostAction } from "./state.js";
import { leaderboard, podium, publicQuestion, resultsSnapshot } from "./snapshots.js";
import { clearPin, deleteRuntime, loadRuntime, mapPin, saveRuntime } from "./store.js";
import type { AnswerPayload, PointsMode, QuestionType } from "./types.js";

// ---- Per-session mutex (serializes read-modify-write on the runtime) ----
const chains = new Map<string, Promise<unknown>>();
function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(id) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  chains.set(id, run.catch(() => {}));
  return run;
}

async function publish(realtime: RealtimeTransport, rt: RuntimeSession, event: unknown): Promise<void> {
  await realtime.publish(sessionChannel(rt.id), event);
}

export function stateEvent(rt: RuntimeSession) {
  return { type: "state", state: rt.state, currentIndex: rt.currentIndex, total: rt.questions.length };
}

export function playersEvent(rt: RuntimeSession) {
  const players = Object.values(rt.players).map((p) => ({ id: p.id, nickname: p.nickname, score: p.score }));
  return { type: "players", players, count: players.length };
}

// ---- Create ----
interface QuestionRow {
  id: string;
  type: QuestionType;
  prompt: string;
  image: unknown | null;
  time_limit_sec: number;
  points_mode: PointsMode;
  speed_bonus: boolean;
  answer_spec: unknown;
}

function toRuntimeQuestion(row: QuestionRow, index: number): RuntimeQuestion {
  const spec = (row.answer_spec ?? {}) as never;
  return {
    id: row.id,
    index,
    type: row.type,
    prompt: row.prompt,
    image: row.image ?? null,
    timeLimitSec: row.time_limit_sec,
    pointsMode: row.points_mode,
    speedBonus: row.speed_bonus,
    answerSpec: spec,
    options: optionsOf(spec),
  };
}

export async function createSession(
  opts: { quizId: string; hostId: string; language?: string },
): Promise<{ id: string; pin: string } | { error: string }> {
  const { rows: quizRows } = await db().query(
    `SELECT id, title, base_language FROM quizzes WHERE id = $1 AND owner_id = $2`,
    [opts.quizId, opts.hostId],
  );
  const quiz = quizRows[0];
  if (!quiz) return { error: "quiz not found" };

  const { rows: qRows } = await db().query<QuestionRow>(
    `SELECT id, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec
     FROM questions WHERE quiz_id = $1 ORDER BY position`,
    [opts.quizId],
  );
  if (qRows.length === 0) return { error: "quiz has no questions" };

  const language = opts.language || quiz.base_language || "it";

  // Insert the durable row, retrying on the rare active-pin collision.
  let sessionId = "";
  let pin = "";
  for (let attempt = 0; attempt < 6 && !sessionId; attempt++) {
    pin = generatePin();
    try {
      const { rows } = await db().query(
        `INSERT INTO game_sessions (quiz_id, host_id, pin, language, state)
         VALUES ($1, $2, $3, $4, 'lobby') RETURNING id`,
        [opts.quizId, opts.hostId, pin, language],
      );
      sessionId = rows[0].id;
    } catch (err) {
      if (!(err instanceof Error && /duplicate key/.test(err.message))) throw err;
    }
  }
  if (!sessionId) return { error: "could not allocate a pin" };

  const rt: RuntimeSession = {
    id: sessionId,
    quizId: opts.quizId,
    hostId: opts.hostId,
    pin,
    language,
    title: quiz.title,
    state: "lobby",
    currentIndex: -1,
    questionStartedAt: null,
    questions: qRows.map(toRuntimeQuestion),
    players: {},
    answers: {},
  };
  await saveRuntime(rt);
  await mapPin(pin, sessionId);
  return { id: sessionId, pin };
}

// ---- Join ----
export async function joinPlayer(
  realtime: RealtimeTransport,
  sessionId: string,
  nickname: string,
): Promise<{ playerId: string } | { error: string }> {
  const name = nickname.trim().slice(0, 24);
  if (!name) return { error: "nickname required" };
  return withLock(sessionId, async () => {
    const rt = await loadRuntime(sessionId);
    if (!rt) return { error: "session not found" };
    if (rt.state !== "lobby") return { error: "game already started" };
    const taken = Object.values(rt.players).some((p) => p.nickname.toLowerCase() === name.toLowerCase());
    if (taken) return { error: "nickname already taken" };

    let playerId: string;
    try {
      const { rows } = await db().query(
        `INSERT INTO session_players (session_id, nickname, language) VALUES ($1, $2, $3) RETURNING id`,
        [sessionId, name, rt.language],
      );
      playerId = rows[0].id;
    } catch {
      playerId = randomUUID(); // durable insert failed (e.g. race) — keep the game going
    }
    rt.players[playerId] = { id: playerId, nickname: name, score: 0 };
    await saveRuntime(rt);
    await publish(realtime, rt, playersEvent(rt));
    return { playerId };
  });
}

// ---- Answer ----
export async function submitAnswer(
  realtime: RealtimeTransport,
  sessionId: string,
  playerId: string,
  payload: AnswerPayload,
): Promise<{ ok: true } | { error: string }> {
  return withLock(sessionId, async () => {
    const rt = await loadRuntime(sessionId);
    if (!rt) return { error: "session not found" };
    if (!acceptsAnswers(rt.state)) return { error: "not accepting answers" };
    const q = currentQuestion(rt);
    if (!q) return { error: "no active question" };
    const player = rt.players[playerId];
    if (!player) return { error: "unknown player" };

    const bucket = (rt.answers[q.index] ??= {});
    if (bucket[playerId]) return { ok: true }; // first answer wins, ignore the rest

    const elapsed = rt.questionStartedAt ? Date.now() - rt.questionStartedAt : 0;
    const responseTimeMs = Math.max(0, Math.min(elapsed, q.timeLimitSec * 1000));
    const { correct, partial } = grade(q.type, q.answerSpec, payload);
    const points = computePoints({
      partial,
      responseTimeMs,
      timeLimitSec: q.timeLimitSec,
      pointsMode: q.pointsMode,
      speedBonus: q.speedBonus,
    });

    bucket[playerId] = { playerId, correct, partial, points, responseTimeMs, payload };
    player.score += points;
    await saveRuntime(rt);

    await db()
      .query(
        `INSERT INTO answers (session_id, question_id, player_id, payload, response_time_ms, is_correct, partial_score, points_awarded)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (session_id, question_id, player_id) DO NOTHING`,
        [sessionId, q.id, playerId, JSON.stringify(payload), responseTimeMs, correct, partial, points],
      )
      .catch(() => {});
    await db()
      .query(`UPDATE session_players SET score = score + $2 WHERE id = $1`, [playerId, points])
      .catch(() => {});

    await publish(realtime, rt, { type: "answered", count: Object.keys(bucket).length, total: Object.keys(rt.players).length });
    return { ok: true };
  });
}

// ---- Host actions ----
export async function hostAction(
  realtime: RealtimeTransport,
  sessionId: string,
  hostId: string,
  action: HostAction,
): Promise<{ ok: true } | { error: string }> {
  return withLock(sessionId, async () => {
    const rt = await loadRuntime(sessionId);
    if (!rt) return { error: "session not found" };
    if (rt.hostId !== hostId) return { error: "not the host" };
    const next = resolveHostAction(rt.state, action, hasMoreQuestions(rt));
    if (!next) return { error: `cannot ${action} from ${rt.state}` };

    if (next === "question_active") {
      rt.currentIndex = action === "start" ? 0 : rt.currentIndex + 1;
      rt.questionStartedAt = Date.now();
      rt.state = next;
      await persistState(rt);
      await saveRuntime(rt);
      const q = currentQuestion(rt)!;
      await publish(realtime, rt, { type: "question", question: publicQuestion(q, rt.questions.length), serverTime: Date.now() });
      await publish(realtime, rt, stateEvent(rt));
    } else if (next === "question_results") {
      rt.state = next;
      await persistState(rt);
      await saveRuntime(rt);
      const q = currentQuestion(rt)!;
      const results = resultsSnapshot(rt, q);
      const personalById: Record<string, { correct: boolean; points: number }> = {};
      for (const [pid, a] of Object.entries(rt.answers[q.index] ?? {})) {
        personalById[pid] = { correct: a.correct, points: a.points };
      }
      await publish(realtime, rt, { type: "results", results, personalById });
      await publish(realtime, rt, stateEvent(rt));
    } else if (next === "podium") {
      rt.state = next;
      await persistState(rt);
      await saveRuntime(rt);
      await publish(realtime, rt, { type: "podium", podium: podium(rt.players), leaderboard: leaderboard(rt.players) });
      await publish(realtime, rt, stateEvent(rt));
    } else if (next === "ended" || next === "aborted") {
      rt.state = next;
      await persistState(rt);
      await publish(realtime, rt, { type: next, leaderboard: leaderboard(rt.players) });
      await publish(realtime, rt, stateEvent(rt));
      await clearPin(rt.pin);
      await deleteRuntime(rt.id);
    }
    return { ok: true };
  });
}

async function persistState(rt: RuntimeSession): Promise<void> {
  const started = rt.state === "question_active" && rt.currentIndex === 0;
  const ended = rt.state === "ended" || rt.state === "aborted";
  await db()
    .query(
      `UPDATE game_sessions SET state = $2, current_question = $3,
         started_at = COALESCE(started_at, CASE WHEN $4 THEN now() END),
         ended_at = CASE WHEN $5 THEN now() ELSE ended_at END
       WHERE id = $1`,
      [rt.id, rt.state, rt.currentIndex, started, ended],
    )
    .catch(() => {});
}

// Snapshot for a socket that just connected (or the host opening the console).
export async function snapshotFor(sessionId: string): Promise<RuntimeSession | null> {
  return loadRuntime(sessionId);
}

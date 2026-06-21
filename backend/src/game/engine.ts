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
import { optionsOf, shuffledItemsOf, sliderRangeOf } from "./runtime.js";
import { computePoints } from "./scoring.js";
import { acceptsAnswers, type HostAction, resolveHostAction } from "./state.js";
import { leaderboard, podium, publicQuestion, resultsSnapshot } from "./snapshots.js";
import { clearPin, loadRuntime, mapPin, saveRuntime } from "./store.js";
import type { AnswerPayload, PointsMode, QuestionType } from "./types.js";
import { getQuizAccess } from "../routes/quiz-access.js";
import { can } from "../auth/permissions.js";
import {
  buildTranslationMap,
  translateQuestions,
  translateTitle,
  type TranslationRow,
} from "./translate.js";

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
  const q: RuntimeQuestion = {
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
  // ordering: shuffle the items ONCE at build time and store the presentation order on the
  // runtime question, so it stays stable across reconnects/late joiners and never equals
  // correctOrder. publicQuestion reads q.items.
  if (row.type === "ordering") {
    q.items = shuffledItemsOf(spec);
  }
  // slider: carry the player-facing scale (min/max/step), not the correct answer/tolerance.
  if (row.type === "slider") {
    const range = sliderRangeOf(spec);
    q.min = range.min;
    q.max = range.max;
    q.step = range.step;
  }
  return q;
}

// Load the content_translations rows for a single language across the quiz, its questions and
// their options, in one round-trip. Option ids live inside questions.answer_spec.options[].id
// (or .items[].id for ordering), so we resolve them from the question rows we already loaded.
async function loadTranslations(
  quizId: string,
  questionRows: ReadonlyArray<QuestionRow>,
  language: string,
): Promise<TranslationRow[]> {
  const optionIds = new Set<string>();
  for (const q of questionRows) {
    const spec = (q.answer_spec ?? {}) as Record<string, unknown>;
    for (const key of ["options", "items"]) {
      const arr = spec[key];
      if (Array.isArray(arr)) {
        for (const o of arr) {
          if (o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string") {
            optionIds.add((o as { id: string }).id);
          }
        }
      }
    }
  }
  const questionIds = questionRows.map((q) => q.id);
  const { rows } = await db().query<TranslationRow>(
    `SELECT entity_type, entity_id, field, value
       FROM content_translations
      WHERE lang = $1
        AND (
          (entity_type = 'quiz'     AND entity_id = $2)
          OR (entity_type = 'question' AND entity_id = ANY($3::uuid[]))
          OR (entity_type = 'option'   AND entity_id = ANY($4::uuid[]))
        )`,
    [language, quizId, questionIds, Array.from(optionIds)],
  );
  return rows;
}

export async function createSession(
  opts: { quizId: string; hostId: string; language?: string },
): Promise<{ id: string; pin: string } | { error: string }> {
  // Hosting a live session requires >=play permission (owner, or shared at play/edit/manage).
  const { quiz, permission } = await getQuizAccess(opts.quizId, opts.hostId);
  if (!quiz) return { error: "quiz not found" };
  if (!can(permission, "play")) return { error: "quiz not found" };

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

  // Build base runtime questions, then overlay content translations when the session language
  // differs from the quiz base language. Per-string fallback keeps any untranslated string in
  // the base language. When language === base, this is a no-op (identical behaviour).
  let title = quiz.title;
  let questions = qRows.map(toRuntimeQuestion);
  if (language !== quiz.base_language) {
    const rows = await loadTranslations(opts.quizId, qRows, language);
    if (rows.length > 0) {
      const map = buildTranslationMap(rows);
      title = translateTitle(map, opts.quizId, quiz.title);
      questions = translateQuestions(map, questions);
    }
  }

  const rt: RuntimeSession = {
    id: sessionId,
    quizId: opts.quizId,
    hostId: opts.hostId,
    pin,
    language,
    title,
    state: "lobby",
    currentIndex: -1,
    questionStartedAt: null,
    questions,
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

// Durable persistence for one accepted answer. Computed under the lock, then run AFTER
// the lock releases so the answer INSERT + score UPDATE never serialize behind the next
// host action or another player's answer. Fire-and-forget: failures don't affect play,
// the authoritative live state already lives in the Redis runtime.
interface AnswerWrite {
  sessionId: string;
  questionId: string;
  playerId: string;
  payload: AnswerPayload;
  responseTimeMs: number;
  correct: boolean;
  partial: number;
  points: number;
}

function persistAnswer(w: AnswerWrite): void {
  // ON CONFLICT DO NOTHING keeps first-answer-wins durable even on a retry; we never
  // re-credit the score because the in-memory bucket guard already rejected duplicates.
  db()
    .query(
      `INSERT INTO answers (session_id, question_id, player_id, payload, response_time_ms, is_correct, partial_score, points_awarded)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (session_id, question_id, player_id) DO NOTHING`,
      [w.sessionId, w.questionId, w.playerId, JSON.stringify(w.payload), w.responseTimeMs, w.correct, w.partial, w.points],
    )
    .catch(() => {});
  db()
    .query(`UPDATE session_players SET score = score + $2 WHERE id = $1`, [w.playerId, w.points])
    .catch(() => {});
}

// ---- Answer ----
export async function submitAnswer(
  realtime: RealtimeTransport,
  sessionId: string,
  playerId: string,
  payload: AnswerPayload,
): Promise<{ ok: true } | { error: string }> {
  // Inside the lock we do ONLY the consistency-critical read-modify-write: grade, update
  // the in-memory bucket+score, persist the Redis runtime, and publish 'answered'. The
  // durable Postgres writes are returned and fired AFTER the lock so a flood of answers
  // can't push a host's next/lock to the back of the persistence queue.
  const res = await withLock(sessionId, async (): Promise<
    { ok: true; write?: AnswerWrite } | { error: string }
  > => {
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
    await publish(realtime, rt, {
      type: "answered",
      count: Object.keys(bucket).length,
      total: Object.keys(rt.players).length,
    });
    return { ok: true, write: { sessionId, questionId: q.id, playerId, payload, responseTimeMs, correct, partial, points } };
  });

  if ("ok" in res && res.write) persistAnswer(res.write); // off the lock's critical path
  return "ok" in res ? { ok: true } : res;
}

// ---- Host actions ----
export async function hostAction(
  realtime: RealtimeTransport,
  sessionId: string,
  hostId: string,
  action: HostAction,
): Promise<{ ok: true } | { error: string }> {
  // Critical path under the lock: validate, mutate the in-memory runtime, save the Redis
  // runtime (so other pods/late joiners are consistent), then publish the gameplay event
  // FIRST so players are unblocked immediately. The durable Postgres UPDATE (persistState)
  // is deferred and fired AFTER the lock so a question/results/podium transition doesn't
  // wait on a DB round-trip and doesn't keep the lock held while it runs.
  const res = await withLock(sessionId, async (): Promise<
    { ok: true; persist: StateWrite; teardownPin?: string } | { error: string }
  > => {
    const rt = await loadRuntime(sessionId);
    if (!rt) return { error: "session not found" };
    if (rt.hostId !== hostId) return { error: "not the host" };
    const next = resolveHostAction(rt.state, action, hasMoreQuestions(rt));
    if (!next) return { error: `cannot ${action} from ${rt.state}` };

    if (next === "question_active") {
      rt.currentIndex = action === "start" ? 0 : rt.currentIndex + 1;
      rt.questionStartedAt = Date.now();
      rt.state = next;
      await saveRuntime(rt);
      const q = currentQuestion(rt)!;
      await publish(realtime, rt, { type: "question", question: publicQuestion(q, rt.questions.length), serverTime: Date.now() });
      await publish(realtime, rt, stateEvent(rt));
      return { ok: true, persist: stateWrite(rt) };
    }
    if (next === "question_results") {
      rt.state = next;
      await saveRuntime(rt);
      const q = currentQuestion(rt)!;
      const results = resultsSnapshot(rt, q);
      const personalById: Record<string, { correct: boolean; points: number }> = {};
      for (const [pid, a] of Object.entries(rt.answers[q.index] ?? {})) {
        personalById[pid] = { correct: a.correct, points: a.points };
      }
      await publish(realtime, rt, { type: "results", results, personalById });
      await publish(realtime, rt, stateEvent(rt));
      return { ok: true, persist: stateWrite(rt) };
    }
    if (next === "podium") {
      rt.state = next;
      await saveRuntime(rt);
      await publish(realtime, rt, { type: "podium", podium: podium(rt.players), leaderboard: leaderboard(rt.players) });
      await publish(realtime, rt, stateEvent(rt));
      return { ok: true, persist: stateWrite(rt) };
    }
    // ended | aborted: KEEP the runtime in Redis (it has a TTL) and save the terminal state,
    // so post-game reconnects / late snapshots return the final standings instead of
    // "session not found". Only the active PIN is released afterwards (so it can be reused).
    rt.state = next;
    await saveRuntime(rt);
    await publish(realtime, rt, { type: next, leaderboard: leaderboard(rt.players) });
    await publish(realtime, rt, stateEvent(rt));
    return { ok: true, persist: stateWrite(rt), teardownPin: rt.pin };
  });

  if ("error" in res) return res;
  // Off the lock's critical path: durable Postgres state + pin cleanup, fire-and-forget.
  persistState(res.persist);
  if (res.teardownPin) void clearPin(res.teardownPin).catch(() => {});
  return { ok: true };
}

// Durable game_sessions snapshot, captured under the lock and written afterwards so the
// transition's Postgres round-trip stays off the lock's critical path.
interface StateWrite {
  id: string;
  state: string;
  currentIndex: number;
  started: boolean;
  ended: boolean;
}

function stateWrite(rt: RuntimeSession): StateWrite {
  return {
    id: rt.id,
    state: rt.state,
    currentIndex: rt.currentIndex,
    started: rt.state === "question_active" && rt.currentIndex === 0,
    ended: rt.state === "ended" || rt.state === "aborted",
  };
}

function persistState(w: StateWrite): void {
  db()
    .query(
      `UPDATE game_sessions SET state = $2, current_question = $3,
         started_at = COALESCE(started_at, CASE WHEN $4 THEN now() END),
         ended_at = CASE WHEN $5 THEN now() ELSE ended_at END
       WHERE id = $1`,
      [w.id, w.state, w.currentIndex, w.started, w.ended],
    )
    .catch(() => {});
}

// Snapshot for a socket that just connected (or the host opening the console).
export async function snapshotFor(sessionId: string): Promise<RuntimeSession | null> {
  return loadRuntime(sessionId);
}

// Pure aggregation for the post-game report. Kept free of DB/Fastify so the math can be
// unit-tested in isolation. Inputs are plain rows read from Postgres (questions, answers,
// session_players); outputs are the per-question stats + final standings the report returns.
//
// Distribution reuses the live-game `distribution()` builder (via a RuntimeQuestion shim)
// so the report's per-option/value/word breakdown stays byte-for-byte in sync with what
// players saw on the in-game results screen.
import { distribution, type DistributionBucket } from "../game/snapshots.js";
import { optionsOf } from "../game/runtime.js";
import type { RuntimeAnswer, RuntimeQuestion } from "../game/runtime.js";
import type { AnswerSpec, QuestionType } from "../game/types.js";

// One durable question row (joined from `questions` via the session's quiz).
export interface ReportQuestionRow {
  id: string;
  position: number;
  type: QuestionType;
  prompt: string;
  answer_spec: unknown;
}

// One durable answer row (from `answers`).
export interface ReportAnswerRow {
  question_id: string;
  player_id: string;
  payload: unknown;
  is_correct: boolean | null;
  points_awarded: number;
}

// One durable player row (from `session_players`).
export interface ReportPlayerRow {
  id: string;
  nickname: string;
  score: number;
}

export interface QuestionStat {
  questionId: string;
  prompt: string;
  type: QuestionType;
  answeredCount: number;
  correctCount: number;
  correctPct: number; // 0..100, rounded; 0 when nobody answered
  distribution: DistributionBucket[];
}

export interface StandingRow {
  nickname: string;
  score: number;
  rank: number;
}

export interface ReportAggregate {
  questions: QuestionStat[];
  standings: StandingRow[];
}

// Build a minimal RuntimeQuestion shim so we can delegate to the shared distribution()
// builder. Only the fields distribution() reads (type, options, answerSpec) matter.
function toRuntimeShim(row: ReportQuestionRow): RuntimeQuestion {
  const spec = (row.answer_spec ?? {}) as AnswerSpec;
  return {
    id: row.id,
    index: row.position,
    type: row.type,
    prompt: row.prompt,
    image: null,
    timeLimitSec: 0,
    pointsMode: "none",
    speedBonus: false,
    answerSpec: spec,
    options: optionsOf(spec),
  };
}

// Adapt a durable answer row to the RuntimeAnswer shape distribution() expects. Only
// `payload` is consulted by distribution(); the rest are filled with neutral values.
function toRuntimeAnswer(row: ReportAnswerRow): RuntimeAnswer {
  return {
    playerId: row.player_id,
    correct: row.is_correct === true,
    partial: row.is_correct === true ? 1 : 0,
    points: row.points_awarded,
    responseTimeMs: 0,
    payload: row.payload,
  };
}

// Final standings: sort by score desc, ties broken by nickname (matches the live
// leaderboard ordering), then assign sequential 1..n ranks.
export function buildStandings(players: ReportPlayerRow[]): StandingRow[] {
  return players
    .slice()
    .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))
    .map((p, i) => ({ nickname: p.nickname, score: p.score, rank: i + 1 }));
}

// Per-question stats: answered/correct counts, correct percentage, and the answer
// distribution. Questions are returned in their quiz position order.
export function buildQuestionStats(
  questions: ReportQuestionRow[],
  answers: ReportAnswerRow[],
): QuestionStat[] {
  const byQuestion = new Map<string, ReportAnswerRow[]>();
  for (const a of answers) {
    const list = byQuestion.get(a.question_id);
    if (list) list.push(a);
    else byQuestion.set(a.question_id, [a]);
  }

  return questions
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((qrow) => {
      const rows = byQuestion.get(qrow.id) ?? [];
      const answeredCount = rows.length;
      const correctCount = rows.reduce((n, r) => n + (r.is_correct === true ? 1 : 0), 0);
      const correctPct = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);

      const shim = toRuntimeShim(qrow);
      const answerMap: Record<string, RuntimeAnswer> = {};
      for (const r of rows) answerMap[r.player_id] = toRuntimeAnswer(r);

      return {
        questionId: qrow.id,
        prompt: qrow.prompt,
        type: qrow.type,
        answeredCount,
        correctCount,
        correctPct,
        distribution: distribution(shim, answerMap),
      };
    });
}

// Assemble the full report payload from the three durable row sets.
export function buildReport(
  questions: ReportQuestionRow[],
  answers: ReportAnswerRow[],
  players: ReportPlayerRow[],
): ReportAggregate {
  return {
    questions: buildQuestionStats(questions, answers),
    standings: buildStandings(players),
  };
}

// Runtime (volatile) shape of a live session, kept in Redis. Durable rows live in
// Postgres (game_sessions/session_players/answers); this is the fast in-game mirror.
import type { AnswerSpec, GameState, Option, PointsMode, QuestionType } from "./types.js";

export interface RuntimeQuestion {
  id: string;
  index: number; // 0-based position in the run
  type: QuestionType;
  prompt: string;
  image: unknown | null;
  timeLimitSec: number;
  pointsMode: PointsMode;
  speedBonus: boolean;
  answerSpec: AnswerSpec;
  options: Option[]; // public options (no correctness), empty for open_text/true_false
}

export interface RuntimePlayer {
  id: string;
  nickname: string;
  score: number;
}

export interface RuntimeAnswer {
  playerId: string;
  correct: boolean;
  partial: number;
  points: number;
  responseTimeMs: number;
  payload: unknown;
}

export interface RuntimeSession {
  id: string;
  quizId: string;
  hostId: string;
  pin: string;
  language: string;
  title: string;
  state: GameState;
  currentIndex: number; // -1 while in the lobby
  questionStartedAt: number | null; // epoch ms when the current question went active
  questions: RuntimeQuestion[];
  players: Record<string, RuntimePlayer>;
  answers: Record<number, Record<string, RuntimeAnswer>>; // [questionIndex][playerId]
}

// Derive the public options list from an answer_spec (used to build RuntimeQuestion).
export function optionsOf(spec: AnswerSpec): Option[] {
  if (spec && typeof spec === "object" && "options" in spec && Array.isArray((spec as { options?: unknown }).options)) {
    return (spec as { options: Option[] }).options.map((o) => ({ id: o.id, text: o.text }));
  }
  return [];
}

export function currentQuestion(rt: RuntimeSession): RuntimeQuestion | null {
  return rt.questions[rt.currentIndex] ?? null;
}

export function hasMoreQuestions(rt: RuntimeSession): boolean {
  return rt.currentIndex < rt.questions.length - 1;
}

export function emptyAnswers(rt: RuntimeSession, index: number): Record<string, RuntimeAnswer> {
  return rt.answers[index] ?? {};
}

export const INITIAL_STATE: GameState = "lobby";

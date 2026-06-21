// Shared types for the live game (WebSocket protocol + reduced client state).
// Mirrors the backend contract. Kept dependency-free so the reducer is pure
// and unit-testable.
import type { QuestionType } from "../api";

// ---- Game states (server-authoritative) ----
export type GameState =
  | "lobby"
  | "question_active"
  | "question_results"
  | "scoreboard"
  | "podium"
  | "ended"
  | "aborted";

// ---- Sub-shapes ----
export interface Player {
  id: string;
  nickname: string;
  score: number;
}

export interface LiveOption {
  id: string;
  text: string;
}

// A question as broadcast to clients (NO correct answers — anti-cheat).
// `options` carries the choosable items for choice/poll. `items` carries the
// ordering elements to arrange, in the server-SHUFFLED presentation order (never
// the correctOrder). Slider bounds (min/max/step) are optional extras the player
// control reads when present.
export interface LiveQuestion {
  index: number;
  total: number;
  type: QuestionType;
  prompt: string;
  image?: string | null;
  timeLimitSec: number;
  options: LiveOption[];
  // ordering: shuffled items to reorder (present only for ordering questions).
  items?: LiveOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface DistributionEntry {
  key: string;
  label: string;
  count: number;
}

export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
}

export interface QuestionResults {
  index: number;
  correctOptionIds: string[];
  correctBoolean?: boolean;
  // ordering: the correct sequence (item ids in order) so the host can reveal it
  // on the results screen. Present only for ordering questions.
  correctOrder?: string[];
  distribution: DistributionEntry[];
  answeredCount: number;
  leaderboard: LeaderboardEntry[];
}

export interface PersonalResult {
  correct: boolean;
  points: number;
}

export interface PodiumEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
}

// ---- Server → client events ----
export type ServerEvent =
  | { type: "hello"; title: string; state: GameState; currentIndex: number; total: number }
  | { type: "players"; players: Player[]; count: number }
  | { type: "question"; question: LiveQuestion; serverTime: number }
  | { type: "answered"; count: number; total: number }
  | {
      type: "results";
      results: QuestionResults;
      personalById: Record<string, PersonalResult>;
    }
  | { type: "podium"; podium: PodiumEntry[]; leaderboard: LeaderboardEntry[] }
  | { type: "ended"; leaderboard: LeaderboardEntry[] }
  | { type: "aborted"; leaderboard: LeaderboardEntry[] }
  | { type: "state"; state: GameState; currentIndex: number; total: number }
  | { type: "joined"; playerId: string }
  | { type: "error"; message: string }
  | { type: "answer_ack" }
  | { type: "pong" }
  // Synthetic transport events injected by the socket helper:
  | { type: "open" }
  | { type: "close" };

// ---- Client → server messages ----
export type AnswerPayload =
  | { optionId: string } // single_choice / poll
  | { optionIds: string[] } // multiple_choice
  | { value: boolean } // true_false
  | { text: string } // open_text / word_cloud
  | { value: number } // numeric / slider
  | { order: string[] }; // ordering

export type ClientMessage =
  | { type: "join"; nickname: string }
  | { type: "answer"; playerId: string; payload: AnswerPayload }
  | { type: "host"; action: "start" | "lock" | "next" | "end" | "abort" }
  | { type: "ping" };

// ---- Reduced client game state ----
export interface GameSnapshot {
  connected: boolean;
  title: string;
  state: GameState;
  currentIndex: number;
  total: number;
  players: Player[];
  playerCount: number;
  question: LiveQuestion | null;
  // ms epoch when the active question started on the server (for the countdown).
  questionServerTime: number | null;
  answeredCount: number;
  answeredTotal: number;
  results: QuestionResults | null;
  personalById: Record<string, PersonalResult>;
  podium: PodiumEntry[];
  // Final/leaderboard, kept around for results/podium/ended screens.
  leaderboard: LeaderboardEntry[];
  // playerId returned to THIS socket after a successful join.
  myPlayerId: string | null;
  error: string | null;
}

export const initialSnapshot: GameSnapshot = {
  connected: false,
  title: "",
  state: "lobby",
  currentIndex: 0,
  total: 0,
  players: [],
  playerCount: 0,
  question: null,
  questionServerTime: null,
  answeredCount: 0,
  answeredTotal: 0,
  results: null,
  personalById: {},
  podium: [],
  leaderboard: [],
  myPlayerId: null,
  error: null,
};

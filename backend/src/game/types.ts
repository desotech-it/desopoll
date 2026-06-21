// Shared domain types for the live game engine. Pure types only (no runtime deps), so
// scoring/grading/state modules and their tests can import without pulling in db/redis.

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "open_text"
  | "numeric"
  | "slider"
  | "ordering"
  | "poll"
  | "word_cloud";

export type PointsMode = "standard" | "double" | "none";

export interface Option {
  id: string;
  text: string;
}

// answer_spec shapes by question type (mirrors the editor / frontend api.ts).
export type AnswerSpec =
  | { options: Option[]; correct: string[] } // single_choice / multiple_choice
  | { options: Option[] } // poll
  | { correct: boolean } // true_false
  | { accepted: string[]; caseSensitive?: boolean } // open_text
  | { answer: number; tolerance?: number } // numeric
  | { min: number; max: number; step?: number; answer: number; tolerance?: number } // slider
  | { items: Option[]; correctOrder: string[] } // ordering
  | Record<string, never>; // word_cloud (survey, free text, no scoring)

// What a player submits, per type.
export type AnswerPayload =
  | { optionId: string } // single_choice
  | { optionIds: string[] } // multiple_choice / poll
  | { value: boolean } // true_false
  | { value: number } // numeric / slider
  | { order: string[] } // ordering
  | { text: string }; // open_text / word_cloud

export interface GradeResult {
  // Fully correct for leaderboard "right/wrong" display.
  correct: boolean;
  // 0..1 — supports partial credit (e.g. multiple_choice). 1 = fully correct.
  partial: number;
}

// The 8 live-game states the engine actually drives (subset of the DB enum).
export type GameState =
  | "lobby"
  | "question_active"
  | "question_results"
  | "scoreboard"
  | "podium"
  | "ended"
  | "aborted";

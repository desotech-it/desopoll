// PURE scoring model helpers — mirror the server-authoritative rules so the
// editor can EXPLAIN scoring accurately without recomputing it. No DOM, no I/O
// → unit-tested in scoring.test.ts. The backend remains the source of truth;
// these constants/labels must stay in sync with it (see issue #8).
import type { PointsMode, QuestionType } from "./api";

// Base points awarded for a fully-correct answer, per points_mode. These MUST
// match the backend (standard 1000, double 2000, none 0).
export const BASE_POINTS: Record<PointsMode, number> = {
  standard: 1000,
  double: 2000,
  none: 0,
};

// Speed-bonus envelope: a correct INSTANT answer keeps 100% of base; a correct
// answer at time-up keeps SPEED_FLOOR (50%). Linear in between:
//   factor = 1 - (responseTime / timeLimit) / 2
export const SPEED_MAX_PCT = 100;
export const SPEED_FLOOR_PCT = 50;

// Survey question types are never scored (poll, word_cloud). Kept here (rather
// than only in reportFormat) so the editor and the report agree on one rule.
const SURVEY_TYPES: ReadonlySet<QuestionType> = new Set(["poll", "word_cloud"]);

export function isSurveyType(type: QuestionType): boolean {
  return SURVEY_TYPES.has(type);
}

// Base points for a question as configured. Survey types and points_mode
// "none" both yield 0 (no scoring).
export function basePoints(type: QuestionType, mode: PointsMode): number {
  if (isSurveyType(type)) return 0;
  return BASE_POINTS[mode];
}

// Question types that can earn PARTIAL credit (a fraction of base) rather than
// all-or-nothing. multiple_choice = fraction of correct options; ordering =
// fraction of items in the right position; numeric/slider = tolerance band.
const PARTIAL_CREDIT_TYPES: ReadonlySet<QuestionType> = new Set([
  "multiple_choice",
  "ordering",
  "numeric",
  "slider",
]);

export function supportsPartialCredit(type: QuestionType): boolean {
  return PARTIAL_CREDIT_TYPES.has(type);
}

// Whether the speed-bonus toggle has any EFFECT for this question. It is inert
// for survey types and when points_mode is "none" (base = 0).
export function speedBonusApplies(type: QuestionType, mode: PointsMode): boolean {
  return !isSurveyType(type) && mode !== "none";
}

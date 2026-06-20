// Pure answer grading per question type. Returns correctness + a 0..1 partial score.
// Defensive: tolerates malformed specs/payloads by grading them as incorrect.
import type { AnswerPayload, AnswerSpec, GradeResult, QuestionType } from "./types.js";

const WRONG: GradeResult = { correct: false, partial: 0 };
const RIGHT: GradeResult = { correct: true, partial: 1 };

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function gradeSingle(spec: AnswerSpec, payload: AnswerPayload): GradeResult {
  const correct = asArray<string>((spec as { correct?: unknown }).correct);
  const chosen = (payload as { optionId?: string }).optionId;
  if (!chosen || correct.length === 0) return WRONG;
  return correct.includes(chosen) ? RIGHT : WRONG;
}

// Partial credit: (#correctly-selected − #wrongly-selected) / #correct, clamped to [0,1].
// `correct` is true only when the chosen set equals the correct set exactly.
function gradeMultiple(spec: AnswerSpec, payload: AnswerPayload): GradeResult {
  const correct = new Set(asArray<string>((spec as { correct?: unknown }).correct));
  const chosen = new Set(asArray<string>((payload as { optionIds?: unknown }).optionIds));
  if (correct.size === 0) return WRONG;
  let hit = 0;
  let miss = 0;
  for (const id of chosen) (correct.has(id) ? (hit++) : (miss++));
  const partial = Math.min(Math.max((hit - miss) / correct.size, 0), 1);
  const exact = chosen.size === correct.size && hit === correct.size && miss === 0;
  return { correct: exact, partial: exact ? 1 : partial };
}

function gradeTrueFalse(spec: AnswerSpec, payload: AnswerPayload): GradeResult {
  const expected = (spec as { correct?: unknown }).correct;
  const value = (payload as { value?: unknown }).value;
  if (typeof expected !== "boolean" || typeof value !== "boolean") return WRONG;
  return value === expected ? RIGHT : WRONG;
}

function gradeOpenText(spec: AnswerSpec, payload: AnswerPayload): GradeResult {
  const accepted = asArray<string>((spec as { accepted?: unknown }).accepted);
  const caseSensitive = Boolean((spec as { caseSensitive?: unknown }).caseSensitive);
  const text = (payload as { text?: unknown }).text;
  if (typeof text !== "string" || accepted.length === 0) return WRONG;
  const norm = (s: string) => (caseSensitive ? s.trim() : s.trim().toLocaleLowerCase());
  const target = norm(text);
  return accepted.some((a) => norm(a) === target) ? RIGHT : WRONG;
}

export function grade(type: QuestionType, spec: AnswerSpec, payload: AnswerPayload): GradeResult {
  switch (type) {
    case "single_choice":
      return gradeSingle(spec, payload);
    case "multiple_choice":
      return gradeMultiple(spec, payload);
    case "true_false":
      return gradeTrueFalse(spec, payload);
    case "open_text":
      return gradeOpenText(spec, payload);
    case "poll":
      // Surveys have no correct answer and never score.
      return WRONG;
    default:
      return WRONG;
  }
}

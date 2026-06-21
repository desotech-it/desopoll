// Pure content-translation merge for game time. No I/O: callers load the
// content_translations rows for the session language and hand them here as a flat list,
// then this module overlays them onto the base RuntimeQuestion(s) and quiz title.
//
// Per-STRING fallback: a translated value is used only when present and non-blank for that
// exact (entity_type, entity_id, field); otherwise the base string is kept. This means a
// session can show e.g. a translated prompt while an untranslated option stays in the base
// language — the unit of fallback is the individual string, never the whole question.
import type { RuntimeQuestion } from "./runtime.js";

export type TranslatableEntity = "quiz" | "question" | "option";

// One content_translations row, narrowed to the fields this merge cares about. Extra columns
// (id, lang) are ignored — the lang is assumed to already match the target session language.
export interface TranslationRow {
  entity_type: TranslatableEntity;
  entity_id: string;
  field: string;
  value: string;
}

// Compact lookup: key is `${entity_type}:${entity_id}:${field}` → value. Built once per
// session from the rows of the target language.
export type TranslationMap = Map<string, string>;

export function translationKey(entityType: TranslatableEntity, entityId: string, field: string): string {
  return `${entityType}:${entityId}:${field}`;
}

// Build a TranslationMap from raw rows. Blank/whitespace-only values are dropped so they can
// never shadow a real base string. Later rows win on duplicate keys.
export function buildTranslationMap(rows: ReadonlyArray<TranslationRow>): TranslationMap {
  const map: TranslationMap = new Map();
  for (const r of rows) {
    if (!r || typeof r.value !== "string") continue;
    if (r.value.trim() === "") continue;
    map.set(translationKey(r.entity_type, r.entity_id, r.field), r.value);
  }
  return map;
}

// Look up a single translated string, falling back to `base` when missing or blank.
function pick(map: TranslationMap, entityType: TranslatableEntity, entityId: string, field: string, base: string): string {
  const v = map.get(translationKey(entityType, entityId, field));
  return v !== undefined && v.trim() !== "" ? v : base;
}

// Translate a quiz title via the quiz's own row. Falls back to the base title.
export function translateTitle(map: TranslationMap, quizId: string, baseTitle: string): string {
  return pick(map, "quiz", quizId, "title", baseTitle);
}

// Return a translated COPY of a RuntimeQuestion: the prompt and each option's text are
// overlaid from `map`, with per-string fallback to the base value. The answer_spec's option
// ids are preserved; only the displayed option text is translated (and mirrored into both
// `options` and any `answerSpec.options`, since players read either depending on snapshot).
export function translateQuestion(map: TranslationMap, q: RuntimeQuestion): RuntimeQuestion {
  const prompt = pick(map, "question", q.id, "prompt", q.prompt);
  const options = q.options.map((o) => ({
    id: o.id,
    text: pick(map, "option", o.id, "text", o.text),
  }));

  // Keep answerSpec.options text in sync when present, so distribution labels and any
  // spec-derived rendering also show the translated text. Non-option specs pass through.
  const spec = q.answerSpec as unknown;
  let answerSpec = q.answerSpec;
  if (spec && typeof spec === "object" && Array.isArray((spec as { options?: unknown }).options)) {
    const specOptions = (spec as { options: Array<{ id: string; text: string }> }).options.map((o) => ({
      ...o,
      text: pick(map, "option", o.id, "text", o.text),
    }));
    answerSpec = { ...(spec as object), options: specOptions } as RuntimeQuestion["answerSpec"];
  } else if (spec && typeof spec === "object" && Array.isArray((spec as { items?: unknown }).items)) {
    // ordering: items[] carry option ids+text too.
    const specItems = (spec as { items: Array<{ id: string; text: string }> }).items.map((o) => ({
      ...o,
      text: pick(map, "option", o.id, "text", o.text),
    }));
    answerSpec = { ...(spec as object), items: specItems } as RuntimeQuestion["answerSpec"];
  }

  return { ...q, prompt, options, answerSpec };
}

// Convenience: translate a whole list of questions.
export function translateQuestions(map: TranslationMap, questions: ReadonlyArray<RuntimeQuestion>): RuntimeQuestion[] {
  return questions.map((q) => translateQuestion(map, q));
}

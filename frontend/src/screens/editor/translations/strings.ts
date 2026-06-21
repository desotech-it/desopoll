// Pure helpers for the "Lingue & traduzioni" tab (issue #6). No React, no I/O.
// They turn a quiz + its questions into the flat list of translatable strings,
// key existing TranslationEntry rows for fast lookup, and compute per-language
// completeness. Kept side-effect free so the logic is exhaustively unit-tested.
import type {
  AnswerSpec,
  Question,
  Quiz,
  TranslatableEntity,
  TranslationEntry,
} from "../../../api";

// One base string the author may translate. `entityType`/`entityId`/`field`
// uniquely identify it (matching the EAV key the backend stores).
export interface TranslatableString {
  entityType: TranslatableEntity;
  entityId: string;
  field: string;
  base: string; // the value in the quiz's base language (may be empty)
  // A short, stable label for grouping in the UI (e.g. "Quiz", "Q1", "Q1 · A").
  group: string;
}

// Stable key for an entity+lang+field translation row.
export function entryKey(
  entityType: TranslatableEntity,
  entityId: string,
  lang: string,
  field: string,
): string {
  return `${entityType}:${entityId}:${lang}:${field}`;
}

// Read the option/item rows out of an answer_spec, regardless of question type.
// Returns [] for specs without listed options (true/false, numeric, etc.).
function specOptions(spec: AnswerSpec): { id: string; text: string }[] {
  if (spec && typeof spec === "object") {
    if ("options" in spec && Array.isArray((spec as { options?: unknown }).options)) {
      return (spec as { options: { id: string; text: string }[] }).options;
    }
    if ("items" in spec && Array.isArray((spec as { items?: unknown }).items)) {
      return (spec as { items: { id: string; text: string }[] }).items;
    }
  }
  return [];
}

// Build the ordered list of translatable strings for a quiz: the quiz title
// first, then each question prompt followed by its option texts. Question groups
// are labelled "Q1", "Q2", … in document order; options as "Q1 · 1", "Q1 · 2".
export function collectStrings(
  quiz: Pick<Quiz, "id" | "title">,
  questions: ReadonlyArray<Question>,
): TranslatableString[] {
  const out: TranslatableString[] = [];
  out.push({
    entityType: "quiz",
    entityId: quiz.id,
    field: "title",
    base: quiz.title ?? "",
    group: "quiz",
  });

  const ordered = [...questions].sort((a, b) => a.position - b.position);
  ordered.forEach((q, qi) => {
    const qLabel = `Q${qi + 1}`;
    out.push({
      entityType: "question",
      entityId: q.id,
      field: "prompt",
      base: q.prompt ?? "",
      group: qLabel,
    });
    specOptions(q.answer_spec).forEach((opt, oi) => {
      out.push({
        entityType: "option",
        entityId: opt.id,
        field: "text",
        base: opt.text ?? "",
        group: `${qLabel} · ${oi + 1}`,
      });
    });
  });
  return out;
}

// Index translation rows by entityType:entityId:lang:field for O(1) lookup.
// Blank values are dropped (the backend treats blank as "no translation").
export function indexEntries(
  entries: ReadonlyArray<TranslationEntry>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of entries) {
    const value = (e.value ?? "").trim();
    if (!value) continue;
    map.set(entryKey(e.entity_type, e.entity_id, e.lang, e.field), value);
  }
  return map;
}

// The translated value for a string in a language, or "" if none.
export function lookup(
  index: Map<string, string>,
  s: TranslatableString,
  lang: string,
): string {
  return index.get(entryKey(s.entityType, s.entityId, lang, s.field)) ?? "";
}

export interface Completeness {
  total: number; // strings with a non-empty base (those worth translating)
  translated: number; // of those, how many have a non-blank translation
  done: boolean; // total > 0 && translated === total
}

// Per-language completeness: only base strings that have content count toward
// the total (an empty base prompt/option needs no translation).
export function completeness(
  strings: ReadonlyArray<TranslatableString>,
  index: Map<string, string>,
  lang: string,
): Completeness {
  let total = 0;
  let translated = 0;
  for (const s of strings) {
    if (!s.base.trim()) continue;
    total += 1;
    if (lookup(index, s, lang).trim()) translated += 1;
  }
  return { total, translated, done: total > 0 && translated === total };
}

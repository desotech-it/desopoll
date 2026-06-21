// Pure draft/diff helpers for the translations editor (issue #6). The editor
// keeps an in-memory draft (a flat Map keyed exactly like the backend rows) and,
// on save, sends only the rows that DIFFER from what the server returned. A row
// that is cleared to blank is sent as an empty value, which the backend deletes.
import type { TranslationEntry, TranslatableEntity } from "../../../api";
import { entryKey, type TranslatableString } from "./strings";

// The draft maps entryKey -> the author's current value (trimmed on save).
export type Draft = Map<string, string>;

// Seed a draft from the server index for a single language. We only seed the
// strings present in the quiz so unrelated rows are never resent.
export function seedDraft(
  strings: ReadonlyArray<TranslatableString>,
  index: Map<string, string>,
  lang: string,
): Draft {
  const d: Draft = new Map();
  for (const s of strings) {
    const key = entryKey(s.entityType, s.entityId, lang, s.field);
    d.set(key, index.get(key) ?? "");
  }
  return d;
}

// Compute the entries to PUT: every string whose draft value differs from the
// server's current value. Cleared values (now blank, previously set) are sent
// as "" so the backend deletes them. Values blank on both sides are skipped.
export function diffEntries(
  strings: ReadonlyArray<TranslatableString>,
  serverIndex: Map<string, string>,
  draft: Draft,
  lang: string,
): TranslationEntry[] {
  const out: TranslationEntry[] = [];
  for (const s of strings) {
    const key = entryKey(s.entityType, s.entityId, lang, s.field);
    const current = (draft.get(key) ?? "").trim();
    const server = (serverIndex.get(key) ?? "").trim();
    if (current === server) continue;
    out.push({
      entity_type: s.entityType as TranslatableEntity,
      entity_id: s.entityId,
      lang,
      field: s.field,
      value: current, // "" => delete on the backend
    });
  }
  return out;
}

// True when the draft has at least one unsaved change vs the server for `lang`.
export function isDirty(
  strings: ReadonlyArray<TranslatableString>,
  serverIndex: Map<string, string>,
  draft: Draft,
  lang: string,
): boolean {
  return diffEntries(strings, serverIndex, draft, lang).length > 0;
}

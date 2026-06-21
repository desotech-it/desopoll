// Unit tests for the draft/diff helpers (issue #6): seeding a draft from server
// rows, computing the minimal set of changed entries to PUT (including blank =>
// delete), and the dirty flag.
import { describe, it, expect } from "vitest";
import type { Question } from "../../../api";
import { collectStrings, indexEntries } from "./strings";
import { diffEntries, isDirty, seedDraft } from "./draft";

const question: Question = {
  id: "qid",
  position: 1,
  type: "single_choice",
  prompt: "What is 2+2?",
  image: null,
  time_limit_sec: 30,
  points_mode: "standard",
  speed_bonus: true,
  answer_spec: { options: [{ id: "o1", text: "Four" }], correct: ["o1"] },
};
const strings = collectStrings({ id: "QZ", title: "Math quiz" }, [question]);

describe("seedDraft", () => {
  it("seeds every string for the language from the server index", () => {
    const idx = indexEntries([
      { entity_type: "quiz", entity_id: "QZ", lang: "en", field: "title", value: "Math quiz EN" },
    ]);
    const d = seedDraft(strings, idx, "en");
    expect(d.get("quiz:QZ:en:title")).toBe("Math quiz EN");
    expect(d.get("question:qid:en:prompt")).toBe(""); // no row -> empty seed
    expect(d.get("option:o1:en:text")).toBe("");
  });
});

describe("diffEntries", () => {
  it("returns only rows that differ from the server (trimmed)", () => {
    const server = indexEntries([
      { entity_type: "quiz", entity_id: "QZ", lang: "en", field: "title", value: "Old" },
    ]);
    const draft = seedDraft(strings, server, "en");
    draft.set("quiz:QZ:en:title", "  Old  "); // same after trim -> skipped
    draft.set("question:qid:en:prompt", "2+2 EN"); // new -> upsert

    const out = diffEntries(strings, server, draft, "en");
    expect(out).toEqual([
      { entity_type: "question", entity_id: "qid", lang: "en", field: "prompt", value: "2+2 EN" },
    ]);
  });

  it("sends a blank value (delete) when a previously-set string is cleared", () => {
    const server = indexEntries([
      { entity_type: "option", entity_id: "o1", lang: "en", field: "text", value: "Four EN" },
    ]);
    const draft = seedDraft(strings, server, "en");
    draft.set("option:o1:en:text", "   "); // cleared

    const out = diffEntries(strings, server, draft, "en");
    expect(out).toEqual([
      { entity_type: "option", entity_id: "o1", lang: "en", field: "text", value: "" },
    ]);
  });

  it("skips strings blank on both sides", () => {
    const draft = seedDraft(strings, new Map(), "en"); // all empty seeds
    expect(diffEntries(strings, new Map(), draft, "en")).toEqual([]);
  });

  it("scopes the diff to the given language only", () => {
    const server = new Map<string, string>();
    const draft = seedDraft(strings, server, "es");
    draft.set("quiz:QZ:es:title", "Math quiz ES");
    // Asking for 'en' yields nothing because the draft holds 'es' keys.
    expect(diffEntries(strings, server, draft, "en")).toEqual([]);
    expect(diffEntries(strings, server, draft, "es")).toHaveLength(1);
  });
});

describe("isDirty", () => {
  it("is true iff there is at least one changed entry", () => {
    const server = new Map<string, string>();
    const clean = seedDraft(strings, server, "en");
    expect(isDirty(strings, server, clean, "en")).toBe(false);
    clean.set("quiz:QZ:en:title", "changed");
    expect(isDirty(strings, server, clean, "en")).toBe(true);
  });
});

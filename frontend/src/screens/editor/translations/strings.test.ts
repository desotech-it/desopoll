// Unit tests for the pure translation-string helpers (issue #6): collecting the
// translatable strings from a quiz, indexing server rows, and computing per-
// language completeness with the "blank base is not counted" rule.
import { describe, it, expect } from "vitest";
import type { Question, TranslationEntry } from "../../../api";
import {
  collectStrings,
  completeness,
  entryKey,
  indexEntries,
  lookup,
} from "./strings";

function q(overrides: Partial<Question> = {}): Question {
  return {
    id: "qid",
    position: 1,
    type: "single_choice",
    prompt: "What is 2+2?",
    image: null,
    time_limit_sec: 30,
    points_mode: "standard",
    speed_bonus: true,
    answer_spec: {
      options: [
        { id: "o1", text: "Four" },
        { id: "o2", text: "Five" },
      ],
      correct: ["o1"],
    },
    ...overrides,
  };
}

describe("collectStrings", () => {
  it("emits the quiz title first, then each prompt followed by its options", () => {
    const strings = collectStrings({ id: "QZ", title: "Math quiz" }, [q()]);
    expect(strings.map((s) => [s.entityType, s.field, s.base])).toEqual([
      ["quiz", "title", "Math quiz"],
      ["question", "prompt", "What is 2+2?"],
      ["option", "text", "Four"],
      ["option", "text", "Five"],
    ]);
    // Option entity ids come from answer_spec.options[].id.
    expect(strings[2].entityId).toBe("o1");
    expect(strings[3].entityId).toBe("o2");
  });

  it("orders questions by position regardless of array order", () => {
    const a = q({ id: "a", position: 2, prompt: "second" });
    const b = q({ id: "b", position: 1, prompt: "first", answer_spec: { options: [], correct: [] } });
    const strings = collectStrings({ id: "QZ", title: "T" }, [a, b]);
    const prompts = strings.filter((s) => s.entityType === "question").map((s) => s.base);
    expect(prompts).toEqual(["first", "second"]);
  });

  it("reads ordering items via answer_spec.items[]", () => {
    const ord = q({
      id: "ord",
      type: "ordering",
      prompt: "Order these",
      answer_spec: {
        items: [
          { id: "i1", text: "alpha" },
          { id: "i2", text: "beta" },
        ],
        correctOrder: ["i1", "i2"],
      },
    });
    const strings = collectStrings({ id: "QZ", title: "T" }, [ord]);
    const opts = strings.filter((s) => s.entityType === "option");
    expect(opts.map((s) => [s.entityId, s.base])).toEqual([
      ["i1", "alpha"],
      ["i2", "beta"],
    ]);
  });

  it("emits no option strings for specs without options (true/false)", () => {
    const tf = q({ id: "tf", type: "true_false", prompt: "Sky is blue?", answer_spec: { correct: true } });
    const strings = collectStrings({ id: "QZ", title: "T" }, [tf]);
    expect(strings.filter((s) => s.entityType === "option")).toHaveLength(0);
  });
});

describe("indexEntries / lookup", () => {
  const entries: TranslationEntry[] = [
    { entity_type: "quiz", entity_id: "QZ", lang: "en", field: "title", value: "Math quiz" },
    { entity_type: "option", entity_id: "o1", lang: "en", field: "text", value: "  " }, // blank -> dropped
    { entity_type: "option", entity_id: "o2", lang: "en", field: "text", value: "Cinco" },
  ];

  it("keys rows by entity:lang:field and drops blank values", () => {
    const idx = indexEntries(entries);
    expect(idx.get(entryKey("quiz", "QZ", "en", "title"))).toBe("Math quiz");
    expect(idx.has(entryKey("option", "o1", "en", "text"))).toBe(false);
    expect(idx.get(entryKey("option", "o2", "en", "text"))).toBe("Cinco");
  });

  it("lookup returns '' when no translation exists", () => {
    const idx = indexEntries(entries);
    const s = { entityType: "option" as const, entityId: "o1", field: "text", base: "Five", group: "Q1 · 2" };
    expect(lookup(idx, s, "en")).toBe("");
  });
});

describe("completeness", () => {
  const strings = collectStrings({ id: "QZ", title: "Math quiz" }, [q()]);

  it("counts only base strings with content; done only when all translated", () => {
    const full = indexEntries([
      { entity_type: "quiz", entity_id: "QZ", lang: "en", field: "title", value: "Math quiz" },
      { entity_type: "question", entity_id: "qid", lang: "en", field: "prompt", value: "2+2?" },
      { entity_type: "option", entity_id: "o1", lang: "en", field: "text", value: "Four" },
      { entity_type: "option", entity_id: "o2", lang: "en", field: "text", value: "Five" },
    ]);
    expect(completeness(strings, full, "en")).toEqual({ total: 4, translated: 4, done: true });
  });

  it("reports partial progress", () => {
    const partial = indexEntries([
      { entity_type: "quiz", entity_id: "QZ", lang: "en", field: "title", value: "Math quiz" },
    ]);
    expect(completeness(strings, partial, "en")).toEqual({ total: 4, translated: 1, done: false });
  });

  it("excludes empty base strings from the total", () => {
    const withEmpty = collectStrings({ id: "QZ", title: "T" }, [
      q({ id: "q2", prompt: "", answer_spec: { options: [{ id: "x", text: "" }], correct: [] } }),
    ]);
    // Only the quiz title has a non-empty base here.
    expect(completeness(withEmpty, new Map(), "en")).toEqual({ total: 1, translated: 0, done: false });
  });
});

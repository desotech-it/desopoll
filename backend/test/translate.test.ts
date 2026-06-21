import { describe, it, expect } from "vitest";
import {
  buildTranslationMap,
  translateQuestion,
  translateQuestions,
  translateTitle,
  translationKey,
  type TranslationRow,
} from "../src/game/translate.js";
import type { RuntimeQuestion } from "../src/game/runtime.js";

function q(partial: Partial<RuntimeQuestion>): RuntimeQuestion {
  return {
    id: "q1",
    index: 0,
    type: "single_choice",
    prompt: "What is 2+2?",
    image: null,
    timeLimitSec: 20,
    pointsMode: "standard",
    speedBonus: true,
    answerSpec: { options: [{ id: "a", text: "4" }, { id: "b", text: "3" }], correct: ["a"] },
    options: [{ id: "a", text: "4" }, { id: "b", text: "3" }],
    ...partial,
  };
}

const rows: TranslationRow[] = [
  { entity_type: "quiz", entity_id: "quiz1", field: "title", value: "Quiz tradotto" },
  { entity_type: "question", entity_id: "q1", field: "prompt", value: "Quanto fa 2+2?" },
  { entity_type: "option", entity_id: "a", field: "text", value: "quattro" },
  { entity_type: "option", entity_id: "b", field: "text", value: "tre" },
];

describe("translationKey", () => {
  it("composes a stable key", () => {
    expect(translationKey("option", "a", "text")).toBe("option:a:text");
  });
});

describe("buildTranslationMap", () => {
  it("indexes rows by entity:id:field", () => {
    const map = buildTranslationMap(rows);
    expect(map.get("quiz:quiz1:title")).toBe("Quiz tradotto");
    expect(map.get("option:a:text")).toBe("quattro");
  });
  it("drops blank / whitespace-only values so they never shadow base", () => {
    const map = buildTranslationMap([
      { entity_type: "question", entity_id: "q1", field: "prompt", value: "" },
      { entity_type: "option", entity_id: "a", field: "text", value: "   " },
    ]);
    expect(map.has("question:q1:prompt")).toBe(false);
    expect(map.has("option:a:text")).toBe(false);
  });
  it("ignores malformed rows", () => {
    const map = buildTranslationMap([
      // @ts-expect-error intentionally bad value
      { entity_type: "quiz", entity_id: "quiz1", field: "title", value: 42 },
    ]);
    expect(map.size).toBe(0);
  });
});

describe("translateTitle", () => {
  it("returns the translation when present", () => {
    const map = buildTranslationMap(rows);
    expect(translateTitle(map, "quiz1", "Base Quiz")).toBe("Quiz tradotto");
  });
  it("falls back to base when missing", () => {
    const map = buildTranslationMap(rows);
    expect(translateTitle(map, "other-quiz", "Base Quiz")).toBe("Base Quiz");
  });
});

describe("translateQuestion — full translation", () => {
  it("translates prompt and every option, syncing answerSpec.options", () => {
    const map = buildTranslationMap(rows);
    const out = translateQuestion(map, q({ id: "q1" }));
    expect(out.prompt).toBe("Quanto fa 2+2?");
    expect(out.options).toEqual([
      { id: "a", text: "quattro" },
      { id: "b", text: "tre" },
    ]);
    const spec = out.answerSpec as { options: Array<{ id: string; text: string }>; correct: string[] };
    expect(spec.options).toEqual([
      { id: "a", text: "quattro" },
      { id: "b", text: "tre" },
    ]);
    // correctness data is preserved untouched
    expect(spec.correct).toEqual(["a"]);
  });
});

describe("translateQuestion — fallback when missing", () => {
  it("keeps base prompt and base option text when no translations exist", () => {
    const map = buildTranslationMap([]);
    const base = q({ id: "q1" });
    const out = translateQuestion(map, base);
    expect(out.prompt).toBe("What is 2+2?");
    expect(out.options).toEqual([
      { id: "a", text: "4" },
      { id: "b", text: "3" },
    ]);
  });
  it("does not mutate the base question", () => {
    const map = buildTranslationMap(rows);
    const base = q({ id: "q1" });
    translateQuestion(map, base);
    expect(base.prompt).toBe("What is 2+2?");
    expect(base.options[0].text).toBe("4");
  });
});

describe("translateQuestion — partial translation (per-string fallback)", () => {
  it("translates prompt but leaves an untranslated option in the base language", () => {
    const map = buildTranslationMap([
      { entity_type: "question", entity_id: "q1", field: "prompt", value: "Quanto fa 2+2?" },
      { entity_type: "option", entity_id: "a", field: "text", value: "quattro" },
      // option b intentionally untranslated
    ]);
    const out = translateQuestion(map, q({ id: "q1" }));
    expect(out.prompt).toBe("Quanto fa 2+2?");
    expect(out.options).toEqual([
      { id: "a", text: "quattro" },
      { id: "b", text: "3" }, // fallback
    ]);
  });
  it("falls back on prompt when only options are translated", () => {
    const map = buildTranslationMap([
      { entity_type: "option", entity_id: "a", field: "text", value: "quattro" },
    ]);
    const out = translateQuestion(map, q({ id: "q1" }));
    expect(out.prompt).toBe("What is 2+2?");
    expect(out.options[0].text).toBe("quattro");
    expect(out.options[1].text).toBe("3");
  });
});

describe("translateQuestion — ordering items[]", () => {
  it("translates item text inside answerSpec.items", () => {
    const ordering = q({
      id: "q2",
      type: "ordering",
      options: [],
      answerSpec: {
        items: [{ id: "i1", text: "First" }, { id: "i2", text: "Second" }],
        correctOrder: ["i1", "i2"],
      },
    });
    const map = buildTranslationMap([
      { entity_type: "option", entity_id: "i1", field: "text", value: "Primo" },
    ]);
    const out = translateQuestion(map, ordering);
    const spec = out.answerSpec as { items: Array<{ id: string; text: string }>; correctOrder: string[] };
    expect(spec.items).toEqual([
      { id: "i1", text: "Primo" },
      { id: "i2", text: "Second" }, // per-string fallback
    ]);
    expect(spec.correctOrder).toEqual(["i1", "i2"]);
  });

  it("translates the runtime items presentation list (preserving shuffled order + ids)", () => {
    const ordering = q({
      id: "q2",
      type: "ordering",
      options: [],
      answerSpec: { items: [{ id: "i1", text: "First" }, { id: "i2", text: "Second" }], correctOrder: ["i1", "i2"] },
      // shuffled presentation order set by toRuntimeQuestion at build time
      items: [{ id: "i2", text: "Second" }, { id: "i1", text: "First" }],
    });
    const map = buildTranslationMap([
      { entity_type: "option", entity_id: "i1", field: "text", value: "Primo" },
      { entity_type: "option", entity_id: "i2", field: "text", value: "Secondo" },
    ]);
    const out = translateQuestion(map, ordering);
    expect(out.items).toEqual([
      { id: "i2", text: "Secondo" },
      { id: "i1", text: "Primo" },
    ]);
  });
});

describe("translateQuestions (list)", () => {
  it("maps over the list", () => {
    const map = buildTranslationMap(rows);
    const out = translateQuestions(map, [q({ id: "q1" })]);
    expect(out).toHaveLength(1);
    expect(out[0].prompt).toBe("Quanto fa 2+2?");
  });
});

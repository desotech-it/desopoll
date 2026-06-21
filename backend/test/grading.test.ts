import { describe, it, expect } from "vitest";
import { grade } from "../src/game/grading.js";

describe("grade single_choice", () => {
  const spec = { options: [{ id: "a", text: "4" }, { id: "b", text: "3" }], correct: ["a"] };
  it("is correct when the right option is chosen", () => {
    expect(grade("single_choice", spec, { optionId: "a" })).toEqual({ correct: true, partial: 1 });
  });
  it("is wrong for the wrong option", () => {
    expect(grade("single_choice", spec, { optionId: "b" })).toEqual({ correct: false, partial: 0 });
  });
  it("is wrong with no selection", () => {
    expect(grade("single_choice", spec, { optionIds: [] } as never)).toEqual({ correct: false, partial: 0 });
  });
});

describe("grade multiple_choice", () => {
  const spec = { options: [{ id: "a", text: "" }, { id: "b", text: "" }, { id: "c", text: "" }, { id: "d", text: "" }], correct: ["a", "b"] };
  it("is fully correct for the exact set", () => {
    expect(grade("multiple_choice", spec, { optionIds: ["a", "b"] })).toEqual({ correct: true, partial: 1 });
  });
  it("gives partial credit for one of two correct", () => {
    const r = grade("multiple_choice", spec, { optionIds: ["a"] });
    expect(r.correct).toBe(false);
    expect(r.partial).toBeCloseTo(0.5, 5);
  });
  it("penalizes wrong selections", () => {
    const r = grade("multiple_choice", spec, { optionIds: ["a", "c"] });
    expect(r.correct).toBe(false);
    expect(r.partial).toBeCloseTo(0, 5); // (1 hit - 1 miss)/2 = 0
  });
  it("never goes negative", () => {
    const r = grade("multiple_choice", spec, { optionIds: ["c", "d"] });
    expect(r.partial).toBe(0);
  });
});

describe("grade true_false", () => {
  it("matches the boolean", () => {
    expect(grade("true_false", { correct: true }, { value: true })).toEqual({ correct: true, partial: 1 });
    expect(grade("true_false", { correct: true }, { value: false })).toEqual({ correct: false, partial: 0 });
  });
});

describe("grade open_text", () => {
  it("matches case-insensitively by default", () => {
    expect(grade("open_text", { accepted: ["Roma"] }, { text: "  roma " }).correct).toBe(true);
  });
  it("respects case sensitivity when requested", () => {
    expect(grade("open_text", { accepted: ["Roma"], caseSensitive: true }, { text: "roma" }).correct).toBe(false);
    expect(grade("open_text", { accepted: ["Roma"], caseSensitive: true }, { text: "Roma" }).correct).toBe(true);
  });
  it("is wrong for an unlisted answer", () => {
    expect(grade("open_text", { accepted: ["Roma"] }, { text: "Milano" }).correct).toBe(false);
  });
});

describe("grade poll", () => {
  it("never scores (survey)", () => {
    expect(grade("poll", { options: [{ id: "a", text: "x" }] }, { optionIds: ["a"] })).toEqual({ correct: false, partial: 0 });
  });
});

describe("grade numeric", () => {
  it("is correct on an exact match with no tolerance", () => {
    expect(grade("numeric", { answer: 42 }, { value: 42 })).toEqual({ correct: true, partial: 1 });
  });
  it("is wrong outside zero tolerance", () => {
    expect(grade("numeric", { answer: 42 }, { value: 43 })).toEqual({ correct: false, partial: 0 });
  });
  it("accepts values within tolerance (inclusive, both directions)", () => {
    const spec = { answer: 100, tolerance: 5 };
    expect(grade("numeric", spec, { value: 105 }).correct).toBe(true);
    expect(grade("numeric", spec, { value: 95 }).correct).toBe(true);
    expect(grade("numeric", spec, { value: 106 }).correct).toBe(false);
    expect(grade("numeric", spec, { value: 94 }).correct).toBe(false);
  });
  it("is wrong for a non-numeric payload or spec", () => {
    expect(grade("numeric", { answer: 1 }, { text: "1" } as never)).toEqual({ correct: false, partial: 0 });
    expect(grade("numeric", {} as never, { value: 1 })).toEqual({ correct: false, partial: 0 });
  });
});

describe("grade slider", () => {
  const spec = { min: 0, max: 100, step: 1, answer: 50, tolerance: 2 };
  it("is correct within tolerance", () => {
    expect(grade("slider", spec, { value: 48 }).correct).toBe(true);
    expect(grade("slider", spec, { value: 52 }).correct).toBe(true);
  });
  it("is wrong outside tolerance", () => {
    expect(grade("slider", spec, { value: 47 }).correct).toBe(false);
  });
});

describe("grade ordering", () => {
  const spec = { items: [{ id: "a", text: "1" }, { id: "b", text: "2" }, { id: "c", text: "3" }, { id: "d", text: "4" }], correctOrder: ["a", "b", "c", "d"] };
  it("is fully correct for the exact order", () => {
    expect(grade("ordering", spec, { order: ["a", "b", "c", "d"] })).toEqual({ correct: true, partial: 1 });
  });
  it("gives partial credit for items in their correct position", () => {
    // a and d in place, b and c swapped → 2/4 = 0.5
    const r = grade("ordering", spec, { order: ["a", "c", "b", "d"] });
    expect(r.correct).toBe(false);
    expect(r.partial).toBeCloseTo(0.5, 5);
  });
  it("gives zero when nothing is in place", () => {
    const r = grade("ordering", spec, { order: ["d", "c", "b", "a"] });
    expect(r.correct).toBe(false);
    expect(r.partial).toBe(0); // full reversal: no element sits in its correct slot
  });
  it("is wrong for a wrong-length order even if a prefix matches", () => {
    const r = grade("ordering", spec, { order: ["a", "b", "c"] });
    expect(r.correct).toBe(false);
    expect(r.partial).toBeCloseTo(0.75, 5); // 3 of 4 positions matched, but length differs
  });
  it("is wrong for an empty spec", () => {
    expect(grade("ordering", {} as never, { order: ["a"] })).toEqual({ correct: false, partial: 0 });
  });
});

describe("grade word_cloud", () => {
  it("never scores (survey, free text)", () => {
    expect(grade("word_cloud", {}, { text: "anything" })).toEqual({ correct: false, partial: 0 });
  });
});

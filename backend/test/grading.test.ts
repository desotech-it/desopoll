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

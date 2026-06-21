// Tests for answer_spec defaults + metadata lookups.
import { describe, it, expect } from "vitest";
import {
  answerSummary,
  defaultAnswerSpec,
  hasOptions,
  isNumeric,
  isOpenText,
  isOrdering,
  isSlider,
  isTrueFalse,
  typeMeta,
  typeName,
} from "./questionTypes";

describe("defaultAnswerSpec", () => {
  it("multiple_choice starts with NO correct option pre-selected", () => {
    const spec = defaultAnswerSpec("multiple_choice");
    expect(hasOptions(spec)).toBe(true);
    if (hasOptions(spec)) {
      expect(spec.options.length).toBe(4);
      // The audit bug: previously the first empty option was auto-correct.
      expect(spec.correct ?? []).toEqual([]);
    }
  });

  it("single_choice pre-selects the first option as correct", () => {
    const spec = defaultAnswerSpec("single_choice");
    if (hasOptions(spec)) {
      expect(spec.correct?.length).toBe(1);
      expect(spec.correct?.[0]).toBe(spec.options[0].id);
    }
  });

  it("true_false defaults to correct=true", () => {
    const spec = defaultAnswerSpec("true_false");
    expect(isTrueFalse(spec)).toBe(true);
    if (isTrueFalse(spec)) expect(spec.correct).toBe(true);
  });

  it("poll has options and no correct array", () => {
    const spec = defaultAnswerSpec("poll");
    expect(hasOptions(spec)).toBe(true);
    expect("correct" in spec).toBe(false);
  });

  it("open_text has an empty accepted list", () => {
    const spec = defaultAnswerSpec("open_text");
    expect(isOpenText(spec)).toBe(true);
    if (isOpenText(spec)) expect(spec.accepted).toEqual([]);
  });

  it("numeric defaults to answer 0 with zero tolerance", () => {
    const spec = defaultAnswerSpec("numeric");
    expect(isNumeric(spec)).toBe(true);
    if (isNumeric(spec)) {
      expect(spec.answer).toBe(0);
      expect(spec.tolerance).toBe(0);
    }
    // numeric must NOT be mistaken for a slider (no min/max).
    expect(isSlider(spec)).toBe(false);
  });

  it("slider defaults to a 0..100 range with answer 50", () => {
    const spec = defaultAnswerSpec("slider");
    expect(isSlider(spec)).toBe(true);
    if (isSlider(spec)) {
      expect(spec.min).toBe(0);
      expect(spec.max).toBe(100);
      expect(spec.step).toBe(1);
      expect(spec.answer).toBe(50);
    }
  });

  it("ordering's correctOrder lists every item id once", () => {
    const spec = defaultAnswerSpec("ordering");
    expect(isOrdering(spec)).toBe(true);
    if (isOrdering(spec)) {
      expect(spec.items.length).toBe(3);
      expect(spec.correctOrder).toEqual(spec.items.map((i) => i.id));
      expect(new Set(spec.correctOrder).size).toBe(spec.items.length);
    }
  });

  it("word_cloud is an empty survey spec", () => {
    const spec = defaultAnswerSpec("word_cloud");
    expect(Object.keys(spec)).toEqual([]);
    expect(isNumeric(spec)).toBe(false);
    expect(isSlider(spec)).toBe(false);
    expect(isOrdering(spec)).toBe(false);
  });
});

describe("answerSummary (new types)", () => {
  it("summarizes numeric with tolerance", () => {
    expect(answerSummary("numeric", { answer: 42, tolerance: 2 })).toBe("Risposta: 42 ± 2");
    expect(answerSummary("numeric", { answer: 42, tolerance: 0 })).toBe("Risposta: 42");
  });

  it("summarizes slider range + answer", () => {
    expect(answerSummary("slider", { min: 0, max: 10, step: 1, answer: 5, tolerance: 1 })).toBe(
      "Scala 0–10 · risposta 5 ± 1",
    );
  });

  it("summarizes ordering item count and word_cloud survey", () => {
    const ord = defaultAnswerSpec("ordering");
    expect(answerSummary("ordering", ord)).toBe("3 elementi da ordinare");
    expect(answerSummary("word_cloud", {})).toBe("Sondaggio · nessun punteggio");
  });
});

describe("type metadata", () => {
  it("typeName returns the Italian label", () => {
    expect(typeName("poll")).toBe("Sondaggio (Poll)");
    expect(typeName("open_text")).toBe("Risposta aperta");
  });

  it("typeMeta exposes icon + tone for a known type", () => {
    const meta = typeMeta("true_false");
    expect(meta?.icon).toBe("truefalse");
    expect(meta?.tone).toBeTruthy();
  });
});

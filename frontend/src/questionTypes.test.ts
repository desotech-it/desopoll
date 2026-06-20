// Tests for answer_spec defaults + metadata lookups.
import { describe, it, expect } from "vitest";
import {
  defaultAnswerSpec,
  hasOptions,
  isOpenText,
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

// Unit tests for the PURE scoring-model helpers (issue #8). These must mirror
// the server-authoritative numbers: standard 1000, double 2000, none 0; speed
// bonus 100% → 50%; surveys never scored.
import { describe, it, expect } from "vitest";
import {
  BASE_POINTS,
  SPEED_FLOOR_PCT,
  SPEED_MAX_PCT,
  basePoints,
  isSurveyType,
  speedBonusApplies,
  supportsPartialCredit,
} from "./scoring";

describe("BASE_POINTS", () => {
  it("matches the backend base points exactly", () => {
    expect(BASE_POINTS.standard).toBe(1000);
    expect(BASE_POINTS.double).toBe(2000);
    expect(BASE_POINTS.none).toBe(0);
  });
});

describe("speed-bonus envelope", () => {
  it("ranges from 100% (instant) to 50% (time-up)", () => {
    expect(SPEED_MAX_PCT).toBe(100);
    expect(SPEED_FLOOR_PCT).toBe(50);
  });
});

describe("isSurveyType", () => {
  it("treats poll and word_cloud as surveys", () => {
    expect(isSurveyType("poll")).toBe(true);
    expect(isSurveyType("word_cloud")).toBe(true);
  });
  it("treats scored types as non-surveys", () => {
    expect(isSurveyType("single_choice")).toBe(false);
    expect(isSurveyType("multiple_choice")).toBe(false);
    expect(isSurveyType("true_false")).toBe(false);
    expect(isSurveyType("ordering")).toBe(false);
  });
});

describe("basePoints", () => {
  it("returns the configured base for scored types", () => {
    expect(basePoints("single_choice", "standard")).toBe(1000);
    expect(basePoints("ordering", "double")).toBe(2000);
    expect(basePoints("true_false", "none")).toBe(0);
  });
  it("returns 0 for survey types regardless of mode", () => {
    expect(basePoints("poll", "standard")).toBe(0);
    expect(basePoints("word_cloud", "double")).toBe(0);
  });
});

describe("supportsPartialCredit", () => {
  it("is true for multiple_choice, ordering, numeric, slider", () => {
    expect(supportsPartialCredit("multiple_choice")).toBe(true);
    expect(supportsPartialCredit("ordering")).toBe(true);
    expect(supportsPartialCredit("numeric")).toBe(true);
    expect(supportsPartialCredit("slider")).toBe(true);
  });
  it("is false for all-or-nothing types and surveys", () => {
    expect(supportsPartialCredit("single_choice")).toBe(false);
    expect(supportsPartialCredit("true_false")).toBe(false);
    expect(supportsPartialCredit("poll")).toBe(false);
  });
});

describe("speedBonusApplies", () => {
  it("applies for scored types with points", () => {
    expect(speedBonusApplies("single_choice", "standard")).toBe(true);
    expect(speedBonusApplies("ordering", "double")).toBe(true);
  });
  it("does not apply when points_mode is none", () => {
    expect(speedBonusApplies("single_choice", "none")).toBe(false);
  });
  it("does not apply for survey types", () => {
    expect(speedBonusApplies("poll", "standard")).toBe(false);
    expect(speedBonusApplies("word_cloud", "double")).toBe(false);
  });
});

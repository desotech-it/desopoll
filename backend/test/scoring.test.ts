import { describe, it, expect } from "vitest";
import { BASE_POINTS, computePoints, speedFactor } from "../src/game/scoring.js";

describe("speedFactor", () => {
  it("is 1 when speed bonus is disabled", () => {
    expect(speedFactor(0, 20, false)).toBe(1);
    expect(speedFactor(20000, 20, false)).toBe(1);
  });
  it("is 1 for an instant answer and 0.5 at the buzzer", () => {
    expect(speedFactor(0, 20, true)).toBe(1);
    expect(speedFactor(20000, 20, true)).toBeCloseTo(0.5, 5);
  });
  it("is 0.75 at the half-way point", () => {
    expect(speedFactor(10000, 20, true)).toBeCloseTo(0.75, 5);
  });
  it("clamps overtime answers to the buzzer value", () => {
    expect(speedFactor(99999, 20, true)).toBeCloseTo(0.5, 5);
  });
  it("guards against a zero/negative time limit", () => {
    expect(speedFactor(1000, 0, true)).toBe(1);
  });
});

describe("computePoints", () => {
  it("awards nothing for wrong answers", () => {
    expect(computePoints({ partial: 0, responseTimeMs: 0, timeLimitSec: 20, pointsMode: "standard", speedBonus: true })).toBe(0);
  });
  it("awards nothing when points mode is none", () => {
    expect(computePoints({ partial: 1, responseTimeMs: 0, timeLimitSec: 20, pointsMode: "none", speedBonus: true })).toBe(0);
  });
  it("awards full base for an instant correct answer", () => {
    expect(computePoints({ partial: 1, responseTimeMs: 0, timeLimitSec: 20, pointsMode: "standard", speedBonus: true })).toBe(BASE_POINTS.standard);
  });
  it("halves points at the buzzer", () => {
    expect(computePoints({ partial: 1, responseTimeMs: 20000, timeLimitSec: 20, pointsMode: "standard", speedBonus: true })).toBe(500);
  });
  it("doubles base for double mode", () => {
    expect(computePoints({ partial: 1, responseTimeMs: 0, timeLimitSec: 20, pointsMode: "double", speedBonus: true })).toBe(2000);
  });
  it("ignores time when speed bonus is off", () => {
    expect(computePoints({ partial: 1, responseTimeMs: 19000, timeLimitSec: 20, pointsMode: "standard", speedBonus: false })).toBe(1000);
  });
  it("scales by partial credit", () => {
    expect(computePoints({ partial: 0.5, responseTimeMs: 0, timeLimitSec: 20, pointsMode: "standard", speedBonus: false })).toBe(500);
  });
  it("clamps partial above 1", () => {
    expect(computePoints({ partial: 5, responseTimeMs: 0, timeLimitSec: 20, pointsMode: "standard", speedBonus: false })).toBe(1000);
  });
});

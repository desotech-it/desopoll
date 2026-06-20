// Server-authoritative scoring. Pure functions — no I/O — so they are fully unit-tested
// and identical across pods. Players never compute their own points (anti-cheat).
import type { PointsMode } from "./types.js";

export const BASE_POINTS: Record<PointsMode, number> = {
  standard: 1000,
  double: 2000,
  none: 0,
};

export interface ScoreInput {
  partial: number; // 0..1 correctness (1 = fully correct)
  responseTimeMs: number; // time from question start to answer
  timeLimitSec: number;
  pointsMode: PointsMode;
  speedBonus: boolean;
}

// Speed factor in [0.5, 1]: instant answer keeps 100%, answering at the buzzer keeps 50%.
// Matches the familiar Kahoot curve. With speedBonus off it is always 1.
export function speedFactor(responseTimeMs: number, timeLimitSec: number, speedBonus: boolean): number {
  if (!speedBonus || timeLimitSec <= 0) return 1;
  const limitMs = timeLimitSec * 1000;
  const frac = Math.min(Math.max(responseTimeMs, 0), limitMs) / limitMs;
  return 1 - frac / 2;
}

export function computePoints(input: ScoreInput): number {
  const base = BASE_POINTS[input.pointsMode] ?? 0;
  const partial = Math.min(Math.max(input.partial, 0), 1);
  if (base === 0 || partial <= 0) return 0;
  const factor = speedFactor(input.responseTimeMs, input.timeLimitSec, input.speedBonus);
  return Math.round(base * partial * factor);
}

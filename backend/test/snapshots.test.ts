import { describe, it, expect } from "vitest";
import { distribution, leaderboard, podium, publicQuestion } from "../src/game/snapshots.js";
import type { RuntimePlayer, RuntimeQuestion, RuntimeAnswer } from "../src/game/runtime.js";

const players: Record<string, RuntimePlayer> = {
  p1: { id: "p1", nickname: "Ada", score: 1500 },
  p2: { id: "p2", nickname: "Bo", score: 2200 },
  p3: { id: "p3", nickname: "Cy", score: 2200 },
};

function q(partial: Partial<RuntimeQuestion>): RuntimeQuestion {
  return {
    id: "q",
    index: 0,
    type: "single_choice",
    prompt: "?",
    image: null,
    timeLimitSec: 20,
    pointsMode: "standard",
    speedBonus: true,
    answerSpec: { options: [], correct: [] },
    options: [],
    ...partial,
  };
}

describe("publicQuestion", () => {
  it("never leaks correctness", () => {
    const question = q({
      type: "single_choice",
      options: [{ id: "a", text: "4" }, { id: "b", text: "3" }],
      answerSpec: { options: [{ id: "a", text: "4" }, { id: "b", text: "3" }], correct: ["a"] },
    });
    const pub = publicQuestion(question, 5);
    expect(pub.total).toBe(5);
    expect(pub.options).toEqual([{ id: "a", text: "4" }, { id: "b", text: "3" }]);
    expect(JSON.stringify(pub)).not.toContain("correct");
  });
});

describe("leaderboard / podium", () => {
  it("sorts by score desc, ties broken by nickname, ranks sequentially", () => {
    const rows = leaderboard(players);
    expect(rows.map((r) => r.nickname)).toEqual(["Bo", "Cy", "Ada"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
  it("podium returns at most 3", () => {
    expect(podium(players)).toHaveLength(3);
    expect(podium({ p1: players.p1 })).toHaveLength(1);
  });
});

describe("distribution", () => {
  it("counts single_choice selections per option", () => {
    const question = q({
      type: "single_choice",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
    });
    const answers: Record<string, RuntimeAnswer> = {
      p1: { playerId: "p1", correct: true, partial: 1, points: 1000, responseTimeMs: 0, payload: { optionId: "a" } },
      p2: { playerId: "p2", correct: false, partial: 0, points: 0, responseTimeMs: 0, payload: { optionId: "b" } },
      p3: { playerId: "p3", correct: true, partial: 1, points: 900, responseTimeMs: 0, payload: { optionId: "a" } },
    };
    expect(distribution(question, answers)).toEqual([
      { key: "a", label: "A", count: 2 },
      { key: "b", label: "B", count: 1 },
    ]);
  });
  it("buckets true_false answers", () => {
    const question = q({ type: "true_false", options: [] });
    const answers: Record<string, RuntimeAnswer> = {
      p1: { playerId: "p1", correct: true, partial: 1, points: 0, responseTimeMs: 0, payload: { value: true } },
      p2: { playerId: "p2", correct: false, partial: 0, points: 0, responseTimeMs: 0, payload: { value: false } },
    };
    const d = distribution(question, answers);
    expect(d).toEqual([
      { key: "true", label: "Vero", count: 1 },
      { key: "false", label: "Falso", count: 1 },
    ]);
  });
});

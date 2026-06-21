import { describe, it, expect } from "vitest";
import { distribution, leaderboard, podium, publicQuestion, resultsSnapshot } from "../src/game/snapshots.js";
import type { RuntimePlayer, RuntimeQuestion, RuntimeAnswer, RuntimeSession } from "../src/game/runtime.js";

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

  it("exposes ordering items for the player to arrange, but NOT correctOrder", () => {
    const items = [{ id: "x", text: "Primo" }, { id: "y", text: "Secondo" }, { id: "z", text: "Terzo" }];
    const question = q({
      type: "ordering",
      options: [],
      // runtime carries the SHUFFLED presentation order under `items` (set by toRuntimeQuestion).
      items: [{ id: "z", text: "Terzo" }, { id: "x", text: "Primo" }, { id: "y", text: "Secondo" }],
      answerSpec: { items, correctOrder: ["x", "y", "z"] },
    });
    const pub = publicQuestion(question, 3);
    // Player receives every item (id+text) so the reorder UI can render.
    expect(pub.items).toEqual([
      { id: "z", text: "Terzo" },
      { id: "x", text: "Primo" },
      { id: "y", text: "Secondo" },
    ]);
    expect((pub.items ?? []).map((i) => i.id).sort()).toEqual(["x", "y", "z"]);
    // The correct sequence must NEVER reach the player.
    expect(JSON.stringify(pub)).not.toContain("correctOrder");
    expect(pub).not.toHaveProperty("correctOrder");
  });

  it("exposes slider min/max/step but NOT the answer/tolerance", () => {
    const question = q({
      type: "slider",
      options: [],
      min: 1900,
      max: 2025,
      step: 5,
      answerSpec: { min: 1900, max: 2025, step: 5, answer: 1969, tolerance: 1 },
    });
    const pub = publicQuestion(question, 4);
    expect(pub.min).toBe(1900);
    expect(pub.max).toBe(2025);
    expect(pub.step).toBe(5);
    // The correct value/tolerance must NEVER reach the player.
    expect(JSON.stringify(pub)).not.toContain("answer");
    expect(JSON.stringify(pub)).not.toContain("tolerance");
    expect(pub).not.toHaveProperty("answer");
  });

  it("omits ordering items / slider range for unrelated types", () => {
    const pub = publicQuestion(q({ type: "single_choice", options: [{ id: "a", text: "A" }] }), 1);
    expect(pub).not.toHaveProperty("items");
    expect(pub).not.toHaveProperty("min");
    expect(pub).not.toHaveProperty("max");
    expect(pub).not.toHaveProperty("step");
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

  function ans(payload: unknown): RuntimeAnswer {
    return { playerId: "x", correct: false, partial: 0, points: 0, responseTimeMs: 0, payload };
  }

  it("buckets numeric answers by value, most frequent first", () => {
    const question = q({ type: "numeric", options: [] });
    const answers: Record<string, RuntimeAnswer> = {
      p1: ans({ value: 10 }),
      p2: ans({ value: 10 }),
      p3: ans({ value: 20 }),
    };
    expect(distribution(question, answers)).toEqual([
      { key: "10", label: "10", count: 2 },
      { key: "20", label: "20", count: 1 },
    ]);
  });

  it("buckets slider answers by value and skips non-numeric payloads", () => {
    const question = q({ type: "slider", options: [] });
    const answers: Record<string, RuntimeAnswer> = {
      p1: ans({ value: 5 }),
      p2: ans({ value: 5 }),
      p3: ans({ text: "nope" }), // ignored: not numeric
    };
    expect(distribution(question, answers)).toEqual([{ key: "5", label: "5", count: 1 * 2 }]);
  });

  it("aggregates word_cloud word frequencies like open_text", () => {
    const question = q({ type: "word_cloud", options: [] });
    const answers: Record<string, RuntimeAnswer> = {
      p1: ans({ text: "veloce" }),
      p2: ans({ text: " veloce " }), // trimmed → same bucket
      p3: ans({ text: "lento" }),
      p4: ans({ text: "" }), // blank ignored
    };
    expect(distribution(question, answers)).toEqual([
      { key: "veloce", label: "veloce", count: 2 },
      { key: "lento", label: "lento", count: 1 },
    ]);
  });

  it("buckets ordering answers into exact / partial / wrong (not per-option)", () => {
    const question = q({
      type: "ordering",
      options: [],
      items: [{ id: "c", text: "3" }, { id: "a", text: "1" }, { id: "b", text: "2" }],
      answerSpec: { items: [{ id: "a", text: "1" }, { id: "b", text: "2" }, { id: "c", text: "3" }], correctOrder: ["a", "b", "c"] },
    });
    const answers: Record<string, RuntimeAnswer> = {
      p1: ans({ order: ["a", "b", "c"] }), // exact
      p2: ans({ order: ["a", "c", "b"] }), // a in place → partial
      p3: ans({ order: ["c", "b", "a"] }), // only b in place → partial
      p4: ans({ order: ["b", "c", "a"] }), // none in place → wrong
    };
    expect(distribution(question, answers)).toEqual([
      { key: "exact", label: "Ordine corretto", count: 1 },
      { key: "partial", label: "Parzialmente corretto", count: 2 },
      { key: "none", label: "Ordine errato", count: 1 },
    ]);
  });
});

describe("resultsSnapshot", () => {
  function session(over: Partial<RuntimeSession>): RuntimeSession {
    return {
      id: "s",
      quizId: "q",
      hostId: "h",
      pin: "000000",
      language: "it",
      title: "T",
      state: "question_results",
      currentIndex: 0,
      questionStartedAt: null,
      questions: [],
      players,
      answers: {},
      ...over,
    };
  }

  it("surfaces correctOrder for ordering so the host can show the right sequence", () => {
    const question = q({
      type: "ordering",
      options: [],
      items: [{ id: "b", text: "2" }, { id: "a", text: "1" }],
      answerSpec: { items: [{ id: "a", text: "1" }, { id: "b", text: "2" }], correctOrder: ["a", "b"] },
    });
    const rt = session({ questions: [question], answers: { 0: {} } });
    const snap = resultsSnapshot(rt, question);
    expect(snap.correctOrder).toEqual(["a", "b"]);
    expect(snap.correctOptionIds).toEqual([]); // ordering has no spec.correct
  });

  it("does not attach correctOrder for non-ordering types", () => {
    const question = q({
      type: "single_choice",
      options: [{ id: "a", text: "A" }],
      answerSpec: { options: [{ id: "a", text: "A" }], correct: ["a"] },
    });
    const rt = session({ questions: [question], answers: { 0: {} } });
    const snap = resultsSnapshot(rt, question);
    expect(snap.correctOrder).toBeUndefined();
    expect(snap.correctOptionIds).toEqual(["a"]);
  });
});

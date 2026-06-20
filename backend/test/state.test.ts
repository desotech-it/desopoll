import { describe, it, expect } from "vitest";
import { acceptsAnswers, canTransition, isTerminal, resolveHostAction } from "../src/game/state.js";

describe("canTransition", () => {
  it("allows the happy-path flow", () => {
    expect(canTransition("lobby", "question_active")).toBe(true);
    expect(canTransition("question_active", "question_results")).toBe(true);
    expect(canTransition("question_results", "question_active")).toBe(true);
    expect(canTransition("question_results", "podium")).toBe(true);
    expect(canTransition("podium", "ended")).toBe(true);
  });
  it("rejects illegal jumps", () => {
    expect(canTransition("lobby", "podium")).toBe(false);
    expect(canTransition("ended", "question_active")).toBe(false);
    expect(canTransition("question_active", "ended")).toBe(false);
  });
});

describe("isTerminal / acceptsAnswers", () => {
  it("flags terminal states", () => {
    expect(isTerminal("ended")).toBe(true);
    expect(isTerminal("aborted")).toBe(true);
    expect(isTerminal("lobby")).toBe(false);
  });
  it("accepts answers only while a question is active", () => {
    expect(acceptsAnswers("question_active")).toBe(true);
    expect(acceptsAnswers("question_results")).toBe(false);
    expect(acceptsAnswers("lobby")).toBe(false);
  });
});

describe("resolveHostAction", () => {
  it("starts from the lobby", () => {
    expect(resolveHostAction("lobby", "start", true)).toBe("question_active");
    expect(resolveHostAction("question_active", "start", true)).toBeNull();
  });
  it("locks an active question", () => {
    expect(resolveHostAction("question_active", "lock", true)).toBe("question_results");
  });
  it("advances to the next question or the podium", () => {
    expect(resolveHostAction("question_results", "next", true)).toBe("question_active");
    expect(resolveHostAction("question_results", "next", false)).toBe("podium");
    expect(resolveHostAction("scoreboard", "next", false)).toBe("podium");
  });
  it("ends from the podium", () => {
    expect(resolveHostAction("podium", "end", false)).toBe("ended");
    expect(resolveHostAction("question_active", "end", false)).toBeNull();
  });
  it("aborts any non-terminal state", () => {
    expect(resolveHostAction("question_active", "abort", true)).toBe("aborted");
    expect(resolveHostAction("ended", "abort", true)).toBeNull();
  });
});

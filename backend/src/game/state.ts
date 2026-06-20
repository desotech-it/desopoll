// Game state machine. Pure: the set of legal transitions plus helpers to validate the
// host's actions. The stateful engine consults these; tests assert the whole graph.
import type { GameState } from "./types.js";

export const TRANSITIONS: Record<GameState, GameState[]> = {
  lobby: ["question_active", "aborted"],
  question_active: ["question_results", "aborted"],
  question_results: ["question_active", "scoreboard", "podium", "aborted"],
  scoreboard: ["question_active", "podium", "aborted"],
  podium: ["ended", "aborted"],
  ended: [],
  aborted: [],
};

export function canTransition(from: GameState, to: GameState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(state: GameState): boolean {
  return state === "ended" || state === "aborted";
}

// Players may only answer while a question is live.
export function acceptsAnswers(state: GameState): boolean {
  return state === "question_active";
}

// Host actions map to a target state given the current state and whether more questions
// remain. Returns null when the action is not allowed from the current state.
export type HostAction = "start" | "lock" | "next" | "end" | "abort";

export function resolveHostAction(
  state: GameState,
  action: HostAction,
  hasMoreQuestions: boolean,
): GameState | null {
  switch (action) {
    case "start":
      return state === "lobby" ? "question_active" : null;
    case "lock":
      return state === "question_active" ? "question_results" : null;
    case "next":
      if (state !== "question_results" && state !== "scoreboard") return null;
      return hasMoreQuestions ? "question_active" : "podium";
    case "end":
      return state === "podium" ? "ended" : null;
    case "abort":
      return isTerminal(state) ? null : "aborted";
    default:
      return null;
  }
}

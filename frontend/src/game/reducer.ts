// PURE reducer for the live game. No DOM, no sockets — given the current
// snapshot and a server event it returns the next snapshot. This is the single
// source of truth for game-state transitions and is fully unit-tested.
import {
  type GameSnapshot,
  type LeaderboardEntry,
  type PersonalResult,
  type ServerEvent,
  initialSnapshot,
} from "./types";

export function reduce(state: GameSnapshot, event: ServerEvent): GameSnapshot {
  switch (event.type) {
    case "open":
      return { ...state, connected: true };

    case "close":
      return { ...state, connected: false };

    case "hello":
      return {
        ...state,
        title: event.title,
        state: event.state,
        currentIndex: event.currentIndex,
        total: event.total,
        error: null,
      };

    case "players":
      return { ...state, players: event.players, playerCount: event.count };

    case "question":
      // A new question starts: clear the previous round's results/personal data.
      return {
        ...state,
        state: "question_active",
        question: event.question,
        questionServerTime: event.serverTime,
        currentIndex: event.question.index,
        total: event.question.total,
        answeredCount: 0,
        answeredTotal: event.question.total ? state.playerCount : 0,
        results: null,
        personalById: {},
        error: null,
      };

    case "answered":
      return { ...state, answeredCount: event.count, answeredTotal: event.total };

    case "results":
      return {
        ...state,
        state: "question_results",
        results: event.results,
        personalById: event.personalById ?? {},
        leaderboard: event.results.leaderboard ?? state.leaderboard,
        answeredCount: event.results.answeredCount,
      };

    case "podium":
      return {
        ...state,
        state: "podium",
        podium: event.podium,
        leaderboard: event.leaderboard ?? state.leaderboard,
      };

    case "ended":
      return {
        ...state,
        state: "ended",
        leaderboard: event.leaderboard ?? state.leaderboard,
      };

    case "aborted":
      return {
        ...state,
        state: "aborted",
        leaderboard: event.leaderboard ?? state.leaderboard,
      };

    case "state":
      return {
        ...state,
        state: event.state,
        currentIndex: event.currentIndex,
        total: event.total,
      };

    case "joined":
      return { ...state, myPlayerId: event.playerId, error: null };

    case "error": {
      // Ignore late errors once the game is over (e.g. a post-game "session not found" from a
      // reconnect after the session was torn down): the final standings are already shown and
      // must not be replaced by a scary banner.
      const over = state.state === "podium" || state.state === "ended" || state.state === "aborted";
      return over ? state : { ...state, error: event.message };
    }

    // answer_ack / pong are acknowledged but carry no state.
    case "answer_ack":
    case "pong":
      return state;

    default:
      return state;
  }
}

// Convenience: build a fresh snapshot (used by the hook on (re)connect).
export function freshSnapshot(): GameSnapshot {
  return { ...initialSnapshot, personalById: {}, players: [], podium: [], leaderboard: [] };
}

// Read THIS player's personal result for the current round, if any.
export function personalResult(
  state: GameSnapshot,
  playerId: string | null,
): PersonalResult | null {
  if (!playerId) return null;
  return state.personalById[playerId] ?? null;
}

// Find a player's current leaderboard row (rank + score).
export function myLeaderboardRow(
  state: GameSnapshot,
  playerId: string | null,
): LeaderboardEntry | null {
  if (!playerId) return null;
  return state.leaderboard.find((r) => r.playerId === playerId) ?? null;
}

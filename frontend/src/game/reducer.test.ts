// Unit tests for the PURE game reducer. No sockets, no DOM — just (state,event)
// → state assertions covering every transition the host/player screens rely on.
import { describe, it, expect } from "vitest";
import {
  reduce,
  freshSnapshot,
  personalResult,
  myLeaderboardRow,
} from "./reducer";
import { initialSnapshot, type GameSnapshot, type ServerEvent } from "./types";

function apply(events: ServerEvent[], start: GameSnapshot = initialSnapshot): GameSnapshot {
  return events.reduce(reduce, start);
}

describe("reduce — transport events", () => {
  it("open sets connected=true, close sets connected=false", () => {
    const opened = reduce(initialSnapshot, { type: "open" });
    expect(opened.connected).toBe(true);
    const closed = reduce(opened, { type: "close" });
    expect(closed.connected).toBe(false);
  });

  it("does not mutate the input state (immutability)", () => {
    const before = { ...initialSnapshot };
    reduce(initialSnapshot, { type: "open" });
    expect(initialSnapshot).toEqual(before);
  });
});

describe("reduce — hello", () => {
  it("captures title/state/index/total and clears errors", () => {
    const withErr = reduce(initialSnapshot, { type: "error", message: "boom" });
    const s = reduce(withErr, {
      type: "hello",
      title: "Quiz AWS",
      state: "lobby",
      currentIndex: 0,
      total: 5,
    });
    expect(s.title).toBe("Quiz AWS");
    expect(s.state).toBe("lobby");
    expect(s.total).toBe(5);
    expect(s.error).toBeNull();
  });
});

describe("reduce — players", () => {
  it("stores the player list and count", () => {
    const s = reduce(initialSnapshot, {
      type: "players",
      players: [
        { id: "p1", nickname: "Ann", score: 0 },
        { id: "p2", nickname: "Bob", score: 0 },
      ],
      count: 2,
    });
    expect(s.players).toHaveLength(2);
    expect(s.playerCount).toBe(2);
    expect(s.players[1].nickname).toBe("Bob");
  });
});

describe("reduce — question", () => {
  it("enters question_active, sets question + serverTime, resets round data", () => {
    const base = apply([
      { type: "players", players: [{ id: "p1", nickname: "Ann", score: 0 }], count: 1 },
      {
        type: "results",
        results: {
          index: 0,
          correctOptionIds: ["o1"],
          distribution: [],
          answeredCount: 1,
          leaderboard: [],
        },
        personalById: { p1: { correct: true, points: 10 } },
      },
    ]);
    const s = reduce(base, {
      type: "question",
      serverTime: 1700,
      question: {
        index: 1,
        total: 3,
        type: "single_choice",
        prompt: "Capitale?",
        timeLimitSec: 20,
        options: [
          { id: "o1", text: "Roma" },
          { id: "o2", text: "Milano" },
        ],
      },
    });
    expect(s.state).toBe("question_active");
    expect(s.question?.prompt).toBe("Capitale?");
    expect(s.questionServerTime).toBe(1700);
    expect(s.currentIndex).toBe(1);
    expect(s.total).toBe(3);
    // round reset:
    expect(s.answeredCount).toBe(0);
    expect(s.results).toBeNull();
    expect(s.personalById).toEqual({});
    // answeredTotal seeded from playerCount:
    expect(s.answeredTotal).toBe(1);
  });
});

describe("reduce — answered", () => {
  it("updates the live answered count/total", () => {
    const s = reduce(initialSnapshot, { type: "answered", count: 3, total: 10 });
    expect(s.answeredCount).toBe(3);
    expect(s.answeredTotal).toBe(10);
  });
});

describe("reduce — results", () => {
  it("enters question_results and stores distribution + leaderboard + personal map", () => {
    const s = reduce(initialSnapshot, {
      type: "results",
      results: {
        index: 0,
        correctOptionIds: ["o1"],
        distribution: [
          { key: "o1", label: "Roma", count: 4 },
          { key: "o2", label: "Milano", count: 1 },
        ],
        answeredCount: 5,
        leaderboard: [
          { playerId: "p1", nickname: "Ann", score: 10, rank: 1 },
          { playerId: "p2", nickname: "Bob", score: 0, rank: 2 },
        ],
      },
      personalById: {
        p1: { correct: true, points: 10 },
        p2: { correct: false, points: 0 },
      },
    });
    expect(s.state).toBe("question_results");
    expect(s.results?.distribution).toHaveLength(2);
    expect(s.answeredCount).toBe(5);
    expect(s.leaderboard).toHaveLength(2);
    expect(s.personalById.p1.points).toBe(10);
  });

  it("personalResult reads THIS player's row from personalById", () => {
    const s = reduce(initialSnapshot, {
      type: "results",
      results: { index: 0, correctOptionIds: [], distribution: [], answeredCount: 1, leaderboard: [] },
      personalById: { p1: { correct: true, points: 7 }, p2: { correct: false, points: 0 } },
    });
    expect(personalResult(s, "p1")).toEqual({ correct: true, points: 7 });
    expect(personalResult(s, "p2")).toEqual({ correct: false, points: 0 });
    expect(personalResult(s, "missing")).toBeNull();
    expect(personalResult(s, null)).toBeNull();
  });

  it("tolerates a missing personalById (defaults to empty)", () => {
    const s = reduce(initialSnapshot, {
      type: "results",
      results: { index: 0, correctOptionIds: [], distribution: [], answeredCount: 0, leaderboard: [] },
      personalById: undefined as unknown as Record<string, never>,
    });
    expect(s.personalById).toEqual({});
  });
});

describe("reduce — podium / ended / aborted", () => {
  it("podium stores top-3 and full leaderboard", () => {
    const s = reduce(initialSnapshot, {
      type: "podium",
      podium: [
        { playerId: "p1", nickname: "Ann", score: 30, rank: 1 },
        { playerId: "p2", nickname: "Bob", score: 20, rank: 2 },
        { playerId: "p3", nickname: "Cy", score: 10, rank: 3 },
      ],
      leaderboard: [{ playerId: "p1", nickname: "Ann", score: 30, rank: 1 }],
    });
    expect(s.state).toBe("podium");
    expect(s.podium).toHaveLength(3);
    expect(s.podium[0].rank).toBe(1);
    expect(s.leaderboard).toHaveLength(1);
  });

  it("ended sets state=ended and keeps leaderboard", () => {
    const s = reduce(initialSnapshot, {
      type: "ended",
      leaderboard: [{ playerId: "p1", nickname: "Ann", score: 30, rank: 1 }],
    });
    expect(s.state).toBe("ended");
    expect(s.leaderboard[0].nickname).toBe("Ann");
  });

  it("aborted sets state=aborted", () => {
    const s = reduce(initialSnapshot, { type: "aborted", leaderboard: [] });
    expect(s.state).toBe("aborted");
  });
});

describe("reduce — state / joined / error / acks", () => {
  it("state event updates state + index + total", () => {
    const s = reduce(initialSnapshot, {
      type: "state",
      state: "question_active",
      currentIndex: 2,
      total: 4,
    });
    expect(s.state).toBe("question_active");
    expect(s.currentIndex).toBe(2);
    expect(s.total).toBe(4);
  });

  it("joined stores myPlayerId and clears error", () => {
    const withErr = reduce(initialSnapshot, { type: "error", message: "x" });
    const s = reduce(withErr, { type: "joined", playerId: "p42" });
    expect(s.myPlayerId).toBe("p42");
    expect(s.error).toBeNull();
  });

  it("error stores the message", () => {
    const s = reduce(initialSnapshot, { type: "error", message: "PIN scaduto" });
    expect(s.error).toBe("PIN scaduto");
  });

  it("ignores a late error once the game is over (post-game 'session not found')", () => {
    for (const over of ["podium", "ended", "aborted"] as const) {
      const ended = reduce(initialSnapshot, { type: over === "podium" ? "podium" : over, leaderboard: [], podium: [] } as ServerEvent);
      const after = reduce(ended, { type: "error", message: "session not found" });
      expect(after.error).toBeNull();
    }
  });

  it("answer_ack and pong leave state unchanged", () => {
    const base = reduce(initialSnapshot, { type: "joined", playerId: "p1" });
    expect(reduce(base, { type: "answer_ack" })).toBe(base);
    expect(reduce(base, { type: "pong" })).toBe(base);
  });
});

describe("full game flow (integration over the reducer)", () => {
  it("lobby → question → answered → results → question → podium → ended", () => {
    let s = freshSnapshot();
    s = reduce(s, { type: "open" });
    s = reduce(s, { type: "hello", title: "Q", state: "lobby", currentIndex: 0, total: 2 });
    s = reduce(s, {
      type: "players",
      players: [{ id: "p1", nickname: "Ann", score: 0 }],
      count: 1,
    });
    s = reduce(s, { type: "joined", playerId: "p1" });
    s = reduce(s, {
      type: "question",
      serverTime: 1,
      question: { index: 0, total: 2, type: "true_false", prompt: "Vero?", timeLimitSec: 10, options: [] },
    });
    expect(s.state).toBe("question_active");
    s = reduce(s, { type: "answered", count: 1, total: 1 });
    expect(s.answeredCount).toBe(1);
    s = reduce(s, {
      type: "results",
      results: {
        index: 0,
        correctOptionIds: [],
        correctBoolean: true,
        distribution: [{ key: "true", label: "Vero", count: 1 }],
        answeredCount: 1,
        leaderboard: [{ playerId: "p1", nickname: "Ann", score: 10, rank: 1 }],
      },
      personalById: { p1: { correct: true, points: 10 } },
    });
    expect(s.state).toBe("question_results");
    expect(personalResult(s, "p1")?.correct).toBe(true);
    expect(myLeaderboardRow(s, "p1")?.rank).toBe(1);
    s = reduce(s, {
      type: "podium",
      podium: [{ playerId: "p1", nickname: "Ann", score: 10, rank: 1 }],
      leaderboard: [{ playerId: "p1", nickname: "Ann", score: 10, rank: 1 }],
    });
    expect(s.state).toBe("podium");
    s = reduce(s, { type: "ended", leaderboard: s.leaderboard });
    expect(s.state).toBe("ended");
    expect(myLeaderboardRow(s, "p1")?.score).toBe(10);
  });
});

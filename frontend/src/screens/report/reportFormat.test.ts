// Tests for the pure report formatting/aggregation helpers.
import { describe, it, expect } from "vitest";
import type { ReportQuestionStat, SessionReport } from "../../api";
import {
  answeredLabel,
  averageCorrectPct,
  gameDuration,
  isScored,
  pct,
  sortedDistribution,
  totalAnswers,
  winner,
} from "./reportFormat";

function stat(p: Partial<ReportQuestionStat>): ReportQuestionStat {
  return {
    questionId: "q",
    prompt: "?",
    type: "single_choice",
    answeredCount: 0,
    correctCount: 0,
    correctPct: 0,
    distribution: [],
    ...p,
  };
}

describe("pct", () => {
  it("rounds and clamps to 0..100", () => {
    expect(pct(49.4)).toBe(49);
    expect(pct(49.6)).toBe(50);
    expect(pct(-5)).toBe(0);
    expect(pct(150)).toBe(100);
  });
  it("guards NaN/Infinity → 0", () => {
    expect(pct(NaN)).toBe(0);
    expect(pct(Infinity)).toBe(0);
  });
});

describe("isScored", () => {
  it("treats poll and word_cloud as surveys (not scored)", () => {
    expect(isScored("poll")).toBe(false);
    expect(isScored("word_cloud")).toBe(false);
  });
  it("treats every other type as scored", () => {
    for (const t of ["single_choice", "numeric", "slider", "ordering", "true_false", "open_text"]) {
      expect(isScored(t)).toBe(true);
    }
  });
});

describe("averageCorrectPct", () => {
  it("averages only scored questions", () => {
    const qs = [
      stat({ type: "single_choice", correctPct: 100 }),
      stat({ type: "numeric", correctPct: 50 }),
      stat({ type: "poll", correctPct: 0 }), // ignored
      stat({ type: "word_cloud", correctPct: 0 }), // ignored
    ];
    expect(averageCorrectPct(qs)).toBe(75);
  });
  it("returns 0 when there are no scored questions", () => {
    expect(averageCorrectPct([stat({ type: "poll" }), stat({ type: "word_cloud" })])).toBe(0);
    expect(averageCorrectPct([])).toBe(0);
  });
});

describe("answeredLabel", () => {
  it("uses the larger of answeredCount and playerCount as total", () => {
    expect(answeredLabel(stat({ answeredCount: 3 }), 5)).toBe("3 / 5 hanno risposto");
    // late joiners: more answers than the final player count → don't go negative
    expect(answeredLabel(stat({ answeredCount: 7 }), 5)).toBe("7 / 7 hanno risposto");
  });
});

describe("winner", () => {
  it("returns the rank-1 standing", () => {
    const w = winner([
      { nickname: "B", score: 10, rank: 2 },
      { nickname: "A", score: 20, rank: 1 },
    ]);
    expect(w?.nickname).toBe("A");
  });
  it("returns null when there are no standings", () => {
    expect(winner([])).toBeNull();
  });
});

describe("totalAnswers", () => {
  it("sums per-question answered counts", () => {
    expect(totalAnswers([stat({ answeredCount: 4 }), stat({ answeredCount: 6 })])).toBe(10);
  });
});

describe("sortedDistribution", () => {
  it("sorts buckets by count desc, ties by label", () => {
    const s = stat({
      distribution: [
        { key: "a", label: "Alpha", count: 2 },
        { key: "b", label: "Bravo", count: 5 },
        { key: "c", label: "Charlie", count: 2 },
      ],
    });
    expect(sortedDistribution(s).map((b) => b.key)).toEqual(["b", "a", "c"]);
  });
});

describe("gameDuration", () => {
  function report(startedAt: string | null, endedAt: string | null): SessionReport {
    return {
      session: { id: "s", quizId: "q", state: "ended", startedAt, endedAt, playerCount: 0 },
      questions: [],
      standings: [],
    };
  }
  it("formats minutes + seconds", () => {
    expect(gameDuration(report("2026-01-01T00:00:00Z", "2026-01-01T00:02:05Z"))).toBe("2m 05s");
  });
  it("formats sub-minute durations as seconds", () => {
    expect(gameDuration(report("2026-01-01T00:00:00Z", "2026-01-01T00:00:42Z"))).toBe("42s");
  });
  it("returns — when timestamps are missing or inverted", () => {
    expect(gameDuration(report(null, "2026-01-01T00:00:42Z"))).toBe("—");
    expect(gameDuration(report("2026-01-01T00:01:00Z", "2026-01-01T00:00:00Z"))).toBe("—");
  });
});

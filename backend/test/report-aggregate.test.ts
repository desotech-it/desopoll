import { describe, it, expect } from "vitest";
import {
  buildReport,
  buildQuestionStats,
  buildStandings,
  type ReportAnswerRow,
  type ReportPlayerRow,
  type ReportQuestionRow,
} from "../src/routes/report-aggregate.js";

function ans(partial: Partial<ReportAnswerRow>): ReportAnswerRow {
  return {
    question_id: "q1",
    player_id: "p1",
    payload: {},
    is_correct: null,
    points_awarded: 0,
    ...partial,
  };
}

describe("buildStandings", () => {
  it("sorts by score desc, ties by nickname, ranks 1..n", () => {
    const players: ReportPlayerRow[] = [
      { id: "p1", nickname: "Ada", score: 1500 },
      { id: "p2", nickname: "Bo", score: 2200 },
      { id: "p3", nickname: "Cy", score: 2200 },
    ];
    expect(buildStandings(players)).toEqual([
      { nickname: "Bo", score: 2200, rank: 1 },
      { nickname: "Cy", score: 2200, rank: 2 },
      { nickname: "Ada", score: 1500, rank: 3 },
    ]);
  });
  it("returns an empty list for no players", () => {
    expect(buildStandings([])).toEqual([]);
  });
});

describe("buildQuestionStats", () => {
  const questions: ReportQuestionRow[] = [
    {
      id: "q2",
      position: 2,
      type: "single_choice",
      prompt: "Capital of Italy?",
      answer_spec: { options: [{ id: "a", text: "Roma" }, { id: "b", text: "Milano" }], correct: ["a"] },
    },
    {
      id: "q1",
      position: 1,
      type: "true_false",
      prompt: "Sky is blue",
      answer_spec: { correct: true },
    },
  ];

  it("returns questions in position order", () => {
    const stats = buildQuestionStats(questions, []);
    expect(stats.map((s) => s.questionId)).toEqual(["q1", "q2"]);
  });

  it("counts answered/correct and computes correctPct + distribution", () => {
    const answers: ReportAnswerRow[] = [
      ans({ question_id: "q2", player_id: "p1", payload: { optionId: "a" }, is_correct: true, points_awarded: 1000 }),
      ans({ question_id: "q2", player_id: "p2", payload: { optionId: "b" }, is_correct: false }),
      ans({ question_id: "q2", player_id: "p3", payload: { optionId: "a" }, is_correct: true, points_awarded: 900 }),
    ];
    const stats = buildQuestionStats(questions, answers);
    const q2 = stats.find((s) => s.questionId === "q2")!;
    expect(q2.answeredCount).toBe(3);
    expect(q2.correctCount).toBe(2);
    expect(q2.correctPct).toBe(67); // round(2/3 * 100)
    expect(q2.distribution).toEqual([
      { key: "a", label: "Roma", count: 2 },
      { key: "b", label: "Milano", count: 1 },
    ]);
  });

  it("reports zeros (not NaN) for a question nobody answered", () => {
    const stats = buildQuestionStats(questions, []);
    const q1 = stats.find((s) => s.questionId === "q1")!;
    expect(q1.answeredCount).toBe(0);
    expect(q1.correctCount).toBe(0);
    expect(q1.correctPct).toBe(0);
    // true_false always yields both buckets, even at zero counts.
    expect(q1.distribution).toEqual([
      { key: "true", label: "Vero", count: 0 },
      { key: "false", label: "Falso", count: 0 },
    ]);
  });

  it("aggregates a word_cloud question by word frequency", () => {
    const wc: ReportQuestionRow[] = [
      { id: "wc", position: 1, type: "word_cloud", prompt: "One word?", answer_spec: {} },
    ];
    const answers: ReportAnswerRow[] = [
      ans({ question_id: "wc", player_id: "p1", payload: { text: "fast" } }),
      ans({ question_id: "wc", player_id: "p2", payload: { text: " fast " } }),
      ans({ question_id: "wc", player_id: "p3", payload: { text: "slow" } }),
    ];
    const stats = buildQuestionStats(wc, answers);
    expect(stats[0].correctCount).toBe(0); // survey: never correct
    expect(stats[0].distribution).toEqual([
      { key: "fast", label: "fast", count: 2 },
      { key: "slow", label: "slow", count: 1 },
    ]);
  });

  it("buckets numeric answers by value", () => {
    const num: ReportQuestionRow[] = [
      { id: "n", position: 1, type: "numeric", prompt: "Guess", answer_spec: { answer: 10, tolerance: 0 } },
    ];
    const answers: ReportAnswerRow[] = [
      ans({ question_id: "n", player_id: "p1", payload: { value: 10 }, is_correct: true }),
      ans({ question_id: "n", player_id: "p2", payload: { value: 10 }, is_correct: true }),
      ans({ question_id: "n", player_id: "p3", payload: { value: 99 }, is_correct: false }),
    ];
    const stats = buildQuestionStats(num, answers);
    expect(stats[0].correctCount).toBe(2);
    expect(stats[0].correctPct).toBe(67);
    expect(stats[0].distribution).toEqual([
      { key: "10", label: "10", count: 2 },
      { key: "99", label: "99", count: 1 },
    ]);
  });
});

describe("buildReport", () => {
  it("assembles questions + standings together", () => {
    const questions: ReportQuestionRow[] = [
      { id: "q1", position: 1, type: "true_false", prompt: "?", answer_spec: { correct: true } },
    ];
    const answers: ReportAnswerRow[] = [
      ans({ question_id: "q1", player_id: "p1", payload: { value: true }, is_correct: true, points_awarded: 1000 }),
    ];
    const players: ReportPlayerRow[] = [
      { id: "p1", nickname: "Ada", score: 1000 },
      { id: "p2", nickname: "Bo", score: 0 },
    ];
    const report = buildReport(questions, answers, players);
    expect(report.questions).toHaveLength(1);
    expect(report.questions[0].correctCount).toBe(1);
    expect(report.standings).toEqual([
      { nickname: "Ada", score: 1000, rank: 1 },
      { nickname: "Bo", score: 0, rank: 2 },
    ]);
  });
});

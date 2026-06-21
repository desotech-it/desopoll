// PURE formatting + light aggregation helpers for the post-game report screen.
// No DOM, no I/O → unit-tested. The backend already computes correctPct,
// distributions and standings; these helpers only shape them for display.
import type { ReportQuestionStat, ReportStanding, SessionReport } from "../../api";
import i18n from "../../i18n";

// Clamp + round a 0..100 percentage for display (guards NaN/Infinity → 0).
export function pct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Localized "12 / 20 hanno risposto" style answered fraction (reuses the live
// game's answeredPill key so host + report stay consistent across languages).
export function answeredLabel(stat: ReportQuestionStat, playerCount: number): string {
  const total = Math.max(stat.answeredCount, playerCount);
  return i18n.t("common.answeredPill", { ns: "game", count: stat.answeredCount, total }) as string;
}

// Whether a question type carries a notion of "correct" (so the correct % is
// meaningful). Polls and word clouds are surveys → no correctness.
export function isScored(type: string): boolean {
  return type !== "poll" && type !== "word_cloud";
}

// Average correct % across all SCORED questions (0 when there are none).
export function averageCorrectPct(questions: ReportQuestionStat[]): number {
  const scored = questions.filter((q) => isScored(q.type));
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, q) => acc + pct(q.correctPct), 0);
  return Math.round(sum / scored.length);
}

// The single winner (rank 1), if any standings exist.
export function winner(standings: ReportStanding[]): ReportStanding | null {
  return standings.find((s) => s.rank === 1) ?? standings[0] ?? null;
}

// Total answers submitted across the whole game (sum of per-question answered).
export function totalAnswers(questions: ReportQuestionStat[]): number {
  return questions.reduce((acc, q) => acc + Math.max(0, q.answeredCount), 0);
}

// Format an ISO timestamp range into a short Italian duration, or "—".
export function gameDuration(report: SessionReport): string {
  const { startedAt, endedAt } = report.session;
  if (!startedAt || !endedAt) return "—";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
}

// Sort distribution buckets descending by count (stable for ties via label).
export function sortedDistribution(stat: ReportQuestionStat) {
  return stat.distribution
    .slice()
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

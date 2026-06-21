// Pure builders for the payloads broadcast to clients. No I/O → unit-tested. They also
// enforce the anti-cheat boundary: the player-facing question NEVER includes correctness.
import type { RuntimeAnswer, RuntimePlayer, RuntimeQuestion, RuntimeSession } from "./runtime.js";

export interface PublicQuestion {
  index: number;
  total: number;
  type: string;
  prompt: string;
  image: unknown | null;
  timeLimitSec: number;
  options: { id: string; text: string }[];
}

export interface LeaderboardRow {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
}

export interface DistributionBucket {
  key: string; // optionId, "true"/"false", or text
  label: string;
  count: number;
}

// Strip everything correctness-related before sending a question to players.
export function publicQuestion(q: RuntimeQuestion, total: number): PublicQuestion {
  return {
    index: q.index,
    total,
    type: q.type,
    prompt: q.prompt,
    image: q.image ?? null,
    timeLimitSec: q.timeLimitSec,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

export function leaderboard(players: Record<string, RuntimePlayer>): LeaderboardRow[] {
  const rows = Object.values(players)
    .slice()
    .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
  return rows.map((p, i) => ({ playerId: p.id, nickname: p.nickname, score: p.score, rank: i + 1 }));
}

export function podium(players: Record<string, RuntimePlayer>): LeaderboardRow[] {
  return leaderboard(players).slice(0, 3);
}

// Tally a list of string keys into the top-N descending buckets (used for free-text /
// word_cloud frequencies and numeric value buckets). Blank keys are skipped.
function frequencyBuckets(keys: string[], topN = 8): DistributionBucket[] {
  const counts = new Map<string, number>();
  for (const k of keys) {
    const t = k.trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([label, count]) => ({ key: label, label, count }));
}

// Count answers per choice/value for the results screen. open_text and word_cloud are
// summarized by text frequency; numeric/slider are bucketed by their numeric value.
export function distribution(
  q: RuntimeQuestion,
  answers: Record<string, RuntimeAnswer>,
): DistributionBucket[] {
  const values = Object.values(answers);
  if (q.type === "true_false") {
    const buckets = { true: 0, false: 0 };
    for (const a of values) {
      const v = (a.payload as { value?: boolean })?.value;
      if (v === true) buckets.true++;
      else if (v === false) buckets.false++;
    }
    return [
      { key: "true", label: "Vero", count: buckets.true },
      { key: "false", label: "Falso", count: buckets.false },
    ];
  }
  if (q.type === "open_text" || q.type === "word_cloud") {
    return frequencyBuckets(values.map((a) => String((a.payload as { text?: unknown })?.text ?? "")));
  }
  if (q.type === "numeric" || q.type === "slider") {
    // Bucket by the submitted numeric value (rendered as its string label).
    const keys: string[] = [];
    for (const a of values) {
      const v = (a.payload as { value?: unknown })?.value;
      if (typeof v === "number" && Number.isFinite(v)) keys.push(String(v));
    }
    return frequencyBuckets(keys);
  }
  // single_choice / multiple_choice / poll — count per option id.
  return q.options.map((o) => {
    let count = 0;
    for (const a of values) {
      const p = a.payload as { optionId?: string; optionIds?: string[] };
      if (p?.optionId === o.id) count++;
      else if (Array.isArray(p?.optionIds) && p.optionIds.includes(o.id)) count++;
    }
    return { key: o.id, label: o.text, count };
  });
}

export interface ResultsSnapshot {
  index: number;
  correctOptionIds: string[];
  correctBoolean?: boolean;
  distribution: DistributionBucket[];
  answeredCount: number;
  leaderboard: LeaderboardRow[];
}

// Results screen: distribution + which answer was right + standings.
export function resultsSnapshot(rt: RuntimeSession, q: RuntimeQuestion): ResultsSnapshot {
  const answers = rt.answers[q.index] ?? {};
  const spec = q.answerSpec as { correct?: unknown };
  const correctOptionIds = Array.isArray(spec.correct) ? (spec.correct as string[]) : [];
  const correctBoolean = typeof spec.correct === "boolean" ? spec.correct : undefined;
  return {
    index: q.index,
    correctOptionIds,
    correctBoolean,
    distribution: distribution(q, answers),
    answeredCount: Object.keys(answers).length,
    leaderboard: leaderboard(rt.players),
  };
}

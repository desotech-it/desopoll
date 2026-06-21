// Shared presentational pieces for the live game (host + player screens).
// Pure-ish: props in, JSX out. Inline styles, reusing the ui.tsx tokens.
import React from "react";
import { useTranslation } from "react-i18next";
import {
  glass,
  glassSoft,
  ShapeBadge,
  SHAPES,
  tokens,
} from "../ui";
import type {
  DistributionEntry,
  LeaderboardEntry,
  LiveQuestion,
  PodiumEntry,
} from "./types";

// Full-screen pastel game stage (centered column).
export function GameStage({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.bg,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        color: tokens.ink,
        padding: 20,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

// Big circular countdown badge.
export function Countdown({ seconds }: { seconds: number | null }) {
  const danger = seconds !== null && seconds <= 5;
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        ...glass,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        fontWeight: 800,
        color: danger ? "#c0556a" : tokens.brandInk,
      }}
    >
      {seconds ?? "—"}
    </div>
  );
}

// Question prompt header card (used on host + player active screens).
export function QuestionHeader({
  question,
  right,
}: {
  question: LiveQuestion;
  right?: React.ReactNode;
}) {
  const { t } = useTranslation("game");
  return (
    <div style={{ ...glass, padding: "20px 22px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: tokens.brandInk }}>
          {t("common.questionProgress", { current: question.index + 1, total: question.total })}
        </div>
        {right}
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "10px 0 0", lineHeight: 1.25 }}>
        {question.prompt || "—"}
      </h1>
      <QuestionImage src={question.image} />
    </div>
  );
}

// Question image (when present). Shared by the active-question header and the
// results screens (host + player). Renders nothing when there is no image.
export function QuestionImage({
  src,
  maxHeight = 220,
}: {
  src?: string | null;
  maxHeight?: number;
}) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      style={{ marginTop: 14, maxHeight, maxWidth: "100%", borderRadius: 14, objectFit: "contain" }}
    />
  );
}

// Answered count pill: "12 / 20 hanno risposto".
export function AnsweredPill({ count, total }: { count: number; total: number }) {
  const { t } = useTranslation("game");
  return (
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: tokens.brandInk,
        background: "rgba(168,144,235,.18)",
        borderRadius: 999,
        padding: "6px 14px",
        whiteSpace: "nowrap",
      }}
    >
      {t("common.answeredPill", { count, total })}
    </span>
  );
}

// Distribution bars for the results screen. Highlights the correct option(s).
export function Distribution({
  distribution,
  correctKeys,
}: {
  distribution: DistributionEntry[];
  correctKeys: Set<string>;
}) {
  const max = Math.max(1, ...distribution.map((d) => d.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {distribution.map((d, i) => {
        const correct = correctKeys.has(d.key);
        const shape = SHAPES[i % 4];
        const pct = Math.round((d.count / max) * 100);
        return (
          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: correct ? "#2f7d54" : tokens.ink2,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {correct && <span aria-hidden>✓</span>}
                  {d.label}
                </span>
                <span>{d.count}</span>
              </div>
              <div
                style={{
                  height: 16,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.45)",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.6)",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: correct ? "rgba(152,226,182,.85)" : shape.bg,
                    transition: "width .4s ease",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact leaderboard list.
export function Leaderboard({
  rows,
  highlightId,
  limit,
}: {
  rows: LeaderboardEntry[];
  highlightId?: string | null;
  limit?: number;
}) {
  const { t } = useTranslation("game");
  const shown = limit ? rows.slice(0, limit) : rows;
  if (shown.length === 0) {
    return <p style={{ color: tokens.muted, fontSize: 14, margin: 0 }}>{t("common.noScoresYet")}</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {shown.map((r) => {
        const me = highlightId && r.playerId === highlightId;
        return (
          <div
            key={r.playerId}
            style={{
              ...glassSoft,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              border: me ? "1px solid rgba(141,131,228,.6)" : glassSoft.border,
            }}
          >
            <span style={{ width: 26, fontWeight: 800, color: tokens.brandInk }}>{r.rank}</span>
            <span style={{ flex: 1, fontWeight: 600, color: tokens.ink }}>
              {r.nickname}
              {me && <span style={{ color: tokens.brandInk, fontWeight: 700 }}>{t("common.you")}</span>}
            </span>
            <span style={{ fontWeight: 800, color: tokens.ink2 }}>{r.score}</span>
          </div>
        );
      })}
    </div>
  );
}

// Top-3 stylized podium.
export function Podium({ podium }: { podium: PodiumEntry[] }) {
  const order = [1, 0, 2]; // 2nd, 1st, 3rd visual order
  const heights = [120, 160, 96];
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14, marginBottom: 8 }}>
      {order.map((rankIdx) => {
        const entry = podium.find((p) => p.rank === rankIdx + 1);
        if (!entry) return <div key={rankIdx} style={{ width: 110 }} />;
        return (
          <div key={entry.playerId} style={{ width: 130, textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 4 }}>{medals[rankIdx]}</div>
            <div style={{ fontWeight: 700, marginBottom: 2, color: tokens.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.nickname}
            </div>
            <div style={{ fontSize: 13, color: tokens.brandInk, fontWeight: 700, marginBottom: 8 }}>{entry.score} pt</div>
            <div
              style={{
                ...glass,
                height: heights[rankIdx],
                borderRadius: "16px 16px 8px 8px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 10,
                fontSize: 22,
                fontWeight: 800,
                color: tokens.brandInk,
              }}
            >
              {entry.rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Answer-option marker re-export so screens import from one place.
export { ShapeBadge };

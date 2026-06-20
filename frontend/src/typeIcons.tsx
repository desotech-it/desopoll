// Distinct inline-SVG icons per question type. Each type has its OWN glyph so a
// mixed list of questions is easy to scan, and so they are NOT confused with the
// four answer-option shapes (triangle/diamond/circle/square) used in the game.
import React from "react";
import type { QuestionType } from "./api";
import { Chip, tokens } from "./ui";
import { typeIconKey, typeMeta, type TypeIconKey } from "./questionTypes";

// Raw glyph for an icon key. `currentColor` so callers control the tint.
export function TypeIconGlyph({ icon, size = 18 }: { icon: TypeIconKey; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (icon) {
    case "single":
      // A single filled radio dot inside a ring.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "multi":
      // Stacked checkboxes (two ticked rows).
      return (
        <svg {...common}>
          <rect x="3" y="4" width="7" height="7" rx="1.5" />
          <polyline points="4.6 7.5 6 8.9 8.4 5.6" />
          <rect x="3" y="13" width="7" height="7" rx="1.5" />
          <polyline points="4.6 16.5 6 17.9 8.4 14.6" />
          <line x1="13" y1="7.5" x2="21" y2="7.5" />
          <line x1="13" y1="16.5" x2="21" y2="16.5" />
        </svg>
      );
    case "truefalse":
      // A toggle switch (T/F).
      return (
        <svg {...common}>
          <rect x="2" y="7" width="20" height="10" rx="5" />
          <circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "poll":
      // Bar chart (three rising bars).
      return (
        <svg {...common}>
          <line x1="6" y1="20" x2="6" y2="13" />
          <line x1="12" y1="20" x2="12" y2="8" />
          <line x1="18" y1="20" x2="18" y2="4" />
        </svg>
      );
    case "text":
      // Text cursor / "T" with an I-beam caret.
      return (
        <svg {...common}>
          <path d="M9 4h6M9 20h6M12 4v16" />
          <path d="M5 4h2M5 20h2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

const TONE_COLOR: Record<string, string> = {
  violet: "#6d54b4",
  teal: "#2f7a73",
  amber: "#9a6a1a",
  rose: "#a03050",
  sky: "#1a5a8a",
  green: "#2a6a40",
};
const TONE_BG: Record<string, string> = {
  violet: "rgba(168,144,235,.20)",
  teal: "rgba(120,210,196,.22)",
  amber: "rgba(255,205,120,.26)",
  rose: "rgba(255,150,170,.22)",
  sky: "rgba(130,190,255,.26)",
  green: "rgba(120,210,150,.22)",
};

// Colored square badge wrapping the per-type glyph (used in the type picker and
// the per-question header). Color comes from the type's `tone`.
export function TypeIcon({ type, size = 40 }: { type: QuestionType; size?: number }) {
  const meta = typeMeta(type);
  const tone = meta?.tone ?? "violet";
  return (
    <span
      style={{
        flex: "0 0 auto",
        width: size,
        height: size,
        borderRadius: 12,
        background: TONE_BG[tone] ?? TONE_BG.violet,
        color: TONE_COLOR[tone] ?? tokens.brandInk,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      <TypeIconGlyph icon={typeIconKey(type)} size={Math.round(size * 0.55)} />
    </span>
  );
}

// Inline chip with the per-type glyph + name, toned per type (question header).
export function TypeChip({ type, name }: { type: QuestionType; name: string }) {
  const tone = typeMeta(type)?.tone ?? "violet";
  return (
    <Chip tone={tone}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <TypeIconGlyph icon={typeIconKey(type)} size={13} />
        {name}
      </span>
    </Chip>
  );
}

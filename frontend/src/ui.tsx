// Shared design tokens + small UI primitives for the desopoll frontend.
// Apple "liquid glass", pastel, LIGHT theme only. Matches the HTML mockups.
import React from "react";

// ---- Color tokens ----
export const tokens = {
  bg: "linear-gradient(135deg,#e9ecfb 0%,#f3edfb 45%,#e9f8f1 75%,#fbeef3 100%)",
  ink: "#2b2a3c",
  ink2: "#4a4960",
  ink3: "#6b6982",
  muted: "#6b6982",
  hint: "#9a98ad",
  brand: "#8d83e4",
  brandInk: "#7268c8",
  border: "rgba(255,255,255,0.7)",
  hl: "inset 0 1px 0 rgba(255,255,255,0.85)",
  shadow: "0 24px 60px rgba(90,80,150,0.2)",
};

// The 4 answer/brand shapes & colors (triangle/diamond/circle/square).
export const SHAPES = [
  { key: "a", color: "#c0556a", bg: "rgba(255,158,158,.34)" }, // triangle / coral
  { key: "b", color: "#3f6fb5", bg: "rgba(150,184,255,.36)" }, // diamond / blue
  { key: "c", color: "#9a7016", bg: "rgba(255,213,128,.42)" }, // circle / amber
  { key: "d", color: "#2f7d54", bg: "rgba(152,226,182,.42)" }, // square / green
] as const;

// ---- Style objects ----
export const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(26px) saturate(160%)",
  WebkitBackdropFilter: "blur(26px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.7)",
  borderRadius: 22,
  boxShadow: "0 24px 60px rgba(90,80,150,0.2), inset 0 1px 0 rgba(255,255,255,0.85)",
};

export const glassSoft: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(22px) saturate(170%)",
  WebkitBackdropFilter: "blur(22px) saturate(170%)",
  border: "1px solid rgba(255,255,255,0.5)",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(70,58,140,.12), inset 0 1px 0 rgba(255,255,255,.85)",
};

export const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  border: "none",
  borderRadius: 14,
  padding: "11px 22px",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  textDecoration: "none",
  cursor: "pointer",
  background: "linear-gradient(135deg,#bdb7f3,#9890ea)",
  boxShadow: "0 12px 28px rgba(152,144,234,0.34), inset 0 1px 0 rgba(255,255,255,0.5)",
};

export const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid rgba(255,255,255,0.8)",
  borderRadius: 12,
  padding: "6px 13px",
  fontSize: 13,
  fontWeight: 600,
  color: "#7268c8",
  background: "rgba(255,255,255,0.6)",
  cursor: "pointer",
  textDecoration: "none",
};

export const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: "#c0556a",
  background: "rgba(192,85,106,0.08)",
  border: "1px solid rgba(192,85,106,0.22)",
};

export const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  color: tokens.ink,
  background: "rgba(255,255,255,0.6)",
  border: "1px solid rgba(255,255,255,0.7)",
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
  width: "100%",
  boxSizing: "border-box",
};

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: tokens.ink2,
  marginBottom: 6,
};

export const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  margin: 0,
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  color: tokens.ink,
  background: tokens.bg,
  WebkitFontSmoothing: "antialiased",
};

// ---- SVG shape glyphs (the 4 markers) ----
export function ShapeGlyph({ index, size = 18 }: { index: number; size?: number }) {
  const k = index % 4;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {k === 0 ? (
        <path d="M12 4 L21 20 H3 Z" fill="currentColor" />
      ) : k === 1 ? (
        <path d="M12 3 L21 12 L12 21 L3 12 Z" fill="currentColor" />
      ) : k === 2 ? (
        <circle cx="12" cy="12" r="9" fill="currentColor" />
      ) : (
        <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" />
      )}
    </svg>
  );
}

// Colored badge wrapper around a shape glyph (used as answer-option marker).
export function ShapeBadge({ index, size = 36 }: { index: number; size?: number }) {
  const s = SHAPES[index % 4];
  return (
    <span
      style={{
        flex: "0 0 auto",
        width: size,
        height: size,
        borderRadius: 12,
        background: s.bg,
        color: s.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
      }}
    >
      <ShapeGlyph index={index} size={Math.round(size / 2)} />
    </span>
  );
}

// Brand wordmark with the 4 shapes (used in top bar / login).
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span style={{ display: "inline-flex", gap: 5 }}>
        {SHAPES.map((s, i) => (
          <span
            key={s.key}
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              background: s.bg,
              color: s.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShapeGlyph index={i} size={13} />
          </span>
        ))}
      </span>
      <span style={{ fontSize: size, fontWeight: 700, letterSpacing: -0.5, color: tokens.brandInk }}>
        polling
      </span>
    </span>
  );
}

// Small status / type chip.
export function Chip({
  children,
  tone = "violet",
}: {
  children: React.ReactNode;
  tone?: "violet" | "teal" | "amber" | "rose" | "sky" | "green";
}) {
  const map: Record<string, { c: string; bg: string }> = {
    violet: { c: "#6d54b4", bg: "rgba(168,144,235,.20)" },
    teal: { c: "#2f7a73", bg: "rgba(120,210,196,.22)" },
    amber: { c: "#9a6a1a", bg: "rgba(255,205,120,.26)" },
    rose: { c: "#a03050", bg: "rgba(255,150,170,.22)" },
    sky: { c: "#1a5a8a", bg: "rgba(130,190,255,.26)" },
    green: { c: "#2a6a40", bg: "rgba(120,210,150,.22)" },
  };
  const t = map[tone];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 999,
        padding: "4px 11px",
        color: t.c,
        background: t.bg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// Loading + error helpers.
export function Spinner({ label = "Caricamento…" }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: tokens.ink3,
        fontSize: 14,
        padding: "28px 4px",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid rgba(124,108,224,.25)",
          borderTopColor: "#8d83e4",
          display: "inline-block",
          animation: "polling-spin 0.8s linear infinite",
        }}
      />
      {label}
      <style>{"@keyframes polling-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        padding: "14px 16px",
        borderRadius: 14,
        background: "rgba(192,85,106,0.08)",
        border: "1px solid rgba(192,85,106,0.22)",
        color: "#a03050",
        fontSize: 14,
      }}
    >
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={btnGhost}>
          Riprova
        </button>
      )}
    </div>
  );
}

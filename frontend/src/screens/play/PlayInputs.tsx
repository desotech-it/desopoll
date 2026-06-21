// Player answer controls for the 4 newer question types (issue #2):
// numeric, slider, ordering, word_cloud. Split from PlayPhases.tsx to keep files
// small. Each control owns its local draft and calls onSubmit with the exact
// payload contract: numeric/slider {value:number}, ordering {order:[id]},
// word_cloud {text:string}.
import React, { useState } from "react";
import { btnPrimary, glassSoft, ShapeBadge, tokens } from "../../ui";
import type { LiveOption, LiveQuestion } from "../../game/types";

const bigInput: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 22,
  fontWeight: 700,
  textAlign: "center",
  padding: "16px 18px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.6)",
  color: tokens.ink,
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
  width: "100%",
  boxSizing: "border-box",
};

// ---- numeric: { value:number } ----
export function NumericInput({ onSubmit }: { onSubmit: (value: number) => void }) {
  const [raw, setRaw] = useState("");
  const value = Number(raw);
  const valid = raw.trim() !== "" && Number.isFinite(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(value);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <input
        autoFocus
        type="number"
        inputMode="decimal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="0"
        aria-label="Risposta numerica"
        style={bigInput}
      />
      <button type="submit" style={{ ...btnPrimary, opacity: valid ? 1 : 0.6 }} disabled={!valid}>
        Invia
      </button>
    </form>
  );
}

// ---- slider: { value:number } ----
export function SliderInput({
  question,
  onSubmit,
}: {
  question: LiveQuestion;
  onSubmit: (value: number) => void;
}) {
  const min = Number.isFinite(question.min) ? (question.min as number) : 0;
  const max = Number.isFinite(question.max) && (question.max as number) > min ? (question.max as number) : min + 100;
  const step = Number.isFinite(question.step) && (question.step as number) > 0 ? (question.step as number) : 1;
  const [value, setValue] = useState(() => Math.round((min + max) / 2));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
      style={{ ...glassSoft, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div style={{ textAlign: "center", fontSize: 40, fontWeight: 800, color: tokens.brandInk }}>
        {value}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Valore"
        style={{ width: "100%", accentColor: "#8d83e4" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: tokens.ink3, fontWeight: 600 }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <button type="submit" style={btnPrimary}>
        Invia
      </button>
    </form>
  );
}

// ---- ordering: { order:[id,...] } ----
export function OrderingInput({
  options,
  onSubmit,
}: {
  options: LiveOption[];
  onSubmit: (order: string[]) => void;
}) {
  const [items, setItems] = useState<LiveOption[]>(options);
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  if (items.length === 0) {
    return (
      <div style={{ ...glassSoft, padding: "18px 20px", color: tokens.muted, fontSize: 15 }}>
        Nessun elemento da ordinare.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, i) => (
          <div
            key={it.id}
            style={{ ...glassSoft, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}
          >
            <ShapeBadge index={i} size={36} />
            <span style={{ flex: 1, fontWeight: 700, color: tokens.ink, fontSize: 16 }}>{it.text || "—"}</span>
            <ArrowBtn dir="up" disabled={i === 0} onClick={() => move(i, -1)} />
            <ArrowBtn dir="down" disabled={i === items.length - 1} onClick={() => move(i, 1)} />
          </div>
        ))}
      </div>
      <button style={{ ...btnPrimary, alignSelf: "flex-end" }} onClick={() => onSubmit(items.map((i) => i.id))}>
        Conferma ordine
      </button>
    </div>
  );
}

function ArrowBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "up" ? "Sposta su" : "Sposta giù"}
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        flex: "0 0 auto",
        cursor: disabled ? "default" : "pointer",
        border: "1px solid rgba(124,108,224,0.3)",
        background: "rgba(255,255,255,0.6)",
        color: tokens.brandInk,
        opacity: disabled ? 0.35 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {dir === "up" ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
    </button>
  );
}

// ---- word_cloud: { text:string } (survey, free word) ----
export function WordCloudInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text.trim());
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Scrivi una parola…"
        aria-label="La tua parola"
        maxLength={40}
        style={bigInput}
      />
      <button type="submit" style={{ ...btnPrimary, opacity: text.trim() ? 1 : 0.6 }} disabled={!text.trim()}>
        Invia
      </button>
    </form>
  );
}

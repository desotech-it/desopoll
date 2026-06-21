// Answer-spec editors for the 4 newer question types (issue #2):
// numeric, slider, ordering, word_cloud. Split out of AnswerEditors.tsx to keep
// every file well under 500 lines.
import React from "react";
import { type AnswerSpec, type OrderingItem } from "../../api";
import { isNumeric, isOrdering, isSlider, uuid } from "../../questionTypes";
import { btnGhost, glassSoft, inputStyle, labelStyle, ShapeBadge, tokens } from "../../ui";

type Change = (next: AnswerSpec) => void;

// Parse a number input, returning a fallback for empty / NaN values.
function num(raw: string, fallback: number): number {
  if (raw.trim() === "") return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div style={{ minWidth: 130, flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: tokens.hint, margin: "6px 0 0" }}>{hint}</p>}
    </div>
  );
}

// ---- numeric: { answer, tolerance? } ----
export function NumericEditor({ spec, onChange }: { spec: AnswerSpec; onChange: Change }) {
  const answer = isNumeric(spec) ? spec.answer : 0;
  const tolerance = isNumeric(spec) ? spec.tolerance ?? 0 : 0;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Field label="Risposta corretta">
        <input
          type="number"
          value={answer}
          aria-label="Risposta corretta"
          onChange={(e) => onChange({ answer: num(e.target.value, 0), tolerance })}
          style={inputStyle}
        />
      </Field>
      <Field label="Tolleranza (±)" hint="Una risposta è corretta se la differenza è ≤ tolleranza.">
        <input
          type="number"
          min={0}
          value={tolerance}
          aria-label="Tolleranza"
          onChange={(e) => onChange({ answer, tolerance: Math.max(0, num(e.target.value, 0)) })}
          style={inputStyle}
        />
      </Field>
    </div>
  );
}

// ---- slider: { min, max, step?, answer, tolerance? } ----
export function SliderEditor({ spec, onChange }: { spec: AnswerSpec; onChange: Change }) {
  const s = isSlider(spec)
    ? spec
    : { min: 0, max: 100, step: 1, answer: 50, tolerance: 0 };
  const step = s.step ?? 1;
  const tolerance = s.tolerance ?? 0;
  function patch(next: Partial<typeof s>) {
    onChange({
      min: s.min,
      max: s.max,
      step,
      answer: s.answer,
      tolerance,
      ...next,
    });
  }
  const invalidRange = s.max <= s.min;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Field label="Minimo">
          <input
            type="number"
            value={s.min}
            aria-label="Minimo"
            onChange={(e) => patch({ min: num(e.target.value, 0) })}
            style={inputStyle}
          />
        </Field>
        <Field label="Massimo">
          <input
            type="number"
            value={s.max}
            aria-label="Massimo"
            onChange={(e) => patch({ max: num(e.target.value, 100) })}
            style={inputStyle}
          />
        </Field>
        <Field label="Passo (step)">
          <input
            type="number"
            min={1}
            value={step}
            aria-label="Passo"
            onChange={(e) => patch({ step: Math.max(1, num(e.target.value, 1)) })}
            style={inputStyle}
          />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Field label="Risposta corretta">
          <input
            type="number"
            value={s.answer}
            aria-label="Risposta corretta"
            onChange={(e) => patch({ answer: num(e.target.value, s.min) })}
            style={inputStyle}
          />
        </Field>
        <Field label="Tolleranza (±)" hint="Corretta se entro questa distanza dal valore.">
          <input
            type="number"
            min={0}
            value={tolerance}
            aria-label="Tolleranza"
            onChange={(e) => patch({ tolerance: Math.max(0, num(e.target.value, 0)) })}
            style={inputStyle}
          />
        </Field>
      </div>
      {invalidRange && (
        <p style={{ fontSize: 12, color: "#a03050", margin: 0 }}>
          Il massimo deve essere maggiore del minimo.
        </p>
      )}
    </div>
  );
}

// ---- ordering: { items:[{id,text}], correctOrder:[id,...] } ----
export function OrderingEditor({ spec, onChange }: { spec: AnswerSpec; onChange: Change }) {
  if (!isOrdering(spec)) return null;
  const items = spec.items;
  // The author edits items in their CORRECT order, so the visible order is the
  // correctOrder. Re-derive the visible list from correctOrder (falling back to
  // declaration order for any missing ids).
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered: OrderingItem[] = spec.correctOrder
    .map((id) => byId.get(id))
    .filter((i): i is OrderingItem => Boolean(i));
  for (const i of items) if (!spec.correctOrder.includes(i.id)) ordered.push(i);

  function commit(next: OrderingItem[]) {
    onChange({ items: next, correctOrder: next.map((i) => i.id) });
  }
  function setText(id: string, text: string) {
    commit(ordered.map((i) => (i.id === id ? { ...i, text } : i)));
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= ordered.length) return;
    const next = [...ordered];
    [next[idx], next[j]] = [next[j], next[idx]];
    commit(next);
  }
  function add() {
    if (ordered.length >= 6) return;
    commit([...ordered, { id: uuid(), text: "" }]);
  }
  function remove(id: string) {
    if (ordered.length <= 2) return;
    commit(ordered.filter((i) => i.id !== id));
  }

  return (
    <div>
      <label style={labelStyle}>
        Elementi in ordine corretto
        <span style={{ fontWeight: 400, color: tokens.ink3, marginLeft: 6 }}>
          (usa le frecce per riordinarli)
        </span>
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {ordered.map((it, i) => (
          <div
            key={it.id}
            style={{ ...glassSoft, display: "flex", alignItems: "center", gap: 12, padding: "10px 12px" }}
          >
            <ShapeBadge index={i} size={34} />
            <input
              value={it.text}
              onChange={(e) => setText(it.id, e.target.value)}
              placeholder={`Elemento ${i + 1}`}
              aria-label={`Elemento ${i + 1}`}
              style={{ ...inputStyle, flex: 1 }}
            />
            <ReorderButton dir="up" disabled={i === 0} onClick={() => move(i, -1)} />
            <ReorderButton dir="down" disabled={i === ordered.length - 1} onClick={() => move(i, 1)} />
            <button
              type="button"
              onClick={() => remove(it.id)}
              disabled={ordered.length <= 2}
              title="Rimuovi elemento"
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                flex: "0 0 auto",
                cursor: ordered.length <= 2 ? "default" : "pointer",
                border: "1px solid rgba(192,85,106,0.22)",
                background: "rgba(192,85,106,0.08)",
                color: "#c0556a",
                opacity: ordered.length <= 2 ? 0.4 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {ordered.length < 6 ? (
        <button style={{ ...btnGhost, marginTop: 12 }} onClick={add}>
          + Aggiungi elemento
        </button>
      ) : (
        <p style={{ fontSize: 12, color: tokens.hint, marginTop: 10 }}>Massimo 6 elementi raggiunto.</p>
      )}
    </div>
  );
}

function ReorderButton({
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
      title={dir === "up" ? "Sposta su" : "Sposta giù"}
      aria-label={dir === "up" ? "Sposta su" : "Sposta giù"}
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {dir === "up" ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
    </button>
  );
}

// ---- word_cloud: survey, no scoring. Just an explanatory note. ----
export function WordCloudEditor() {
  return (
    <div style={{ ...glassSoft, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ fontSize: 22, lineHeight: 1 }}>💬</div>
      <div>
        <div style={{ fontWeight: 700, color: tokens.ink, fontSize: 14, marginBottom: 4 }}>
          Nuvola di parole (sondaggio)
        </div>
        <p style={{ color: tokens.ink2, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          I partecipanti scrivono una parola libera. Non c'è una risposta corretta:
          le parole più frequenti vengono aggregate e mostrate nei risultati.
          Nessuna configurazione necessaria.
        </p>
      </div>
    </div>
  );
}

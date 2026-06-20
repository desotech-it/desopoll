// Answer-spec editors (one per question type).
import React, { useState } from "react";
import { type AnswerSpec, type Option, type QuestionType } from "../../api";
import { hasOptions, isOpenText, isTrueFalse, uuid } from "../../questionTypes";
import { btnGhost, glassSoft, inputStyle, labelStyle, ShapeBadge, tokens } from "../../ui";
import { Toggle } from "./QuizMeta";

// ---- Answer-spec editors (one per type) ----
export function AnswerEditor({
  type,
  spec,
  onChange,
}: {
  type: QuestionType;
  spec: AnswerSpec;
  onChange: (next: AnswerSpec) => void;
}) {
  if (type === "true_false") return <TrueFalseEditor spec={spec} onChange={onChange} />;
  if (type === "open_text") return <OpenTextEditor spec={spec} onChange={onChange} />;
  if (type === "poll") return <OptionsEditor type={type} spec={spec} onChange={onChange} />;
  // single_choice / multiple_choice
  return <OptionsEditor type={type} spec={spec} onChange={onChange} />;
}

function OptionsEditor({
  type,
  spec,
  onChange,
}: {
  type: QuestionType;
  spec: AnswerSpec;
  onChange: (next: AnswerSpec) => void;
}) {
  if (!hasOptions(spec)) return null;
  const options = spec.options;
  const correct = type === "poll" ? [] : spec.correct ?? [];
  const isPoll = type === "poll";
  const isSingle = type === "single_choice";

  function setOptionText(optId: string, text: string) {
    const next = { ...spec, options: options.map((o) => (o.id === optId ? { ...o, text } : o)) } as AnswerSpec;
    onChange(next);
  }

  function addOption() {
    if (options.length >= 6) return;
    const opt: Option = { id: uuid(), text: "" };
    onChange({ ...spec, options: [...options, opt] } as AnswerSpec);
  }

  function removeOption(optId: string) {
    if (options.length <= 2) return;
    const nextOptions = options.filter((o) => o.id !== optId);
    if (isPoll) {
      onChange({ options: nextOptions });
    } else {
      onChange({ options: nextOptions, correct: correct.filter((c) => c !== optId) });
    }
  }

  function toggleCorrect(optId: string) {
    if (isPoll) return;
    if (isSingle) {
      onChange({ options, correct: [optId] });
    } else {
      const next = correct.includes(optId)
        ? correct.filter((c) => c !== optId)
        : [...correct, optId];
      onChange({ options, correct: next });
    }
  }

  return (
    <div>
      <label style={labelStyle}>
        {isPoll ? "Opzioni del sondaggio" : "Opzioni di risposta"}
        {!isPoll && (
          <span style={{ fontWeight: 400, color: tokens.ink3, marginLeft: 6 }}>
            {isSingle ? "(seleziona la corretta)" : "(seleziona tutte le corrette)"}
          </span>
        )}
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {options.map((o, i) => {
          const isCorrect = correct.includes(o.id);
          return (
            <div
              key={o.id}
              style={{
                ...glassSoft,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                ...(isCorrect
                  ? { outline: "2px solid rgba(47,125,84,0.5)", background: "rgba(152,226,182,0.18)" }
                  : {}),
              }}
            >
              <ShapeBadge index={i} size={36} />
              <input
                value={o.text}
                onChange={(e) => setOptionText(o.id, e.target.value)}
                placeholder={`Opzione ${i + 1}`}
                style={{ ...inputStyle, flex: 1 }}
              />
              {!isPoll && (
                <button
                  type="button"
                  onClick={() => toggleCorrect(o.id)}
                  title={isCorrect ? "Risposta corretta" : "Segna come corretta"}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    flex: "0 0 auto",
                    cursor: "pointer",
                    border: isCorrect ? "none" : "1px solid rgba(124,108,224,0.3)",
                    background: isCorrect ? "linear-gradient(135deg,#9ee0b6,#5fc98c)" : "rgba(255,255,255,0.6)",
                    color: isCorrect ? "#fff" : tokens.ink3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeOption(o.id)}
                disabled={options.length <= 2}
                title="Rimuovi opzione"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  flex: "0 0 auto",
                  cursor: options.length <= 2 ? "default" : "pointer",
                  border: "1px solid rgba(192,85,106,0.22)",
                  background: "rgba(192,85,106,0.08)",
                  color: "#c0556a",
                  opacity: options.length <= 2 ? 0.4 : 1,
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
          );
        })}
      </div>
      {options.length < 6 && (
        <button style={{ ...btnGhost, marginTop: 12 }} onClick={addOption}>
          + Aggiungi opzione
        </button>
      )}
      {!isPoll && correct.length === 0 && (
        <p style={{ fontSize: 12, color: "#a03050", marginTop: 8 }}>
          Seleziona almeno una risposta corretta.
        </p>
      )}
    </div>
  );
}

function TrueFalseEditor({ spec, onChange }: { spec: AnswerSpec; onChange: (n: AnswerSpec) => void }) {
  const value = isTrueFalse(spec) ? spec.correct : true;
  const opts: { v: boolean; label: string }[] = [
    { v: true, label: "Vero" },
    { v: false, label: "Falso" },
  ];
  return (
    <div>
      <label style={labelStyle}>Risposta corretta</label>
      <div style={{ display: "flex", gap: 10 }}>
        {opts.map((o, i) => {
          const active = value === o.v;
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => onChange({ correct: o.v })}
              style={{
                ...glassSoft,
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                cursor: "pointer",
                font: "inherit",
                fontSize: 16,
                fontWeight: 700,
                color: tokens.ink,
                ...(active
                  ? { outline: "2.5px solid rgba(47,125,84,0.6)", background: "rgba(152,226,182,0.22)" }
                  : {}),
              }}
            >
              <ShapeBadge index={i} size={34} />
              {o.label}
              {active && <span style={{ marginLeft: "auto", color: "#2f7d54" }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OpenTextEditor({ spec, onChange }: { spec: AnswerSpec; onChange: (n: AnswerSpec) => void }) {
  const accepted = isOpenText(spec) ? spec.accepted : [];
  const caseSensitive = isOpenText(spec) ? Boolean(spec.caseSensitive) : false;
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const v = draft.trim();
    if (!v) return;
    if (accepted.includes(v)) {
      setDraft("");
      return;
    }
    onChange({ accepted: [...accepted, v], caseSensitive });
    setDraft("");
  }

  function remove(v: string) {
    onChange({ accepted: accepted.filter((a) => a !== v), caseSensitive });
  }

  return (
    <div>
      <label style={labelStyle}>Risposte accettate</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          placeholder="Digita una risposta accettata e premi Invio"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <button type="button" style={btnGhost} onClick={commitDraft}>
          Aggiungi
        </button>
      </div>

      {accepted.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {accepted.map((a) => (
            <span
              key={a}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(168,144,235,0.18)",
                color: "#6d54b4",
                border: "1px solid rgba(168,144,235,0.35)",
                borderRadius: 999,
                padding: "5px 8px 5px 13px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {a}
              <button
                type="button"
                onClick={() => remove(a)}
                style={{
                  border: "none",
                  background: "rgba(192,85,106,0.12)",
                  color: "#c0556a",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Toggle
          checked={caseSensitive}
          onChange={(v) => onChange({ accepted, caseSensitive: v })}
          label="Distingui maiuscole/minuscole"
        />
      </div>
    </div>
  );
}

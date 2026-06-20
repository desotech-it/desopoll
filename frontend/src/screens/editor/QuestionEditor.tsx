// Per-question editor: prompt, time limit, points mode + per-type answer editor.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  questions as questionsApi,
  type AnswerSpec,
  type PointsMode,
  type Question,
} from "../../api";
import { answerSummary, typeName } from "../../questionTypes";
import { btnDanger, Chip, glass, inputStyle, labelStyle, tokens } from "../../ui";
import { AnswerEditor } from "./AnswerEditors";

// ---- Per-question editor ----
export function QuestionEditor({
  index,
  question,
  onSaved,
  onDelete,
  onError,
}: {
  index: number;
  question: Question;
  onSaved: (q: Question) => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [timeLimit, setTimeLimit] = useState(question.time_limit_sec);
  const [pointsMode, setPointsMode] = useState<PointsMode>(question.points_mode);
  const [spec, setSpec] = useState<AnswerSpec>(question.answer_spec);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimer = useRef<number | null>(null);

  // Keep local state synced if the question object is replaced from server.
  useEffect(() => {
    setPrompt(question.prompt);
    setTimeLimit(question.time_limit_sec);
    setPointsMode(question.points_mode);
    setSpec(question.answer_spec);
  }, [question]);

  const flashSaved = useCallback(() => {
    setSavingState("saved");
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSavingState("idle"), 1600);
  }, []);

  const persist = useCallback(
    async (patch: {
      prompt?: string;
      time_limit_sec?: number;
      points_mode?: PointsMode;
      answer_spec?: AnswerSpec;
    }) => {
      setSavingState("saving");
      try {
        const { question: updated } = await questionsApi.update(question.id, patch);
        onSaved(updated);
        flashSaved();
      } catch (e) {
        setSavingState("idle");
        onError(e instanceof Error ? e.message : "Salvataggio della domanda non riuscito.");
      }
    },
    [question.id, onSaved, onError, flashSaved],
  );

  // Persist a spec change immediately (option add/remove, correct toggles, etc.).
  const persistSpec = useCallback(
    (next: AnswerSpec) => {
      setSpec(next);
      void persist({ answer_spec: next });
    },
    [persist],
  );

  return (
    <div style={{ ...glass, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: "rgba(124,108,224,0.14)",
            color: tokens.brandInk,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            flex: "0 0 auto",
          }}
        >
          {index + 1}
        </span>
        <Chip tone="violet">{typeName(question.type)}</Chip>
        <span style={{ fontSize: 12, color: tokens.ink3 }}>{answerSummary(question.type, spec)}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {savingState === "saving" && (
            <span style={{ fontSize: 12, color: tokens.hint }}>Salvataggio…</span>
          )}
          {savingState === "saved" && (
            <span style={{ fontSize: 12, color: "#2f7d54" }}>✓ Salvato</span>
          )}
          <button style={btnDanger} onClick={onDelete} title="Elimina domanda">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </span>
      </div>

      <label style={labelStyle}>Testo della domanda</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onBlur={() => prompt !== question.prompt && persist({ prompt })}
        rows={Math.min(8, Math.max(2, Math.ceil(prompt.length / 70)))}
        placeholder="Scrivi qui la domanda (anche lunga, stile VMware/AWS)…"
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, marginBottom: 16 }}
      />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ minWidth: 140 }}>
          <label style={labelStyle}>Tempo limite (sec)</label>
          <input
            type="number"
            min={5}
            max={600}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            onBlur={() => timeLimit !== question.time_limit_sec && persist({ time_limit_sec: timeLimit })}
            style={inputStyle}
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <label style={labelStyle}>Punteggio</label>
          <select
            value={pointsMode}
            onChange={(e) => {
              const v = e.target.value as PointsMode;
              setPointsMode(v);
              void persist({ points_mode: v });
            }}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="standard">Standard</option>
            <option value="double">Doppio</option>
            <option value="none">Nessun punteggio</option>
          </select>
        </div>
      </div>

      <AnswerEditor type={question.type} spec={spec} onChange={persistSpec} />
    </div>
  );
}

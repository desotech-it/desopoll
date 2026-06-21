// Quiz title/description/public meta editor + reusable Toggle.
import React, { useEffect, useRef, useState } from "react";
import { type Quiz } from "../../api";
import { Chip, glass, inputStyle, labelStyle, tokens } from "../../ui";

// ---- Quiz title/description/public ----
export function QuizMetaEditor({
  quiz,
  onPatch,
}: {
  quiz: Quiz;
  onPatch: (body: { title?: string; description?: string; is_public?: boolean }) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? "");
  // Track save lifecycle for the public toggle so the state is obviously saved.
  const [pubState, setPubState] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimer = useRef<number | null>(null);

  useEffect(() => {
    setTitle(quiz.title);
    setDescription(quiz.description ?? "");
  }, [quiz.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire-and-forget patch (title/description on blur): errors are surfaced by
  // the parent's setError; swallow the rejection here to avoid an unhandled one.
  function patchQuiet(body: { title?: string; description?: string }) {
    void Promise.resolve(onPatch(body)).catch(() => {});
  }

  async function togglePublic(v: boolean) {
    setPubState("saving");
    try {
      await onPatch({ is_public: v });
      setPubState("saved");
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setPubState("idle"), 1800);
    } catch {
      setPubState("idle");
    }
  }

  return (
    <div style={{ ...glass, padding: "22px 24px" }}>
      <label style={labelStyle} htmlFor="quiz-title">
        Titolo del quiz
      </label>
      <input
        id="quiz-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== quiz.title && patchQuiet({ title: title.trim() })}
        style={{ ...inputStyle, fontSize: 18, fontWeight: 600, marginBottom: 16 }}
      />

      <label style={labelStyle} htmlFor="quiz-desc">
        Descrizione
      </label>
      <textarea
        id="quiz-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => description !== (quiz.description ?? "") && patchQuiet({ description })}
        rows={2}
        placeholder="Una breve descrizione del quiz…"
        style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 14px",
          borderRadius: 14,
          background: quiz.is_public ? "rgba(120,210,150,.12)" : "rgba(168,144,235,.08)",
          border: "1px solid rgba(255,255,255,0.5)",
        }}
      >
        <Toggle
          checked={quiz.is_public}
          onChange={togglePublic}
          label="Quiz pubblico"
        />
        {quiz.is_public ? <Chip tone="green">Pubblicato</Chip> : <Chip tone="violet">Privato</Chip>}
        <span style={{ fontSize: 12.5, color: tokens.ink3, flex: 1, minWidth: 180 }}>
          {quiz.is_public
            ? "Visibile e riutilizzabile da altri utenti."
            : "Visibile solo a te."}
        </span>
        <span aria-live="polite" style={{ fontSize: 12, minWidth: 70, textAlign: "right" }}>
          {pubState === "saving" && <span style={{ color: tokens.hint }}>Salvataggio…</span>}
          {pubState === "saved" && <span style={{ color: "#2f7d54" }}>✓ Salvato</span>}
        </span>
      </div>
    </div>
  );
}

// Read-only quiz meta header, shown when the caller cannot edit the quiz.
export function QuizMetaReadOnly({ quiz }: { quiz: Quiz }) {
  return (
    <div style={{ ...glass, padding: "22px 24px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: tokens.ink }}>
        {quiz.title}
      </h1>
      <p style={{ margin: 0, fontSize: 14, color: tokens.ink3, lineHeight: 1.5 }}>
        {quiz.description || "Nessuna descrizione."}
      </p>
      <div style={{ marginTop: 12 }}>
        {quiz.is_public ? <Chip tone="green">Pubblico</Chip> : <Chip tone="violet">Privato</Chip>}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        font: "inherit",
      }}
    >
      <span
        style={{
          width: 42,
          height: 25,
          borderRadius: 999,
          background: checked ? "rgba(124,108,224,0.7)" : "rgba(124,108,224,0.3)",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.6)",
          flex: "0 0 auto",
          transition: "background .2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 19 : 2,
            width: 19,
            height: 19,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .2s",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: tokens.ink2 }}>{label}</span>
    </button>
  );
}

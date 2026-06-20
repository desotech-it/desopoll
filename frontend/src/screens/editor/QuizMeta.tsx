// Quiz title/description/public meta editor + reusable Toggle.
import React, { useEffect, useState } from "react";
import { type Quiz } from "../../api";
import { glass, inputStyle, labelStyle, tokens } from "../../ui";

// ---- Quiz title/description/public ----
export function QuizMetaEditor({
  quiz,
  onPatch,
}: {
  quiz: Quiz;
  onPatch: (body: { title?: string; description?: string; is_public?: boolean }) => void;
}) {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? "");

  useEffect(() => {
    setTitle(quiz.title);
    setDescription(quiz.description ?? "");
  }, [quiz.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ ...glass, padding: "22px 24px" }}>
      <label style={labelStyle} htmlFor="quiz-title">
        Titolo del quiz
      </label>
      <input
        id="quiz-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== quiz.title && onPatch({ title: title.trim() })}
        style={{ ...inputStyle, fontSize: 18, fontWeight: 600, marginBottom: 16 }}
      />

      <label style={labelStyle} htmlFor="quiz-desc">
        Descrizione
      </label>
      <textarea
        id="quiz-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => description !== (quiz.description ?? "") && onPatch({ description })}
        rows={2}
        placeholder="Una breve descrizione del quiz…"
        style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Toggle
          checked={quiz.is_public}
          onChange={(v) => onPatch({ is_public: v })}
          label="Quiz pubblico"
        />
        <span style={{ fontSize: 12.5, color: tokens.ink3 }}>
          {quiz.is_public
            ? "Visibile e riutilizzabile da altri utenti."
            : "Visibile solo a te."}
        </span>
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

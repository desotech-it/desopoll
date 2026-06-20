// Question type picker shown when adding a new question.
import React from "react";
import { type QuestionType } from "../../api";
import { QUESTION_TYPES } from "../../questionTypes";
import { btnGhost, glass, glassSoft, tokens } from "../../ui";
import { TypeIcon } from "../../typeIcons";

// ---- Question type picker ----
export function TypePicker({
  adding,
  onPick,
  onCancel,
}: {
  adding: boolean;
  onPick: (t: QuestionType) => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Scegli il tipo di domanda</h3>
        <button style={btnGhost} onClick={onCancel} disabled={adding}>
          Annulla
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 12,
          opacity: adding ? 0.6 : 1,
          pointerEvents: adding ? "none" : "auto",
        }}
      >
        {QUESTION_TYPES.map((t) => (
          <button
            key={t.type}
            onClick={() => onPick(t.type)}
            style={{
              ...glassSoft,
              textAlign: "left",
              padding: "16px 16px 14px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              font: "inherit",
            }}
          >
            <TypeIcon type={t.type} size={40} />
            <span style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>{t.name}</span>
            <span style={{ fontSize: 12.5, color: tokens.ink2, lineHeight: 1.5 }}>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

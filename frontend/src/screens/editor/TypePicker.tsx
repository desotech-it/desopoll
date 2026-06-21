// Question type picker shown when adding a new question.
import React from "react";
import { useTranslation } from "react-i18next";
import { type QuestionType } from "../../api";
import { QUESTION_TYPES, typeDesc, typeName } from "../../questionTypes";
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
  const { t } = useTranslation("editor");
  return (
    <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("typePicker.heading")}</h3>
        <button style={btnGhost} onClick={onCancel} disabled={adding}>
          {t("common:actions.cancel")}
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
        {QUESTION_TYPES.map((meta) => (
          <button
            key={meta.type}
            onClick={() => onPick(meta.type)}
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
            <TypeIcon type={meta.type} size={40} />
            <span style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>{typeName(meta.type)}</span>
            <span style={{ fontSize: 12.5, color: tokens.ink2, lineHeight: 1.5 }}>{typeDesc(meta.type)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

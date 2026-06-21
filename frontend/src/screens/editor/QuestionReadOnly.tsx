// Read-only rendering of a question, shown in the editor when the caller has
// only view/play access (cannot edit). Mirrors QuestionEditor's header.
import React from "react";
import { useTranslation } from "react-i18next";
import { type Question } from "../../api";
import { answerSummary, typeName } from "../../questionTypes";
import { glass, inputStyle, labelStyle, tokens } from "../../ui";
import { TypeChip } from "../../typeIcons";

export function QuestionReadOnly({ index, question }: { index: number; question: Question }) {
  const { t } = useTranslation("editor");
  const pointsLabel =
    question.points_mode === "double"
      ? t("question.pointsDouble")
      : question.points_mode === "none"
        ? t("question.pointsNone")
        : t("question.pointsStandard");
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
        <TypeChip type={question.type} name={typeName(question.type)} />
        <span style={{ fontSize: 12, color: tokens.ink3 }}>{answerSummary(question.type, question.answer_spec)}</span>
      </div>

      <label style={labelStyle}>{t("question.promptLabel")}</label>
      <div
        style={{
          ...inputStyle,
          minHeight: 44,
          whiteSpace: "pre-wrap",
          background: "rgba(255,255,255,0.4)",
          cursor: "default",
        }}
      >
        {question.prompt || <span style={{ color: tokens.hint }}>{t("readOnly.noText")}</span>}
      </div>

      {question.image && (
        <img
          src={question.image}
          alt=""
          style={{ marginTop: 12, maxWidth: "100%", borderRadius: 12, display: "block" }}
        />
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, fontSize: 12.5, color: tokens.ink3 }}>
        <span>{t("readOnly.timeLimit", { sec: question.time_limit_sec })}</span>
        <span>{t("readOnly.points", { value: pointsLabel })}</span>
        {question.points_mode !== "none" && (
          <span>
            {t("readOnly.speedBonus", {
              value: question.speed_bonus ? t("readOnly.yes") : t("readOnly.no"),
            })}
          </span>
        )}
      </div>
    </div>
  );
}

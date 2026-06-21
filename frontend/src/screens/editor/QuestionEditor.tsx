// Per-question editor: prompt, time limit, points mode, image + per-type answer.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  questions as questionsApi,
  type AnswerSpec,
  type PointsMode,
  type Question,
} from "../../api";
import { answerSummary, typeName } from "../../questionTypes";
import { speedBonusApplies } from "../../scoring";
import { glass, inputStyle, labelStyle, tokens } from "../../ui";
import { TypeChip } from "../../typeIcons";
import { AnswerEditor } from "./AnswerEditors";
import { ImagePicker } from "./ImagePicker";
import { QuestionToolbar } from "./QuestionToolbar";
import { Toggle } from "./QuizMeta";
import { ScoringHelp } from "./ScoringHelp";

// ---- Per-question editor ----
export function QuestionEditor({
  index,
  question,
  onSaved,
  onDelete,
  onError,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  reordering,
}: {
  index: number;
  question: Question;
  onSaved: (q: Question) => void;
  onDelete: () => void;
  onError: (msg: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  reordering: boolean;
}) {
  const { t } = useTranslation("editor");
  const [prompt, setPrompt] = useState(question.prompt);
  const [timeLimit, setTimeLimit] = useState(question.time_limit_sec);
  const [pointsMode, setPointsMode] = useState<PointsMode>(question.points_mode);
  const [speedBonus, setSpeedBonus] = useState(question.speed_bonus);
  const [spec, setSpec] = useState<AnswerSpec>(question.answer_spec);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimer = useRef<number | null>(null);

  // Keep local state synced if the question object is replaced from server.
  useEffect(() => {
    setPrompt(question.prompt);
    setTimeLimit(question.time_limit_sec);
    setPointsMode(question.points_mode);
    setSpeedBonus(question.speed_bonus);
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
      speed_bonus?: boolean;
      answer_spec?: AnswerSpec;
      image?: string | null;
    }) => {
      setSavingState("saving");
      try {
        const { question: updated } = await questionsApi.update(question.id, patch);
        onSaved(updated);
        flashSaved();
      } catch (e) {
        setSavingState("idle");
        onError(e instanceof Error ? e.message : t("errorSaveQuestion"));
      }
    },
    [question.id, onSaved, onError, flashSaved, t],
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
        <TypeChip type={question.type} name={typeName(question.type)} />
        <span style={{ fontSize: 12, color: tokens.ink3 }}>{answerSummary(question.type, spec)}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {savingState === "saving" && (
            <span style={{ fontSize: 12, color: tokens.hint }}>{t("common:actions.saving")}</span>
          )}
          {savingState === "saved" && (
            <span style={{ fontSize: 12, color: "#2f7d54" }}>{t("common:actions.saved")}</span>
          )}
          <QuestionToolbar
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            reordering={reordering}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDelete={onDelete}
          />
        </span>
      </div>

      <label style={labelStyle}>{t("question.promptLabel")}</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onBlur={() => prompt !== question.prompt && persist({ prompt })}
        rows={Math.min(8, Math.max(2, Math.ceil(prompt.length / 70)))}
        placeholder={t("question.promptPlaceholder")}
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, marginBottom: 16 }}
      />

      <ImagePicker image={question.image} onChange={(image) => persist({ image })} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ flex: "1 1 140px", minWidth: 130 }}>
          <label style={labelStyle}>{t("question.timeLimitLabel")}</label>
          <input
            type="number"
            min={5}
            max={600}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            onBlur={() => {
              // Clamp to [5,600] and guard against NaN/empty input.
              const clamped = Math.min(600, Math.max(5, Number.isFinite(timeLimit) ? timeLimit : 30));
              if (clamped !== timeLimit) setTimeLimit(clamped);
              if (clamped !== question.time_limit_sec) persist({ time_limit_sec: clamped });
            }}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 150 }}>
          <label style={labelStyle}>{t("question.pointsLabel")}</label>
          <select
            value={pointsMode}
            onChange={(e) => {
              const v = e.target.value as PointsMode;
              setPointsMode(v);
              void persist({ points_mode: v });
            }}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="standard">{t("question.pointsStandard")}</option>
            <option value="double">{t("question.pointsDouble")}</option>
            <option value="none">{t("question.pointsNone")}</option>
          </select>
        </div>
        <div style={{ flex: "1 1 180px", minWidth: 170, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <label style={labelStyle}>{t("question.speedBonusLabel")}</label>
          <SpeedBonusToggle
            checked={speedBonus}
            disabled={!speedBonusApplies(question.type, pointsMode)}
            onChange={(v) => {
              setSpeedBonus(v);
              void persist({ speed_bonus: v });
            }}
          />
        </div>
      </div>

      <ScoringHelp type={question.type} pointsMode={pointsMode} speedBonus={speedBonus} />

      <AnswerEditor type={question.type} spec={spec} onChange={persistSpec} />
    </div>
  );
}

function SpeedBonusToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation("editor");
  const stateLabel = checked ? t("question.speedBonusOn") : t("question.speedBonusOff");
  return (
    <div
      aria-disabled={disabled}
      title={disabled ? t("question.speedBonusDisabledHint") : t("question.speedBonusHint")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 40,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "default",
      }}
    >
      {/* Reuse the shared Toggle (also used by the public-quiz switch). When
          disabled (no scoring) the change is a no-op so it can't be toggled. */}
      <Toggle checked={checked} onChange={(v) => !disabled && onChange(v)} label={stateLabel} />
    </div>
  );
}

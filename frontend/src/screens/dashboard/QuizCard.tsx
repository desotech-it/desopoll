// A single quiz glass card on the dashboard. Per-card actions are gated by the
// caller's resolved permission (issue #4): host (play+), edit (edit+),
// duplicate (view+), delete + share (manage). Shared cards show a role badge.
import React from "react";
import { useTranslation } from "react-i18next";
import { type Quiz } from "../../api";
import { PERMISSION_TONES, permissionLabel } from "../../permissions";
import { btnDanger, btnGhost, btnPrimary, Chip, glass, tokens } from "../../ui";

// Map the active UI language to a BCP-47 locale for date formatting.
const DATE_LOCALES: Record<string, string> = { it: "it-IT", en: "en-US", es: "es-ES" };

function formatDate(iso: string, lang: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = DATE_LOCALES[lang.split("-")[0]] ?? "it-IT";
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export function QuizCard({
  quiz,
  canPlay,
  canEdit,
  canManage,
  onOpen,
  onLaunch,
  onDelete,
  onDuplicate,
  onShare,
}: {
  quiz: Quiz;
  canPlay: boolean;
  canEdit: boolean;
  canManage: boolean;
  onOpen: () => void;
  onLaunch: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}) {
  const { t, i18n } = useTranslation("dashboard");
  const empty = (quiz.question_count ?? 0) === 0;
  const shared = quiz.owned === false;
  const launchDisabled = empty || !canPlay;

  return (
    <div style={{ ...glass, borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 18px 0", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <h3 style={{ margin: "0 0 6px" }}>
            <button
              type="button"
              onClick={onOpen}
              style={{
                font: "inherit",
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.3,
                color: tokens.ink,
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: 0,
                textAlign: "left",
              }}
            >
              {quiz.title}
            </button>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
            {shared && quiz.permission ? (
              <Chip tone={PERMISSION_TONES[quiz.permission]}>{permissionLabel(quiz.permission)}</Chip>
            ) : quiz.is_public ? (
              <Chip tone="green">{t("card.public")}</Chip>
            ) : (
              <Chip tone="violet">{t("card.private")}</Chip>
            )}
          </div>
        </div>
        <p style={{ fontSize: 13, color: tokens.ink3, margin: "0 0 12px", lineHeight: 1.5, minHeight: 19 }}>
          {quiz.description || t("card.noDescription")}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: tokens.ink3, marginBottom: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {t("card.questions", { count: quiz.question_count ?? 0 })}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDate(quiz.updated_at, i18n.language)}
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 18px",
          borderTop: "1px solid rgba(124,108,224,0.12)",
          flexWrap: "wrap",
        }}
      >
        {canPlay && (
          <button
            style={{ ...btnPrimary, opacity: launchDisabled ? 0.5 : 1, cursor: launchDisabled ? "default" : "pointer" }}
            onClick={onLaunch}
            disabled={launchDisabled}
            title={empty ? t("card.launchEmptyHint") : t("card.launchHint")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
            </svg>
            {t("card.launch")}
          </button>
        )}
        <button style={btnGhost} onClick={onOpen}>
          {canEdit ? <EditIcon /> : <EyeIcon />}
          {canEdit ? t("card.edit") : t("card.open")}
        </button>
        <button style={btnGhost} onClick={onDuplicate} title={t("card.duplicateHint")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {t("card.duplicate")}
        </button>
        {canManage && (
          <>
            <button style={btnGhost} onClick={onShare} title={t("card.shareHint")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {t("card.share")}
            </button>
            <button style={{ ...btnDanger, marginLeft: "auto" }} onClick={onDelete} title={t("card.deleteHint")}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
              {t("card.delete")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

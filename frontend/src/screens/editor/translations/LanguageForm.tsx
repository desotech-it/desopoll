// The per-language translation form: lists every translatable string (quiz
// title, question prompts, option texts) with the base text shown and an input
// for the translation. Controlled by the parent TranslationsDialog via `draft`.
import React from "react";
import { useTranslation } from "react-i18next";
import { inputStyle, tokens } from "../../../ui";
import { entryKey, lookup, type TranslatableString } from "./strings";
import type { Draft } from "./draft";

export function LanguageForm({
  lang,
  strings,
  serverIndex,
  draft,
  onChange,
}: {
  lang: string;
  strings: ReadonlyArray<TranslatableString>;
  serverIndex: Map<string, string>;
  draft: Draft;
  onChange: (key: string, value: string) => void;
}) {
  const { t } = useTranslation("translations");
  // Hide strings whose base is empty: there is nothing meaningful to translate.
  const rows = strings.filter((s) => s.base.trim());

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 13, color: tokens.hint, margin: "8px 0 0" }}>
        {t("noStrings")}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((s) => {
        const key = entryKey(s.entityType, s.entityId, lang, s.field);
        const value = draft.get(key) ?? "";
        const original = lookup(serverIndex, s, lang);
        const filled = value.trim().length > 0;
        return (
          <div
            key={key}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(255,255,255,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: tokens.brandInk,
                  background: "rgba(168,144,235,.18)",
                  borderRadius: 999,
                  padding: "3px 9px",
                  whiteSpace: "nowrap",
                }}
              >
                {labelFor(s.group, t)}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  color: tokens.ink2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={s.base}
              >
                {s.base}
              </span>
              <span
                aria-hidden="true"
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: filled ? "#2f7d54" : tokens.hint,
                }}
              >
                {filled ? "●" : "○"}
              </span>
            </div>
            <input
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={t("translationPlaceholder")}
              aria-label={t("inputAria", { group: labelFor(s.group, t), base: s.base })}
              data-original={original}
              style={inputStyle}
            />
          </div>
        );
      })}
    </div>
  );
}

// Turn an internal group token ("quiz" / "Q1" / "Q1 · 2") into a display label.
// Only "quiz" is localized; question/option tokens are already compact + neutral.
function labelFor(group: string, t: (k: string) => string): string {
  return group === "quiz" ? t("quizTitleLabel") : group;
}

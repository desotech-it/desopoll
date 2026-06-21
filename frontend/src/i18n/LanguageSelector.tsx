// Compact it/en/es language selector. Calls i18n.changeLanguage + persists to
// localStorage via setLanguage(). Rendered in the app top bar and on the public
// Login / Join / Play screens.
import React from "react";
import { useTranslation } from "react-i18next";
import { setLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "./index";

const CODES: Record<SupportedLanguage, string> = {
  it: "IT",
  en: "EN",
  es: "ES",
};

export function LanguageSelector({ compact = true }: { compact?: boolean }) {
  const { i18n, t } = useTranslation("common");
  const current = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLanguage)
    : "it";

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "rgba(255,255,255,0.5)",
        border: "1px solid rgba(124,108,224,0.18)",
      }}
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = lng === current;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => setLanguage(lng)}
            aria-pressed={active}
            aria-label={t(`language.${lng}`)}
            title={t(`language.${lng}`)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 999,
              padding: compact ? "4px 9px" : "6px 12px",
              fontSize: compact ? 12 : 13,
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "0.03em",
              color: active ? "#fff" : "#6d54b4",
              background: active ? "rgba(108,92,231,0.9)" : "transparent",
              transition: "background .15s, color .15s",
            }}
          >
            {CODES[lng]}
          </button>
        );
      })}
    </div>
  );
}

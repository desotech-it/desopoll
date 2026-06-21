// "Lingue & traduzioni" dialog (issue #6). Lets an editor:
//  - manage the quiz's available_languages (add/remove from it/en/es beyond base)
//  - for each non-base language, translate the quiz title + every question prompt
//    + every option text, with a per-language completeness indicator.
// Loads via translations.get, saves strings via translations.put, and persists
// the language set via quizzes.update({ available_languages }).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  quizzes as quizzesApi,
  translations as translationsApi,
  type Question,
} from "../../../api";
import { SUPPORTED_LANGUAGES } from "../../../i18n/resources";
import { btnDanger, btnGhost, btnPrimary, Chip, ErrorBox, glass, Spinner, tokens } from "../../../ui";
import { collectStrings, completeness, indexEntries } from "./strings";
import { diffEntries, isDirty, seedDraft, type Draft } from "./draft";
import { LanguageForm } from "./LanguageForm";

export function TranslationsDialog({
  quizId,
  quizTitle,
  baseLanguage,
  questions,
  initialAvailable,
  onClose,
  onLanguagesChange,
}: {
  quizId: string;
  quizTitle: string;
  baseLanguage: string;
  questions: ReadonlyArray<Question>;
  initialAvailable: string[];
  onClose: () => void;
  onLanguagesChange?: (langs: string[]) => void;
}) {
  const { t } = useTranslation("translations");
  const [available, setAvailable] = useState<string[]>(() =>
    normalize(initialAvailable, baseLanguage),
  );
  const [serverIndex, setServerIndex] = useState<Map<string, string> | null>(null);
  const [draft, setDraft] = useState<Draft>(new Map());
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingLangs, setSavingLangs] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // The flat list of translatable base strings is derived purely from the quiz.
  const strings = useMemo(
    () => collectStrings({ id: quizId, title: quizTitle }, questions),
    [quizId, quizTitle, questions],
  );

  // Languages the author can still add (the supported pool minus what's set).
  const addable = SUPPORTED_LANGUAGES.filter((l) => !available.includes(l));
  // Non-base languages get a translation form/tab.
  const translatable = available.filter((l) => l !== baseLanguage);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await translationsApi.get(quizId);
      const idx = indexEntries(res.entries);
      setServerIndex(idx);
      const langs = normalize(res.availableLanguages, res.baseLanguage || baseLanguage);
      setAvailable(langs);
      const nonBase = langs.filter((l) => l !== (res.baseLanguage || baseLanguage));
      setActiveLang((prev) => prev ?? nonBase[0] ?? null);
      // Seed the draft for every translatable language at once.
      const seeded: Draft = new Map();
      for (const l of nonBase) {
        for (const [k, v] of seedDraft(strings, idx, l)) seeded.set(k, v);
      }
      setDraft(seeded);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorLoad"));
      setServerIndex(new Map());
    }
  }, [quizId, baseLanguage, strings, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Close on Escape for accessibility.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function persistLanguages(next: string[]) {
    const normalized = normalize(next, baseLanguage);
    const prev = available;
    setAvailable(normalized);
    setSavingLangs(true);
    setError(null);
    try {
      const { quiz } = await quizzesApi.update(quizId, { available_languages: normalized });
      const applied = normalize(quiz.available_languages ?? normalized, baseLanguage);
      setAvailable(applied);
      onLanguagesChange?.(applied);
      // Pick a sensible active tab if the current one disappeared / first appeared.
      const nonBase = applied.filter((l) => l !== baseLanguage);
      setActiveLang((cur) => (cur && nonBase.includes(cur) ? cur : nonBase[0] ?? null));
      // Make sure the draft has seeds for any newly added language.
      if (serverIndex) {
        setDraft((d) => {
          const merged = new Map(d);
          for (const l of nonBase) {
            for (const [k, v] of seedDraft(strings, serverIndex, l)) {
              if (!merged.has(k)) merged.set(k, v);
            }
          }
          return merged;
        });
      }
    } catch (e) {
      setAvailable(prev); // revert on failure
      setError(e instanceof Error ? e.message : t("errorSaveLanguages"));
    } finally {
      setSavingLangs(false);
    }
  }

  function addLanguage(lang: string) {
    void persistLanguages([...available, lang]);
  }

  function removeLanguage(lang: string) {
    if (lang === baseLanguage) return; // base is never removable
    if (!window.confirm(t("confirmRemoveLanguage", { lang: langName(lang, t) }))) return;
    void persistLanguages(available.filter((l) => l !== lang));
  }

  function onFieldChange(key: string, value: string) {
    setDraft((d) => {
      const next = new Map(d);
      next.set(key, value);
      return next;
    });
  }

  async function saveDraft() {
    if (!activeLang || !serverIndex) return;
    const entries = diffEntries(strings, serverIndex, draft, activeLang);
    if (entries.length === 0) return;
    setSavingDraft(true);
    setError(null);
    try {
      await translationsApi.put(quizId, entries);
      // Reflect the saved values into the server index so the form is no longer
      // dirty and completeness recomputes correctly without a full reload.
      setServerIndex((idx) => {
        const next = new Map(idx ?? new Map());
        for (const e of entries) {
          const k = `${e.entity_type}:${e.entity_id}:${e.lang}:${e.field}`;
          const v = e.value.trim();
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorSave"));
    } finally {
      setSavingDraft(false);
    }
  }

  const dirty =
    activeLang && serverIndex
      ? isDirty(strings, serverIndex, draft, activeLang)
      : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("ariaLabel", { title: quizTitle })}
      onClick={onClose}
      style={overlayStyle}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...glass, width: "100%", maxWidth: 620, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 700 }}>{t("title")}</h2>
            <p style={{ margin: 0, fontSize: 13, color: tokens.ink3 }}>{quizTitle}</p>
          </div>
          <button style={btnGhost} onClick={onClose} aria-label={t("common:actions.close")}>
            ✕
          </button>
        </div>

        {/* Available languages */}
        <h3 style={sectionHeading}>{t("languagesHeading")}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Chip tone="violet">{t("baseChip", { lang: langName(baseLanguage, t) })}</Chip>
          {translatable.map((l) => (
            <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Chip tone="sky">{langName(l, t)}</Chip>
              <button
                style={{ ...btnDanger, padding: "3px 8px", fontSize: 12 }}
                onClick={() => removeLanguage(l)}
                disabled={savingLangs}
                aria-label={t("removeLanguageAria", { lang: langName(l, t) })}
              >
                ✕
              </button>
            </span>
          ))}
          {addable.map((l) => (
            <button
              key={l}
              style={{ ...btnGhost, opacity: savingLangs ? 0.6 : 1 }}
              onClick={() => addLanguage(l)}
              disabled={savingLangs}
            >
              + {langName(l, t)}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 14 }}>
            <ErrorBox message={error} />
          </div>
        )}

        {/* Language tabs + form */}
        <h3 style={sectionHeading}>{t("translationsHeading")}</h3>
        {serverIndex === null ? (
          <Spinner label={t("loading")} />
        ) : translatable.length === 0 ? (
          <p style={{ fontSize: 13, color: tokens.hint, margin: 0 }}>{t("noLanguages")}</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {translatable.map((l) => {
                const c = completeness(strings, serverIndex, l);
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setActiveLang(l)}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      padding: "8px 14px",
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: activeLang === l ? tokens.brandInk : tokens.ink2,
                      background: activeLang === l ? "rgba(108,92,231,0.14)" : "rgba(255,255,255,0.4)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {langName(l, t)}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: c.done ? "#2f7d54" : tokens.hint,
                      }}
                      aria-label={t("completenessAria", {
                        lang: langName(l, t),
                        translated: c.translated,
                        total: c.total,
                      })}
                    >
                      {c.translated}/{c.total}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeLang && (
              <>
                <LanguageForm
                  lang={activeLang}
                  strings={strings}
                  serverIndex={serverIndex}
                  draft={draft}
                  onChange={onFieldChange}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                  <button
                    style={{ ...btnPrimary, opacity: !dirty || savingDraft ? 0.6 : 1 }}
                    disabled={!dirty || savingDraft}
                    onClick={saveDraft}
                  >
                    {savingDraft ? t("common:actions.saving") : t("saveLanguage", { lang: langName(activeLang, t) })}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Keep available_languages: base first, then de-duped supported languages in
// pool order, base always present even if absent from the input.
function normalize(langs: ReadonlyArray<string> | undefined, base: string): string[] {
  const set = new Set<string>([base]);
  for (const l of langs ?? []) {
    const v = (l ?? "").trim();
    if (v) set.add(v);
  }
  // Order: base first, then the rest in SUPPORTED_LANGUAGES order, then any extras.
  const ordered: string[] = [base];
  for (const l of SUPPORTED_LANGUAGES) if (l !== base && set.has(l)) ordered.push(l);
  for (const l of set) if (!ordered.includes(l)) ordered.push(l);
  return ordered;
}

// Localized language name from the common bundle (falls back to the code).
function langName(lang: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const known = ["it", "en", "es"];
  return known.includes(lang) ? t(`common:language.${lang}`) : lang;
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(43,42,60,0.32)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "6vh 16px 24px",
  overflowY: "auto",
};

const sectionHeading: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  margin: "22px 0 10px",
  color: tokens.ink2,
};

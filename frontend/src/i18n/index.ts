// i18next initialization for runtime UI internationalization (issue #5).
// Languages: it (default + fallback), en, es. The active language is read from
// localStorage key 'lang' (default 'it') and persisted there via setLanguage().
// Initialized synchronously and imported from main.tsx before the app renders,
// and from the test setup so t() returns real strings in tests.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  NAMESPACES,
  resources,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "./resources";

export const LANG_STORAGE_KEY = "lang";
export const DEFAULT_LANGUAGE: SupportedLanguage = "it";

export function isSupportedLanguage(v: unknown): v is SupportedLanguage {
  return typeof v === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(v);
}

// Read the persisted language, falling back to the default. Safe when there is
// no localStorage (SSR / tests) — returns the default.
export function getStoredLanguage(): SupportedLanguage {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isSupportedLanguage(v)) return v;
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_LANGUAGE;
}

// Change the active language and persist the choice. Ignores unsupported codes.
export function setLanguage(lang: string): void {
  if (!isSupportedLanguage(lang)) return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* localStorage unavailable */
  }
  void i18n.changeLanguage(lang);
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: getStoredLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    ns: NAMESPACES as unknown as string[],
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React already escapes
    returnNull: false,
  });
}

export { SUPPORTED_LANGUAGES };
export type { SupportedLanguage };
export default i18n;

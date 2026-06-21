// Aggregates all locale namespaces into the resource bundle i18next consumes.
// Each language exposes the SAME set of namespaces with the SAME key shape
// (enforced by src/i18n/resources.test.ts).
import itCommon from "./locales/it/common";
import itAuth from "./locales/it/auth";
import itDashboard from "./locales/it/dashboard";
import itEditor from "./locales/it/editor";
import itAdmin from "./locales/it/admin";
import itGame from "./locales/it/game";
import itReport from "./locales/it/report";
import itShare from "./locales/it/share";
import itQuestionTypes from "./locales/it/questionTypes";
import itTranslations from "./locales/it/translations";
import itScoring from "./locales/it/scoring";

import enCommon from "./locales/en/common";
import enAuth from "./locales/en/auth";
import enDashboard from "./locales/en/dashboard";
import enEditor from "./locales/en/editor";
import enAdmin from "./locales/en/admin";
import enGame from "./locales/en/game";
import enReport from "./locales/en/report";
import enShare from "./locales/en/share";
import enQuestionTypes from "./locales/en/questionTypes";
import enTranslations from "./locales/en/translations";
import enScoring from "./locales/en/scoring";

import esCommon from "./locales/es/common";
import esAuth from "./locales/es/auth";
import esDashboard from "./locales/es/dashboard";
import esEditor from "./locales/es/editor";
import esAdmin from "./locales/es/admin";
import esGame from "./locales/es/game";
import esReport from "./locales/es/report";
import esShare from "./locales/es/share";
import esQuestionTypes from "./locales/es/questionTypes";
import esTranslations from "./locales/es/translations";
import esScoring from "./locales/es/scoring";

export const NAMESPACES = [
  "common",
  "auth",
  "dashboard",
  "editor",
  "admin",
  "game",
  "report",
  "share",
  "questionTypes",
  "translations",
  "scoring",
] as const;

export const SUPPORTED_LANGUAGES = ["it", "en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const resources = {
  it: {
    common: itCommon,
    auth: itAuth,
    dashboard: itDashboard,
    editor: itEditor,
    admin: itAdmin,
    game: itGame,
    report: itReport,
    share: itShare,
    questionTypes: itQuestionTypes,
    translations: itTranslations,
    scoring: itScoring,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    editor: enEditor,
    admin: enAdmin,
    game: enGame,
    report: enReport,
    share: enShare,
    questionTypes: enQuestionTypes,
    translations: enTranslations,
    scoring: enScoring,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    dashboard: esDashboard,
    editor: esEditor,
    admin: esAdmin,
    game: esGame,
    report: esReport,
    share: esShare,
    questionTypes: esQuestionTypes,
    translations: esTranslations,
    scoring: esScoring,
  },
} as const;

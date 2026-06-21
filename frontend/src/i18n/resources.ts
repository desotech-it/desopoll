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

import enCommon from "./locales/en/common";
import enAuth from "./locales/en/auth";
import enDashboard from "./locales/en/dashboard";
import enEditor from "./locales/en/editor";
import enAdmin from "./locales/en/admin";
import enGame from "./locales/en/game";
import enReport from "./locales/en/report";
import enShare from "./locales/en/share";
import enQuestionTypes from "./locales/en/questionTypes";

import esCommon from "./locales/es/common";
import esAuth from "./locales/es/auth";
import esDashboard from "./locales/es/dashboard";
import esEditor from "./locales/es/editor";
import esAdmin from "./locales/es/admin";
import esGame from "./locales/es/game";
import esReport from "./locales/es/report";
import esShare from "./locales/es/share";
import esQuestionTypes from "./locales/es/questionTypes";

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
  },
} as const;

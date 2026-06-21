// Vitest setup: jest-dom matchers + automatic DOM cleanup between tests.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// Initialize i18next (default language 'it') so useTranslation()/t() return real
// strings in component tests without requiring an explicit provider.
import i18n from "../i18n";

afterEach(() => {
  cleanup();
  // Reset to the default language so a test that switched languages doesn't
  // leak into the next one.
  if (i18n.language !== "it") void i18n.changeLanguage("it");
});

// Runtime i18n tests (issue #5): a component renders the translated string under
// a non-default language, the LanguageSelector switches + persists the language,
// and getStoredLanguage reads localStorage.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  isSupportedLanguage,
  LANG_STORAGE_KEY,
  setLanguage,
} from "./index";
import { LanguageSelector } from "./LanguageSelector";

// A tiny consumer that surfaces a known key from the common namespace.
function Probe() {
  const { t } = useTranslation("common");
  return <div data-testid="logout">{t("actions.logout")}</div>;
}

// The test environment's built-in localStorage is unreliable (node's
// experimental store), so install a deterministic in-memory implementation we
// fully control. getStoredLanguage/setLanguage read/write this.
function installMemoryStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, "localStorage", { value: mock, configurable: true });
  return store;
}

let store: Map<string, string>;

beforeEach(() => {
  store = installMemoryStorage();
});

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage(DEFAULT_LANGUAGE);
  });
});

describe("i18n setup", () => {
  it("defaults to Italian and is initialized", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(DEFAULT_LANGUAGE).toBe("it");
    expect(i18n.t("actions.logout", { ns: "common" })).toBe("Esci");
  });

  it("validates supported language codes", () => {
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("es")).toBe(true);
    expect(isSupportedLanguage("it")).toBe(true);
    expect(isSupportedLanguage("fr")).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
  });

  it("reads the stored language (default when unset/invalid)", () => {
    expect(getStoredLanguage()).toBe("it");
    window.localStorage.setItem(LANG_STORAGE_KEY, "es");
    expect(getStoredLanguage()).toBe("es");
    window.localStorage.setItem(LANG_STORAGE_KEY, "xx");
    expect(getStoredLanguage()).toBe("it");
  });
});

describe("rendering under a non-default language", () => {
  it("shows the English string after changeLanguage", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    render(
      <I18nextProvider i18n={i18n}>
        <Probe />
      </I18nextProvider>,
    );
    expect(screen.getByTestId("logout")).toHaveTextContent("Log out");
  });

  it("shows the Spanish string after changeLanguage", async () => {
    await act(async () => {
      await i18n.changeLanguage("es");
    });
    render(
      <I18nextProvider i18n={i18n}>
        <Probe />
      </I18nextProvider>,
    );
    expect(screen.getByTestId("logout")).toHaveTextContent("Salir");
  });
});

describe("LanguageSelector", () => {
  it("switches the language and persists it to localStorage", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Probe />
        <LanguageSelector />
      </I18nextProvider>,
    );
    // Starts Italian. The EN button's accessible name is the localized language
    // name ("Inglese" while the UI is Italian).
    expect(screen.getByTestId("logout")).toHaveTextContent("Esci");

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Inglese" }));
    });

    expect(screen.getByTestId("logout")).toHaveTextContent("Log out");
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe("en");
  });

  it("ignores unsupported languages passed to setLanguage", () => {
    setLanguage("xx");
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).not.toBe("xx");
  });
});

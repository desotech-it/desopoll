// Smoke tests for the TranslationsDialog (issue #6): it loads translations, shows
// the available-language chips + completeness, lets the author edit a string and
// save it (translations.put), adds a language (quizzes.update), and closes.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Question } from "../../../api";

const getMock = vi.fn();
const putMock = vi.fn();
const updateMock = vi.fn();

vi.mock("../../../api", () => ({
  translations: {
    get: (...a: unknown[]) => getMock(...a),
    put: (...a: unknown[]) => putMock(...a),
  },
  quizzes: {
    update: (...a: unknown[]) => updateMock(...a),
  },
}));

import { TranslationsDialog } from "./TranslationsDialog";

const QUESTIONS: Question[] = [
  {
    id: "q1",
    position: 1,
    type: "single_choice",
    prompt: "What is 2+2?",
    image: null,
    time_limit_sec: 30,
    points_mode: "standard",
    speed_bonus: true,
    answer_spec: { options: [{ id: "o1", text: "Four" }], correct: ["o1"] },
  },
];

function renderDialog(props: Partial<React.ComponentProps<typeof TranslationsDialog>> = {}) {
  return render(
    <TranslationsDialog
      quizId="qz"
      quizTitle="Math quiz"
      baseLanguage="it"
      questions={QUESTIONS}
      initialAvailable={["it", "en"]}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

describe("TranslationsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // confirm() is used when removing a language; default to true.
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("loads translations and shows base + non-base language chips with completeness", async () => {
    getMock.mockResolvedValue({
      baseLanguage: "it",
      availableLanguages: ["it", "en"],
      entries: [
        { entity_type: "quiz", entity_id: "qz", lang: "en", field: "title", value: "Math quiz" },
      ],
    });
    renderDialog();

    // Base chip ("Italiano (base)") and the English tab appear.
    expect(await screen.findByText(/Italiano \(base\)/)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("qz");
    // 1 of 3 strings translated for EN (title only). 3 base strings: title, prompt, option.
    expect(await screen.findByText("1/3")).toBeInTheDocument();
  });

  it("edits a string and saves it via translations.put", async () => {
    getMock.mockResolvedValue({ baseLanguage: "it", availableLanguages: ["it", "en"], entries: [] });
    putMock.mockResolvedValue({ ok: true, upserted: 1, deleted: 0 });
    renderDialog();

    // The quiz-title input is the first translation field. Type a translation.
    const input = await screen.findByLabelText(/Math quiz/, { selector: "input" });
    fireEvent.change(input, { target: { value: "Quiz di matematica" } });

    const saveBtn = await screen.findByRole("button", { name: /Salva/ });
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(putMock).toHaveBeenCalledWith("qz", [
        { entity_type: "quiz", entity_id: "qz", lang: "en", field: "title", value: "Quiz di matematica" },
      ]),
    );
  });

  it("adds a language via quizzes.update", async () => {
    getMock.mockResolvedValue({ baseLanguage: "it", availableLanguages: ["it", "en"], entries: [] });
    updateMock.mockResolvedValue({
      quiz: { id: "qz", base_language: "it", available_languages: ["it", "en", "es"] },
    });
    const onLanguagesChange = vi.fn();
    renderDialog({ onLanguagesChange });

    // "+ Spagnolo" button (es is not yet in available).
    const addEs = await screen.findByRole("button", { name: /\+ Spagnolo/ });
    fireEvent.click(addEs);

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith("qz", { available_languages: ["it", "en", "es"] }),
    );
    await waitFor(() => expect(onLanguagesChange).toHaveBeenCalledWith(["it", "en", "es"]));
  });

  it("calls onClose when the close button is clicked", async () => {
    getMock.mockResolvedValue({ baseLanguage: "it", availableLanguages: ["it"], entries: [] });
    const onClose = vi.fn();
    renderDialog({ initialAvailable: ["it"], onClose });
    await screen.findByText(/Italiano \(base\)/);
    fireEvent.click(screen.getByLabelText("Chiudi"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a no-languages hint when only the base language is set", async () => {
    getMock.mockResolvedValue({ baseLanguage: "it", availableLanguages: ["it"], entries: [] });
    renderDialog({ initialAvailable: ["it"] });
    expect(await screen.findByText(/Aggiungi una lingua per iniziare/)).toBeInTheDocument();
  });
});

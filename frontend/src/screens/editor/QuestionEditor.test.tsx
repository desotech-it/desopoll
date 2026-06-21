// Tests for the per-question scoring controls (issue #8): the speed-bonus
// toggle renders, reflects question.speed_bonus, persists updates via the
// questions PATCH API, is disabled when scoring has no effect, and the
// "How does scoring work?" help panel can be expanded.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import type { Question } from "../../api";

// Mock the questions API so persistence is observable without network I/O.
// vi.hoisted keeps the spy accessible inside the hoisted vi.mock factory.
const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }));
vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api")>();
  return {
    ...actual,
    questions: { ...actual.questions, update: updateMock },
  };
});

// Imported AFTER the mock so the component picks up the mocked questions.update.
import { QuestionEditor } from "./QuestionEditor";

function question(overrides: Partial<Question> = {}): Question {
  const a = { id: "o1", text: "A" };
  const b = { id: "o2", text: "B" };
  return {
    id: "qid1",
    position: 0,
    type: "single_choice",
    prompt: "What?",
    image: null,
    time_limit_sec: 30,
    points_mode: "standard",
    speed_bonus: false,
    answer_spec: { options: [a, b], correct: [a.id] },
    ...overrides,
  };
}

function renderEditor(q: Question) {
  const onSaved = vi.fn();
  render(
    <QuestionEditor
      index={0}
      question={q}
      onSaved={onSaved}
      onDelete={vi.fn()}
      onError={vi.fn()}
      onMoveUp={vi.fn()}
      onMoveDown={vi.fn()}
      canMoveUp={false}
      canMoveDown={false}
      reordering={false}
    />,
  );
  return { onSaved };
}

describe("QuestionEditor speed-bonus toggle", () => {
  beforeEach(() => {
    updateMock.mockReset();
    updateMock.mockImplementation((_id: string, patch: Partial<Question>) =>
      Promise.resolve({ question: question(patch) }),
    );
  });

  it("renders reflecting speed_bonus=false (label shows 'Disattivato')", () => {
    renderEditor(question({ speed_bonus: false }));
    expect(screen.getByText("Disattivato")).toBeInTheDocument();
  });

  it("renders reflecting speed_bonus=true (label shows 'Attivo')", () => {
    renderEditor(question({ speed_bonus: true }));
    // The toggle label reads "Attivo" when on (also used by readOnly.yes, but
    // here it is the toggle's state label inside the scoring controls).
    expect(screen.getAllByText("Attivo").length).toBeGreaterThan(0);
  });

  it("persists speed_bonus=true when toggled on", async () => {
    const { onSaved } = renderEditor(question({ speed_bonus: false }));
    fireEvent.click(screen.getByText("Disattivato"));
    expect(updateMock).toHaveBeenCalledWith("qid1", { speed_bonus: true });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("disables the toggle when points_mode is 'none'", () => {
    renderEditor(question({ points_mode: "none", speed_bonus: false }));
    fireEvent.click(screen.getByText("Disattivato"));
    // pointer-events:none on the wrapper means clicking does not persist.
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("disables the toggle for survey types (poll)", () => {
    renderEditor(question({ type: "poll", answer_spec: { options: [{ id: "o1", text: "A" }] } }));
    fireEvent.click(screen.getByText("Disattivato"));
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("QuestionEditor scoring help", () => {
  beforeEach(() => updateMock.mockReset());

  it("shows the compact helper line with base points", () => {
    renderEditor(question());
    expect(screen.getByText(/1000 pt/)).toBeInTheDocument();
  });

  it("expands the 'How does scoring work?' panel with the formula", () => {
    renderEditor(question());
    fireEvent.click(screen.getByText("Come funziona il punteggio?"));
    const region = screen.getByRole("region", { name: "Come funziona il punteggio" });
    expect(within(region).getByText(/base × \(1 −/)).toBeInTheDocument();
    expect(within(region).getByText(/2000 punti/)).toBeInTheDocument();
  });

  it("shows the survey note for word_cloud", () => {
    renderEditor(question({ type: "word_cloud", answer_spec: {} }));
    expect(screen.getByText(/non vengono valutate/)).toBeInTheDocument();
  });
});

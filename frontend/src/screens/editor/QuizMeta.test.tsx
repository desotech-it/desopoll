// Tests the quiz meta editor's public toggle: it persists the inverted value,
// reflects saved state, and shows the correct published/private chip + hint.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuizMetaEditor } from "./QuizMeta";
import type { Quiz } from "../../api";

function quiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: "q1",
    title: "Quiz AWS",
    description: "desc",
    base_language: "it",
    is_public: false,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("QuizMetaEditor public toggle", () => {
  it("persists is_public=true when toggled on", async () => {
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<QuizMetaEditor quiz={quiz({ is_public: false })} onPatch={onPatch} />);
    fireEvent.click(screen.getByText("Quiz pubblico"));
    expect(onPatch).toHaveBeenCalledWith({ is_public: true });
    await waitFor(() => expect(screen.getByText(/Salvato/)).toBeInTheDocument());
  });

  it("persists is_public=false when toggled off", async () => {
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<QuizMetaEditor quiz={quiz({ is_public: true })} onPatch={onPatch} />);
    fireEvent.click(screen.getByText("Quiz pubblico"));
    expect(onPatch).toHaveBeenCalledWith({ is_public: false });
    await waitFor(() => expect(screen.getByText(/Salvato/)).toBeInTheDocument());
  });

  it("reflects the saved state with a 'Salvato' indicator", async () => {
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<QuizMetaEditor quiz={quiz({ is_public: false })} onPatch={onPatch} />);
    fireEvent.click(screen.getByText("Quiz pubblico"));
    await waitFor(() => expect(screen.getByText(/Salvato/)).toBeInTheDocument());
  });

  it("shows 'Pubblicato' chip and reuse hint when public", () => {
    render(<QuizMetaEditor quiz={quiz({ is_public: true })} onPatch={vi.fn()} />);
    expect(screen.getByText("Pubblicato")).toBeInTheDocument();
    expect(screen.getByText(/riutilizzabile da altri/i)).toBeInTheDocument();
  });

  it("shows 'Privato' chip when not public", () => {
    render(<QuizMetaEditor quiz={quiz({ is_public: false })} onPatch={vi.fn()} />);
    expect(screen.getByText("Privato")).toBeInTheDocument();
    expect(screen.getByText(/Visibile solo a te/i)).toBeInTheDocument();
  });
});

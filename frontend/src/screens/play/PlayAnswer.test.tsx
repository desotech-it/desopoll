// Smoke test for the player answer phase: a single_choice question renders one
// big button per option, and clicking one fires onAnswer with {optionId}. Also
// checks the "answered" state shows the waiting message.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayAnswer } from "./PlayPhases";
import { initialSnapshot, type GameSnapshot } from "../../game/types";

function activeSnapshot(): GameSnapshot {
  return {
    ...initialSnapshot,
    connected: true,
    state: "question_active",
    myPlayerId: "p1",
    currentIndex: 0,
    questionServerTime: Date.now(),
    question: {
      index: 0,
      total: 2,
      type: "single_choice",
      prompt: "Capitale d'Italia?",
      timeLimitSec: 30,
      options: [
        { id: "o1", text: "Roma" },
        { id: "o2", text: "Milano" },
        { id: "o3", text: "Napoli" },
        { id: "o4", text: "Torino" },
      ],
    },
  };
}

function orderingSnapshot(): GameSnapshot {
  return {
    ...initialSnapshot,
    connected: true,
    state: "question_active",
    myPlayerId: "p1",
    currentIndex: 0,
    questionServerTime: Date.now(),
    question: {
      index: 0,
      total: 1,
      type: "ordering",
      prompt: "Metti in ordine",
      timeLimitSec: 30,
      // Ordering ships under `items` (shuffled), NOT `options`.
      options: [],
      items: [
        { id: "i1", text: "Alpha" },
        { id: "i2", text: "Beta" },
        { id: "i3", text: "Gamma" },
      ],
    },
  };
}

function sliderSnapshot(): GameSnapshot {
  return {
    ...initialSnapshot,
    connected: true,
    state: "question_active",
    myPlayerId: "p1",
    currentIndex: 0,
    questionServerTime: Date.now(),
    question: {
      index: 0,
      total: 1,
      type: "slider",
      prompt: "In che anno?",
      timeLimitSec: 30,
      options: [],
      min: 1900,
      max: 2000,
      step: 1,
    },
  };
}

describe("PlayAnswer (ordering)", () => {
  it("renders the broadcast items from question.items", () => {
    render(<PlayAnswer snapshot={orderingSnapshot()} answered={false} onAnswer={() => {}} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    // The empty-state must NOT appear when items are present.
    expect(screen.queryByText(/Nessun elemento/)).not.toBeInTheDocument();
  });

  it("submits { order } with the item ids in the chosen order", () => {
    const onAnswer = vi.fn();
    render(<PlayAnswer snapshot={orderingSnapshot()} answered={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("button", { name: /Conferma ordine/ }));
    expect(onAnswer).toHaveBeenCalledWith({ order: ["i1", "i2", "i3"] });
  });
});

describe("PlayAnswer (slider)", () => {
  it("honors the broadcast min/max and submits a value in range", () => {
    const onAnswer = vi.fn();
    render(<PlayAnswer snapshot={sliderSnapshot()} answered={false} onAnswer={onAnswer} />);
    const range = screen.getByLabelText("Valore") as HTMLInputElement;
    expect(range.min).toBe("1900");
    expect(range.max).toBe("2000");
    // Default lands on the midpoint of the AUTHOR's range, not 0..100.
    expect(range.value).toBe("1950");
    fireEvent.change(range, { target: { value: "1969" } });
    fireEvent.click(screen.getByRole("button", { name: /Invia/ }));
    expect(onAnswer).toHaveBeenCalledWith({ value: 1969 });
  });
});

describe("PlayAnswer (single_choice)", () => {
  it("renders the prompt and one button per option", () => {
    render(<PlayAnswer snapshot={activeSnapshot()} answered={false} onAnswer={() => {}} />);
    expect(screen.getByText("Capitale d'Italia?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Roma/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Milano/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Napoli/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Torino/ })).toBeInTheDocument();
  });

  it("calls onAnswer with the chosen optionId", () => {
    const onAnswer = vi.fn();
    render(<PlayAnswer snapshot={activeSnapshot()} answered={false} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole("button", { name: /Napoli/ }));
    expect(onAnswer).toHaveBeenCalledWith({ optionId: "o3" });
  });

  it("shows the waiting message once answered", () => {
    render(<PlayAnswer snapshot={activeSnapshot()} answered={true} onAnswer={() => {}} />);
    expect(screen.getByText(/Risposta inviata/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Roma/ })).not.toBeInTheDocument();
  });

  it("lays out options in the responsive answer grid (single column on phones)", () => {
    // The options live inside .poll-answer-grid, which is 1fr on phones and
    // 1fr 1fr above the grid breakpoint (issue #7 responsive overhaul).
    const { container } = render(
      <PlayAnswer snapshot={activeSnapshot()} answered={false} onAnswer={() => {}} />,
    );
    const grid = container.querySelector(".poll-answer-grid");
    expect(grid).not.toBeNull();
    // All four option buttons are children of the grid.
    expect(grid!.querySelectorAll("button")).toHaveLength(4);
  });
});

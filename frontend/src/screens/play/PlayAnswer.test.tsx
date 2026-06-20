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
});

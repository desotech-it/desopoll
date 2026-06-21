// Tests for the host "Mostra risposte" (lock) results screen (issue #7 #2):
// once locked the host must see the answer distribution (with the correct option
// marked) and the leaderboard, and the "Prossima" button must fire send("next").
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HostResults } from "./HostPhases";
import { initialSnapshot, type GameSnapshot } from "../../game/types";

function resultsSnapshot(): GameSnapshot {
  return {
    ...initialSnapshot,
    connected: true,
    state: "question_results",
    currentIndex: 0,
    question: {
      index: 0,
      total: 2,
      type: "single_choice",
      prompt: "Capitale d'Italia?",
      timeLimitSec: 30,
      options: [
        { id: "o1", text: "Roma" },
        { id: "o2", text: "Milano" },
      ],
    },
    results: {
      index: 0,
      correctOptionIds: ["o1"],
      distribution: [
        { key: "o1", label: "Roma", count: 4 },
        { key: "o2", label: "Milano", count: 1 },
      ],
      answeredCount: 5,
      leaderboard: [
        { playerId: "p1", nickname: "Ann", score: 100, rank: 1 },
        { playerId: "p2", nickname: "Bob", score: 60, rank: 2 },
      ],
    },
  };
}

const props = (snapshot: GameSnapshot, send = vi.fn()) => ({
  snapshot,
  pin: "123456",
  send,
  sessionId: "s1",
});

describe("HostResults", () => {
  it("shows the distribution with each option's count and the correct mark", () => {
    render(<HostResults {...props(resultsSnapshot())} />);
    // Prompt is used as the results heading.
    expect(screen.getByText("Capitale d'Italia?")).toBeInTheDocument();
    // Distribution rows (labels + counts).
    expect(screen.getByText("Roma")).toBeInTheDocument();
    expect(screen.getByText("Milano")).toBeInTheDocument();
    // Count "4" is unique to the distribution here.
    expect(screen.getByText("4")).toBeInTheDocument();
    // The correct option is marked with a check glyph.
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders the leaderboard rows", () => {
    render(<HostResults {...props(resultsSnapshot())} />);
    expect(screen.getByText("Classifica")).toBeInTheDocument();
    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("fires send('next') when the host advances", () => {
    const send = vi.fn();
    render(<HostResults {...props(resultsSnapshot(), send)} />);
    fireEvent.click(screen.getByRole("button", { name: /Prossima/ }));
    expect(send).toHaveBeenCalledWith("next");
  });

  it("renders nothing until results have arrived (no crash on lock-in-flight)", () => {
    const { container } = render(
      <HostResults {...props({ ...resultsSnapshot(), results: null })} />,
    );
    expect(container.textContent).toBe("");
  });
});

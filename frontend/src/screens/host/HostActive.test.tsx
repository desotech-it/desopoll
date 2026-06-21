// Tests for the host active-question screen (issue #9): the host must render the
// ordering items it broadcasts (from question.items, shuffled, no correctOrder)
// and show the slider scale hint from the broadcast min/max.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HostActive } from "./HostPhases";
import { initialSnapshot, type GameSnapshot } from "../../game/types";

function activeSnapshot(question: GameSnapshot["question"]): GameSnapshot {
  return {
    ...initialSnapshot,
    connected: true,
    state: "question_active",
    currentIndex: 0,
    questionServerTime: Date.now(),
    question,
  };
}

const props = (snapshot: GameSnapshot) => ({
  snapshot,
  pin: "123456",
  send: vi.fn(),
  sessionId: "s1",
});

describe("HostActive (ordering)", () => {
  it("renders the broadcast items list instead of the waiting note", () => {
    const snapshot = activeSnapshot({
      index: 0,
      total: 1,
      type: "ordering",
      prompt: "Ordina",
      timeLimitSec: 30,
      options: [],
      items: [
        { id: "i1", text: "Uno" },
        { id: "i2", text: "Due" },
      ],
    });
    render(<HostActive {...props(snapshot)} />);
    expect(screen.getByText("Uno")).toBeInTheDocument();
    expect(screen.getByText("Due")).toBeInTheDocument();
    expect(screen.queryByText(/stanno ordinando/)).not.toBeInTheDocument();
  });

  it("falls back to the waiting note when no items are present", () => {
    const snapshot = activeSnapshot({
      index: 0,
      total: 1,
      type: "ordering",
      prompt: "Ordina",
      timeLimitSec: 30,
      options: [],
      items: [],
    });
    render(<HostActive {...props(snapshot)} />);
    expect(screen.getByText(/stanno ordinando/)).toBeInTheDocument();
  });
});

describe("HostActive (slider)", () => {
  it("shows the author's range in the slider hint", () => {
    const snapshot = activeSnapshot({
      index: 0,
      total: 1,
      type: "slider",
      prompt: "Anno?",
      timeLimitSec: 30,
      options: [],
      min: 1900,
      max: 2000,
      step: 1,
    });
    render(<HostActive {...props(snapshot)} />);
    // The wait note interpolates "(1900–2000)" into the slider hint.
    expect(screen.getByText(/1900–2000/)).toBeInTheDocument();
  });
});

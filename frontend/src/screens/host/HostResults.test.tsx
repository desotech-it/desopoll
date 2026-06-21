// Tests for the host "Mostra risposte" (lock) results screen (issue #7 #2):
// once locked the host must see the answer distribution (with the correct option
// marked) and the leaderboard, and the "Prossima" button must fire send("next").
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

function orderingResultsSnapshot(): GameSnapshot {
  return {
    ...initialSnapshot,
    connected: true,
    state: "question_results",
    currentIndex: 0,
    question: {
      index: 0,
      total: 1,
      type: "ordering",
      prompt: "Metti in ordine i pianeti",
      timeLimitSec: 30,
      options: [],
      // Items ship shuffled; the reveal must re-map ids -> labels in correctOrder.
      items: [
        { id: "i2", text: "Venere" },
        { id: "i3", text: "Terra" },
        { id: "i1", text: "Mercurio" },
      ],
    },
    results: {
      index: 0,
      correctOptionIds: [],
      correctOrder: ["i1", "i2", "i3"],
      distribution: [
        { key: "exact", label: "Ordine corretto", count: 2 },
        { key: "partial", label: "Parzialmente corretto", count: 1 },
        { key: "none", label: "Ordine errato", count: 1 },
      ],
      answeredCount: 4,
      leaderboard: [{ playerId: "p1", nickname: "Ann", score: 100, rank: 1 }],
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

describe("HostResults (ordering)", () => {
  it("shows the exact/partial/wrong distribution buckets", () => {
    render(<HostResults {...props(orderingResultsSnapshot())} />);
    // "Ordine corretto" appears as a bucket label (span) AND the reveal heading
    // (h3); both buckets and the partial/wrong labels must render.
    expect(screen.getAllByText("Ordine corretto").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Parzialmente corretto")).toBeInTheDocument();
    expect(screen.getByText("Ordine errato")).toBeInTheDocument();
  });

  it("reveals the correct sequence by mapping correctOrder ids to item labels", () => {
    const { container } = render(<HostResults {...props(orderingResultsSnapshot())} />);
    // The reveal section is titled with host.correctOrder.
    const heading = screen.getByText("Ordine corretto", { selector: "h3" });
    // Walk to the reveal block (sibling of the heading) and assert the ordered labels.
    const block = heading.parentElement as HTMLElement;
    const reveal = within(block);
    expect(reveal.getByText("Mercurio")).toBeInTheDocument(); // i1 first
    expect(reveal.getByText("Venere")).toBeInTheDocument(); // i2 second
    expect(reveal.getByText("Terra")).toBeInTheDocument(); // i3 third
    expect(container).toBeTruthy();
  });

  it("omits the correct-order reveal for non-ordering questions", () => {
    render(<HostResults {...props(resultsSnapshot())} />);
    expect(screen.queryByText("Ordine corretto", { selector: "h3" })).not.toBeInTheDocument();
  });
});

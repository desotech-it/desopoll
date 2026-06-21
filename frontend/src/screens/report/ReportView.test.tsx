// Smoke test for the post-game report view: it renders the summary, per-question
// stats with distribution bars, and the final standings.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportView } from "./ReportView";
import type { SessionReport } from "../../api";

function sampleReport(): SessionReport {
  return {
    session: {
      id: "s1",
      quizId: "quiz1",
      state: "ended",
      startedAt: "2026-01-01T00:00:00Z",
      endedAt: "2026-01-01T00:03:00Z",
      playerCount: 3,
    },
    questions: [
      {
        questionId: "q1",
        prompt: "Capitale d'Italia?",
        type: "single_choice",
        answeredCount: 3,
        correctCount: 2,
        correctPct: 67,
        distribution: [
          { key: "a", label: "Roma", count: 2 },
          { key: "b", label: "Milano", count: 1 },
        ],
      },
      {
        questionId: "q2",
        prompt: "Parola che ti rappresenta?",
        type: "word_cloud",
        answeredCount: 3,
        correctCount: 0,
        correctPct: 0,
        distribution: [{ key: "ciao", label: "ciao", count: 3 }],
      },
    ],
    standings: [
      { nickname: "Anna", score: 1800, rank: 1 },
      { nickname: "Bruno", score: 1200, rank: 2 },
    ],
  };
}

describe("ReportView", () => {
  it("renders the summary, winner and standings", () => {
    render(<ReportView report={sampleReport()} />);
    expect(screen.getByText("Risultati della partita")).toBeInTheDocument();
    expect(screen.getByText(/Vincitore: Anna/)).toBeInTheDocument();
    expect(screen.getByText("Classifica finale")).toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
  });

  it("renders each question prompt and distribution labels", () => {
    render(<ReportView report={sampleReport()} />);
    expect(screen.getByText("Capitale d'Italia?")).toBeInTheDocument();
    expect(screen.getByText("Roma")).toBeInTheDocument();
    expect(screen.getByText("Milano")).toBeInTheDocument();
    expect(screen.getByText("Parola che ti rappresenta?")).toBeInTheDocument();
  });

  it("shows the correct-percentage meter only for scored questions", () => {
    render(<ReportView report={sampleReport()} />);
    // single_choice is scored → "Risposte corrette" meter present; word_cloud is not.
    const meters = screen.getAllByText("Risposte corrette");
    expect(meters.length).toBe(1);
  });

  it("handles an empty report gracefully", () => {
    const empty: SessionReport = {
      session: { id: "s", quizId: "q", state: "ended", startedAt: null, endedAt: null, playerCount: 0 },
      questions: [],
      standings: [],
    };
    render(<ReportView report={empty} />);
    expect(screen.getByText(/Nessuna domanda registrata/)).toBeInTheDocument();
    expect(screen.getByText(/Nessun punteggio registrato/)).toBeInTheDocument();
  });
});

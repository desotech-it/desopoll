// Smoke tests for the player answer controls of the 4 newer question types.
// Each must emit the exact payload contract.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumericInput, OrderingInput, SliderInput, WordCloudInput } from "./PlayInputs";
import type { LiveQuestion } from "../../game/types";

function sliderQ(extra: Partial<LiveQuestion> = {}): LiveQuestion {
  return {
    index: 0,
    total: 1,
    type: "slider",
    prompt: "Quanto?",
    timeLimitSec: 30,
    options: [],
    min: 0,
    max: 10,
    step: 1,
    ...extra,
  };
}

describe("NumericInput", () => {
  it("submits a numeric value", () => {
    const onSubmit = vi.fn();
    render(<NumericInput onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Risposta numerica"), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: /Invia/ }));
    expect(onSubmit).toHaveBeenCalledWith(42);
  });

  it("disables submit until a valid number is entered", () => {
    const onSubmit = vi.fn();
    render(<NumericInput onSubmit={onSubmit} />);
    const btn = screen.getByRole("button", { name: /Invia/ });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("SliderInput", () => {
  it("defaults to the midpoint and submits the chosen value", () => {
    const onSubmit = vi.fn();
    render(<SliderInput question={sliderQ()} onSubmit={onSubmit} />);
    const range = screen.getByLabelText("Valore") as HTMLInputElement;
    expect(range.value).toBe("5"); // midpoint of 0..10
    fireEvent.change(range, { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: /Invia/ }));
    expect(onSubmit).toHaveBeenCalledWith(8);
  });

  it("falls back to a sane range when bounds are missing", () => {
    const onSubmit = vi.fn();
    render(<SliderInput question={sliderQ({ min: undefined, max: undefined, step: undefined })} onSubmit={onSubmit} />);
    const range = screen.getByLabelText("Valore") as HTMLInputElement;
    expect(range.min).toBe("0");
    expect(range.max).toBe("100");
  });
});

describe("OrderingInput", () => {
  const opts = [
    { id: "a", text: "Primo" },
    { id: "b", text: "Secondo" },
    { id: "c", text: "Terzo" },
  ];

  it("submits the initial order unchanged", () => {
    const onSubmit = vi.fn();
    render(<OrderingInput items={opts} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Conferma ordine/ }));
    expect(onSubmit).toHaveBeenCalledWith(["a", "b", "c"]);
  });

  it("renders every broadcast item so the player can reorder them", () => {
    render(<OrderingInput items={opts} onSubmit={() => {}} />);
    expect(screen.getByText("Primo")).toBeInTheDocument();
    expect(screen.getByText("Secondo")).toBeInTheDocument();
    expect(screen.getByText("Terzo")).toBeInTheDocument();
  });

  it("reorders items with the move-down arrow", () => {
    const onSubmit = vi.fn();
    render(<OrderingInput items={opts} onSubmit={onSubmit} />);
    // First "Sposta giù" belongs to the first item (Primo) → swaps a and b.
    const downs = screen.getAllByLabelText("Sposta giù");
    fireEvent.click(downs[0]);
    fireEvent.click(screen.getByRole("button", { name: /Conferma ordine/ }));
    expect(onSubmit).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("reorders items with the move-up arrow", () => {
    const onSubmit = vi.fn();
    render(<OrderingInput items={opts} onSubmit={onSubmit} />);
    // Last "Sposta su" belongs to the last item (Terzo) → swaps b and c.
    const ups = screen.getAllByLabelText("Sposta su");
    fireEvent.click(ups[ups.length - 1]);
    fireEvent.click(screen.getByRole("button", { name: /Conferma ordine/ }));
    expect(onSubmit).toHaveBeenCalledWith(["a", "c", "b"]);
  });

  it("shows a fallback when there are no items", () => {
    render(<OrderingInput items={[]} onSubmit={() => {}} />);
    expect(screen.getByText(/Nessun elemento/)).toBeInTheDocument();
  });
});

describe("WordCloudInput", () => {
  it("submits a trimmed word as text", () => {
    const onSubmit = vi.fn();
    render(<WordCloudInput onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("La tua parola"), { target: { value: "  futuro " } });
    fireEvent.click(screen.getByRole("button", { name: /Invia/ }));
    expect(onSubmit).toHaveBeenCalledWith("futuro");
  });
});

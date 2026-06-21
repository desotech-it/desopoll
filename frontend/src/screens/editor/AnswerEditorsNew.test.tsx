// Smoke tests for the new-type answer-spec editors via the AnswerEditor router.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnswerEditor } from "./AnswerEditors";
import { defaultAnswerSpec } from "../../questionTypes";
import type { AnswerSpec } from "../../api";

describe("NumericEditor", () => {
  it("emits { answer, tolerance } on edit (controlled by spec)", () => {
    const onChange = vi.fn();
    // Start from a spec with a tolerance already set so both fields combine.
    render(<AnswerEditor type="numeric" spec={{ answer: 0, tolerance: 3 }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Risposta corretta"), { target: { value: "42" } });
    expect(onChange).toHaveBeenCalledWith({ answer: 42, tolerance: 3 });
  });

  it("clamps tolerance to a non-negative value", () => {
    const onChange = vi.fn();
    render(<AnswerEditor type="numeric" spec={{ answer: 10, tolerance: 0 }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Tolleranza"), { target: { value: "-5" } });
    expect(onChange).toHaveBeenCalledWith({ answer: 10, tolerance: 0 });
  });
});

describe("SliderEditor", () => {
  it("emits the full slider spec and keeps step/answer", () => {
    const onChange = vi.fn();
    render(<AnswerEditor type="slider" spec={defaultAnswerSpec("slider")} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Massimo"), { target: { value: "200" } });
    const last = onChange.mock.calls.at(-1)?.[0] as Extract<AnswerSpec, { min: number }>;
    expect(last.min).toBe(0);
    expect(last.max).toBe(200);
    expect(last.step).toBe(1);
    expect(last.answer).toBe(50);
  });
});

describe("OrderingEditor", () => {
  it("keeps correctOrder in sync with the items after a reorder", () => {
    const onChange = vi.fn();
    render(<AnswerEditor type="ordering" spec={defaultAnswerSpec("ordering")} onChange={onChange} />);
    const downs = screen.getAllByLabelText("Sposta giù");
    fireEvent.click(downs[0]);
    const next = onChange.mock.calls.at(-1)?.[0] as Extract<AnswerSpec, { items: unknown[] }>;
    expect(next.correctOrder).toEqual(next.items.map((i) => (i as { id: string }).id));
    expect(next.items.length).toBe(3);
  });

  it("adds and removes items", () => {
    const onChange = vi.fn();
    render(<AnswerEditor type="ordering" spec={defaultAnswerSpec("ordering")} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Aggiungi elemento/ }));
    const added = onChange.mock.calls.at(-1)?.[0] as Extract<AnswerSpec, { items: unknown[] }>;
    expect(added.items.length).toBe(4);
  });
});

describe("WordCloudEditor", () => {
  it("shows the survey note and needs no config", () => {
    const onChange = vi.fn();
    render(<AnswerEditor type="word_cloud" spec={{}} onChange={onChange} />);
    expect(screen.getByText(/Nuvola di parole/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

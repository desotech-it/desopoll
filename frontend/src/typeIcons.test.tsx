// Each question type must map to a DISTINCT icon key, and every type in
// QUESTION_TYPES must have an icon. Also a light render smoke test.
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { QUESTION_TYPES, typeIconKey } from "./questionTypes";
import type { QuestionType } from "./api";
import { TypeIcon, TypeChip } from "./typeIcons";

const ALL_TYPES: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "poll",
  "open_text",
  "numeric",
  "slider",
  "ordering",
  "word_cloud",
];

describe("question type icons", () => {
  it("maps each type to a distinct icon key", () => {
    const keys = ALL_TYPES.map((t) => typeIconKey(t));
    expect(new Set(keys).size).toBe(ALL_TYPES.length);
  });

  it("gives every QUESTION_TYPES entry a non-empty icon and tone", () => {
    for (const t of QUESTION_TYPES) {
      expect(t.icon).toBeTruthy();
      expect(t.tone).toBeTruthy();
    }
    // The icons listed in metadata are themselves distinct.
    const icons = QUESTION_TYPES.map((t) => t.icon);
    expect(new Set(icons).size).toBe(QUESTION_TYPES.length);
  });

  it("renders a distinct <svg> for each type (TypeIcon)", () => {
    const svgs = ALL_TYPES.map((t) => {
      const { container } = render(<TypeIcon type={t} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      return svg!.innerHTML;
    });
    // The drawn glyph markup differs between every pair of types.
    expect(new Set(svgs).size).toBe(ALL_TYPES.length);
  });

  it("falls back to the 'single' icon for an unknown type", () => {
    expect(typeIconKey("does_not_exist" as QuestionType)).toBe("single");
  });

  it("renders the type name inside TypeChip", () => {
    const { getByText } = render(<TypeChip type="poll" name="Sondaggio" />);
    expect(getByText("Sondaggio")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { itemsOf, optionsOf, shuffle, shuffledItemsOf, sliderRangeOf } from "../src/game/runtime.js";

describe("optionsOf", () => {
  it("maps spec.options to id+text", () => {
    expect(optionsOf({ options: [{ id: "a", text: "A" }], correct: ["a"] } as never)).toEqual([
      { id: "a", text: "A" },
    ]);
  });
  it("returns [] when there are no options (ordering/numeric/etc.)", () => {
    expect(optionsOf({ items: [{ id: "a", text: "A" }], correctOrder: ["a"] } as never)).toEqual([]);
    expect(optionsOf({ answer: 1 } as never)).toEqual([]);
  });
});

describe("itemsOf", () => {
  it("maps ordering spec.items to id+text", () => {
    const spec = { items: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOrder: ["a", "b"] } as never;
    expect(itemsOf(spec)).toEqual([{ id: "a", text: "A" }, { id: "b", text: "B" }]);
  });
  it("returns [] for specs without items", () => {
    expect(itemsOf({ options: [{ id: "a", text: "A" }] } as never)).toEqual([]);
  });
});

describe("shuffle", () => {
  it("preserves the multiset of elements", () => {
    const out = shuffle([1, 2, 3, 4, 5]);
    expect(out.slice().sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    shuffle(input, () => 0.99);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("shuffledItemsOf", () => {
  const spec = {
    items: [{ id: "a", text: "1" }, { id: "b", text: "2" }, { id: "c", text: "3" }],
    correctOrder: ["a", "b", "c"],
  } as never;

  it("returns all items (id+text), same multiset as the spec", () => {
    const out = shuffledItemsOf(spec);
    expect(out.map((o) => o.id).sort()).toEqual(["a", "b", "c"]);
    expect(out).toContainEqual({ id: "a", text: "1" });
  });

  it("never broadcasts the correct (identity) order when 2+ items exist", () => {
    // RNG that would otherwise leave the array in place (Fisher–Yates with j===i each step):
    // the anti-leak retry/rotation must still change the order away from correctOrder.
    const out = shuffledItemsOf(spec, () => 0);
    expect(out.map((o) => o.id).join(" ")).not.toBe("a b c");
  });

  it("passes a single-item list through unchanged", () => {
    const single = { items: [{ id: "a", text: "1" }], correctOrder: ["a"] } as never;
    expect(shuffledItemsOf(single)).toEqual([{ id: "a", text: "1" }]);
  });

  it("returns [] when the spec has no items", () => {
    expect(shuffledItemsOf({ answer: 1 } as never)).toEqual([]);
  });
});

describe("sliderRangeOf", () => {
  it("extracts min/max/step from a slider spec, excluding answer/tolerance", () => {
    const range = sliderRangeOf({ min: 1900, max: 2025, step: 5, answer: 1969, tolerance: 1 } as never);
    expect(range).toEqual({ min: 1900, max: 2025, step: 5 });
    expect(range).not.toHaveProperty("answer");
    expect(range).not.toHaveProperty("tolerance");
  });
  it("omits non-finite or missing numeric fields", () => {
    expect(sliderRangeOf({ min: 0, answer: 5 } as never)).toEqual({ min: 0 });
    expect(sliderRangeOf({} as never)).toEqual({});
  });
});

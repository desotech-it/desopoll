import { describe, it, expect } from "vitest";
import { validateOrder, computePositions } from "../src/routes/question-order.js";

describe("validateOrder", () => {
  const ids = ["a", "b", "c"];

  it("accepts a valid permutation", () => {
    expect(validateOrder(ids, ["c", "a", "b"])).toEqual({ ok: true });
  });

  it("accepts the identity order", () => {
    expect(validateOrder(ids, ["a", "b", "c"])).toEqual({ ok: true });
  });

  it("rejects a wrong length", () => {
    expect(validateOrder(ids, ["a", "b"])).toEqual({
      ok: false,
      error: "order must list every question exactly once",
    });
    expect(validateOrder(ids, ["a", "b", "c", "d"]).ok).toBe(false);
  });

  it("rejects duplicate ids", () => {
    expect(validateOrder(ids, ["a", "a", "b"])).toEqual({
      ok: false,
      error: "order contains duplicate ids",
    });
  });

  it("rejects an id not in the quiz", () => {
    expect(validateOrder(ids, ["a", "b", "z"])).toEqual({
      ok: false,
      error: "order contains an id not in this quiz",
    });
  });

  it("rejects a non-array", () => {
    expect(validateOrder(ids, undefined as never).ok).toBe(false);
    expect(validateOrder(ids, "abc" as never).ok).toBe(false);
  });

  it("rejects non-string / empty entries", () => {
    expect(validateOrder(ids, ["a", "", "b"]).ok).toBe(false);
    expect(validateOrder(ids, ["a", 2 as never, "b"]).ok).toBe(false);
  });

  it("handles the empty quiz case", () => {
    expect(validateOrder([], [])).toEqual({ ok: true });
  });
});

describe("computePositions", () => {
  it("assigns 1..n in the given order", () => {
    expect(computePositions(["c", "a", "b"])).toEqual([
      { id: "c", position: 1 },
      { id: "a", position: 2 },
      { id: "b", position: 3 },
    ]);
  });

  it("returns an empty list for no ids", () => {
    expect(computePositions([])).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { normalizeAvailableLanguages } from "../src/routes/quizzes.js";

describe("normalizeAvailableLanguages", () => {
  it("returns null when absent (leave column untouched)", () => {
    expect(normalizeAvailableLanguages(undefined)).toBeNull();
    expect(normalizeAvailableLanguages(null)).toBeNull();
  });
  it("returns null for non-array input", () => {
    expect(normalizeAvailableLanguages("it")).toBeNull();
    expect(normalizeAvailableLanguages(42)).toBeNull();
    expect(normalizeAvailableLanguages({})).toBeNull();
  });
  it("returns null when any element is not a string", () => {
    expect(normalizeAvailableLanguages(["it", 3])).toBeNull();
  });
  it("trims, drops blanks, and de-duplicates", () => {
    expect(normalizeAvailableLanguages([" it ", "en", "en", "", "  "]))
      .toEqual(["it", "en"]);
  });
  it("accepts an empty array", () => {
    expect(normalizeAvailableLanguages([])).toEqual([]);
  });
});

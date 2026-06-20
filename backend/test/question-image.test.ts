import { describe, it, expect } from "vitest";
import { validateImage, MAX_IMAGE_CHARS } from "../src/routes/question-image.js";

describe("validateImage", () => {
  it("accepts null (clear image)", () => {
    expect(validateImage(null)).toEqual({ ok: true, value: null });
  });

  it("accepts a small data URL", () => {
    const url = "data:image/png;base64,iVBORw0KGgo=";
    expect(validateImage(url)).toEqual({ ok: true, value: url });
  });

  it("rejects a string that is not a data URL", () => {
    expect(validateImage("https://example.com/cat.png")).toEqual({
      ok: false,
      error: "image must be a data URL or null",
    });
  });

  it("rejects a string longer than the cap with 'image too large'", () => {
    const big = "data:image/png;base64," + "A".repeat(MAX_IMAGE_CHARS);
    expect(validateImage(big)).toEqual({ ok: false, error: "image too large" });
  });

  it("accepts a data URL exactly at the cap", () => {
    const exact = "data:" + "A".repeat(MAX_IMAGE_CHARS - "data:".length);
    expect(exact.length).toBe(MAX_IMAGE_CHARS);
    expect(validateImage(exact).ok).toBe(true);
  });

  it("checks size before shape (oversized non-data string is 'image too large')", () => {
    const big = "x".repeat(MAX_IMAGE_CHARS + 1);
    expect(validateImage(big)).toEqual({ ok: false, error: "image too large" });
  });

  it("rejects non-string, non-null values", () => {
    expect(validateImage(123).ok).toBe(false);
    expect(validateImage({ url: "x" }).ok).toBe(false);
    expect(validateImage(["data:..."]).ok).toBe(false);
    expect(validateImage(true).ok).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { generatePin, isValidPin } from "../src/game/pin.js";

describe("generatePin", () => {
  it("produces a 6-digit numeric string", () => {
    const pin = generatePin();
    expect(pin).toMatch(/^\d{6}$/);
  });
  it("is deterministic with an injected rng", () => {
    const seq = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5];
    let i = 0;
    const rand = () => seq[i++];
    expect(generatePin(rand)).toBe("012345");
  });
});

describe("isValidPin", () => {
  it("accepts exactly 6 digits", () => {
    expect(isValidPin("000000")).toBe(true);
    expect(isValidPin("123456")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12a456")).toBe(false);
    expect(isValidPin("")).toBe(false);
  });
});

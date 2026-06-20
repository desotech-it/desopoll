// Pure-helper tests for the image resize geometry + data-URL byte estimate.
import { describe, it, expect } from "vitest";
import { fitWithin, dataUrlByteLength, MAX_DIM } from "./imageResize";

describe("fitWithin", () => {
  it("does not upscale images already within the box", () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ w: 800, h: 600 });
    expect(fitWithin(1024, 1024, 1024)).toEqual({ w: 1024, h: 1024 });
  });

  it("scales a wide image so the longest side equals maxDim", () => {
    // 4000x2000, max 1024 -> 1024x512 (preserve 2:1).
    expect(fitWithin(4000, 2000, 1024)).toEqual({ w: 1024, h: 512 });
  });

  it("scales a tall image so the longest side equals maxDim", () => {
    // 2000x4000, max 1024 -> 512x1024.
    expect(fitWithin(2000, 4000, 1024)).toEqual({ w: 512, h: 1024 });
  });

  it("scales a square image down to maxDim x maxDim", () => {
    expect(fitWithin(3000, 3000, 1024)).toEqual({ w: 1024, h: 1024 });
  });

  it("rounds to whole pixels and never produces a zero dimension", () => {
    const r = fitWithin(1023, 5, 1024); // within box -> unchanged, rounded
    expect(r).toEqual({ w: 1023, h: 5 });
    const tiny = fitWithin(5000, 3, 1000); // 1000 x 0.6 -> clamps to 1
    expect(tiny.w).toBe(1000);
    expect(tiny.h).toBe(1);
  });

  it("defends against invalid input", () => {
    expect(fitWithin(0, 0, 1024)).toEqual({ w: 1, h: 1 });
    expect(fitWithin(-10, 100, 1024)).toEqual({ w: 1, h: 1 });
    expect(fitWithin(NaN, 100, 1024)).toEqual({ w: 1, h: 1 });
  });

  it("uses the default MAX_DIM constant of 1024", () => {
    expect(MAX_DIM).toBe(1024);
    expect(fitWithin(2048, 2048, MAX_DIM)).toEqual({ w: 1024, h: 1024 });
  });
});

describe("dataUrlByteLength", () => {
  it("estimates the payload size of a base64 data URL", () => {
    // "AAAA" (4 chars, no padding) decodes to 3 bytes.
    expect(dataUrlByteLength("data:image/jpeg;base64,AAAA")).toBe(3);
  });

  it("accounts for padding characters", () => {
    // "AAA=" -> 2 bytes; "AA==" -> 1 byte.
    expect(dataUrlByteLength("data:image/png;base64,AAA=")).toBe(2);
    expect(dataUrlByteLength("data:image/png;base64,AA==")).toBe(1);
  });

  it("tolerates a raw base64 string with no data: prefix", () => {
    expect(dataUrlByteLength("AAAAAAAA")).toBe(6); // 8 chars -> 6 bytes
  });
});

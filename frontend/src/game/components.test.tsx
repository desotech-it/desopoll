// Tests that the shared game components render the question image when present
// and skip it when absent.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionHeader, QuestionImage } from "./components";
import type { LiveQuestion } from "./types";

const DATA_URL = "data:image/jpeg;base64,/9j/AAAA";

function question(image?: string | null): LiveQuestion {
  return {
    index: 0,
    total: 3,
    type: "single_choice",
    prompt: "Qual è la capitale?",
    image,
    timeLimitSec: 30,
    options: [{ id: "o1", text: "Roma" }],
  };
}

describe("QuestionImage", () => {
  it("renders nothing without a src", () => {
    const { container } = render(<QuestionImage src={null} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders an img with the data URL when present", () => {
    const { container } = render(<QuestionImage src={DATA_URL} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe(DATA_URL);
  });
});

describe("QuestionHeader", () => {
  it("shows the prompt and the question image when the question carries one", () => {
    const { container } = render(<QuestionHeader question={question(DATA_URL)} />);
    expect(screen.getByText("Qual è la capitale?")).toBeInTheDocument();
    expect(container.querySelector("img")?.getAttribute("src")).toBe(DATA_URL);
  });

  it("omits the image element when there is no image", () => {
    const { container } = render(<QuestionHeader question={question(null)} />);
    expect(container.querySelector("img")).toBeNull();
  });
});

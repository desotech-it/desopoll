// Tests the image picker UI (no canvas needed): preview thumbnail when an image
// is set, a Remove button that clears it, and an upload affordance when empty.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImagePicker } from "./ImagePicker";

const DATA_URL = "data:image/jpeg;base64,/9j/AAAA";

describe("ImagePicker", () => {
  it("shows an 'add image' affordance when empty", () => {
    render(<ImagePicker image={null} onChange={() => {}} />);
    expect(screen.getByText(/Aggiungi immagine/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/Anteprima/i)).not.toBeInTheDocument();
  });

  it("renders a preview thumbnail when an image is set", () => {
    render(<ImagePicker image={DATA_URL} onChange={() => {}} />);
    const img = screen.getByAltText(/Anteprima immagine domanda/i) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("base64");
  });

  it("clears the image (onChange null) when Remove is clicked", () => {
    const onChange = vi.fn();
    render(<ImagePicker image={DATA_URL} onChange={onChange} />);
    fireEvent.click(screen.getByText("Rimuovi"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("exposes a hidden file input that accepts images", () => {
    render(<ImagePicker image={null} onChange={() => {}} />);
    const input = screen.getByLabelText("Carica immagine") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe("image/*");
  });
});

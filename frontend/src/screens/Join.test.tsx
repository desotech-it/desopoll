// Smoke test for the Join PIN-entry form: it renders, validates a 6-digit PIN,
// and the validation helper is exercised directly.
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Join, isValidPin } from "./Join";

function renderJoin() {
  return render(
    <MemoryRouter initialEntries={["/join"]}>
      <Join />
    </MemoryRouter>,
  );
}

describe("isValidPin", () => {
  it("accepts exactly 6 digits", () => {
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin(" 654321 ")).toBe(true);
  });
  it("rejects wrong length or non-digits", () => {
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12a456")).toBe(false);
    expect(isValidPin("")).toBe(false);
  });
});

describe("Join form", () => {
  it("renders the PIN input and the entry button", () => {
    renderJoin();
    expect(screen.getByLabelText("PIN di gioco")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entra/i })).toBeInTheDocument();
  });

  it("strips non-digits and caps input at 6 digits", () => {
    renderJoin();
    const input = screen.getByLabelText("PIN di gioco") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12ab34567890" } });
    expect(input.value).toBe("123456");
  });

  it("keeps the Entra button disabled until a 6-digit PIN is entered", () => {
    renderJoin();
    const btn = screen.getByRole("button", { name: /entra/i }) as HTMLButtonElement;
    expect(btn).toBeDisabled();
    const input = screen.getByLabelText("PIN di gioco");
    fireEvent.change(input, { target: { value: "12345" } });
    expect(btn).toBeDisabled();
    fireEvent.change(input, { target: { value: "123456" } });
    expect(btn).not.toBeDisabled();
  });

  it("offers a link back to the organizer login", () => {
    renderJoin();
    expect(screen.getByText(/sei un organizzatore/i)).toBeInTheDocument();
  });
});

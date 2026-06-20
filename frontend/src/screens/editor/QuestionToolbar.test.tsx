// Tests the per-question reorder/delete toolbar: buttons fire callbacks and are
// disabled at the list boundaries / while a reorder is in flight.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionToolbar } from "./QuestionToolbar";

function setup(overrides: Partial<React.ComponentProps<typeof QuestionToolbar>> = {}) {
  const onMoveUp = vi.fn();
  const onMoveDown = vi.fn();
  const onDelete = vi.fn();
  render(
    <QuestionToolbar
      canMoveUp
      canMoveDown
      reordering={false}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      {...overrides}
    />,
  );
  return { onMoveUp, onMoveDown, onDelete };
}

describe("QuestionToolbar", () => {
  it("fires onMoveUp / onMoveDown when arrows are clicked", () => {
    const { onMoveUp, onMoveDown } = setup();
    fireEvent.click(screen.getByLabelText("Sposta domanda su"));
    fireEvent.click(screen.getByLabelText("Sposta domanda giù"));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it("disables the up arrow for the first question", () => {
    setup({ canMoveUp: false });
    expect(screen.getByLabelText("Sposta domanda su")).toBeDisabled();
    expect(screen.getByLabelText("Sposta domanda giù")).not.toBeDisabled();
  });

  it("disables the down arrow for the last question", () => {
    setup({ canMoveDown: false });
    expect(screen.getByLabelText("Sposta domanda giù")).toBeDisabled();
  });

  it("disables every control while reordering is in flight", () => {
    setup({ reordering: true });
    expect(screen.getByLabelText("Sposta domanda su")).toBeDisabled();
    expect(screen.getByLabelText("Sposta domanda giù")).toBeDisabled();
    expect(screen.getByTitle("Elimina domanda")).toBeDisabled();
  });

  it("fires onDelete when the delete button is clicked", () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByTitle("Elimina domanda"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

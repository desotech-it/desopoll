// Smoke tests for the ShareDialog: it lists existing shares with their level,
// supports removing a share, and exposes the add controls (typeahead + level).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Share } from "../../api";

const listMock = vi.fn();
const addMock = vi.fn();
const removeMock = vi.fn();
const searchMock = vi.fn();
const groupsListMock = vi.fn();

vi.mock("../../api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  shares: {
    list: (...a: unknown[]) => listMock(...a),
    add: (...a: unknown[]) => addMock(...a),
    remove: (...a: unknown[]) => removeMock(...a),
  },
  users: { search: (...a: unknown[]) => searchMock(...a) },
  admin: { groups: { list: (...a: unknown[]) => groupsListMock(...a) } },
}));

import { ShareDialog } from "./ShareDialog";

function share(overrides: Partial<Share> = {}): Share {
  return {
    id: "s1",
    subject_type: "user",
    subject_id: "u9",
    permission: "edit",
    granted_by: "owner",
    granted_at: new Date().toISOString(),
    subject_label: "mario@acme.it",
    subject_display_name: "Mario Rossi",
    ...overrides,
  };
}

describe("ShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMock.mockResolvedValue({ users: [] });
    groupsListMock.mockResolvedValue({ groups: [] });
    removeMock.mockResolvedValue({ ok: true });
  });

  it("lists current shares with subject name and permission badge", async () => {
    listMock.mockResolvedValue({ shares: [share()] });
    render(<ShareDialog quizId="q1" quizTitle="Quiz AWS" isAdmin={false} onClose={vi.fn()} />);

    expect(await screen.findByText("Mario Rossi")).toBeInTheDocument();
    expect(screen.getByText("Modifica")).toBeInTheDocument(); // edit -> "Modifica"
    expect(listMock).toHaveBeenCalledWith("q1");
  });

  it("shows an empty state when there are no shares", async () => {
    listMock.mockResolvedValue({ shares: [] });
    render(<ShareDialog quizId="q1" quizTitle="Quiz AWS" isAdmin={false} onClose={vi.fn()} />);
    expect(await screen.findByText(/non è ancora condiviso/i)).toBeInTheDocument();
  });

  it("removes a share when the remove button is clicked", async () => {
    listMock.mockResolvedValue({ shares: [share()] });
    render(<ShareDialog quizId="q1" quizTitle="Quiz AWS" isAdmin={false} onClose={vi.fn()} />);

    const removeBtn = await screen.findByLabelText("Rimuovi Mario Rossi");
    fireEvent.click(removeBtn);
    await waitFor(() => expect(removeMock).toHaveBeenCalledWith("q1", "s1"));
    expect(screen.queryByText("Mario Rossi")).not.toBeInTheDocument();
  });

  it("hides the Gruppi tab for non-admins and shows it for admins", async () => {
    listMock.mockResolvedValue({ shares: [] });
    const { unmount } = render(
      <ShareDialog quizId="q1" quizTitle="Quiz AWS" isAdmin={false} onClose={vi.fn()} />,
    );
    await screen.findByText(/non è ancora condiviso/i);
    expect(screen.queryByText("Gruppi")).not.toBeInTheDocument();
    unmount();

    render(<ShareDialog quizId="q1" quizTitle="Quiz AWS" isAdmin onClose={vi.fn()} />);
    await screen.findByText(/non è ancora condiviso/i);
    expect(screen.getByText("Gruppi")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    listMock.mockResolvedValue({ shares: [] });
    const onClose = vi.fn();
    render(<ShareDialog quizId="q1" quizTitle="Quiz AWS" isAdmin={false} onClose={onClose} />);
    await screen.findByText(/non è ancora condiviso/i);
    fireEvent.click(screen.getByLabelText("Chiudi"));
    expect(onClose).toHaveBeenCalled();
  });

  it("adds a user share after picking from the typeahead", async () => {
    listMock.mockResolvedValue({ shares: [] });
    searchMock.mockResolvedValue({ users: [{ id: "u5", email: "lucia@acme.it", display_name: "Lucia" }] });
    addMock.mockResolvedValue({ share: share({ id: "s2", subject_id: "u5", subject_display_name: "Lucia" }) });

    render(<ShareDialog quizId="q1" quizTitle="Quiz AWS" isAdmin={false} onClose={vi.fn()} />);
    await screen.findByText(/non è ancora condiviso/i);

    const input = screen.getByLabelText("Aggiungi una persona");
    fireEvent.change(input, { target: { value: "luc" } });
    const option = await screen.findByText("Lucia");
    fireEvent.click(option);

    // Now the pending row + Condividi button appear.
    const addBtn = await screen.findByRole("button", { name: "Condividi" });
    fireEvent.click(addBtn);
    await waitFor(() =>
      expect(addMock).toHaveBeenCalledWith("q1", { subjectType: "user", subjectId: "u5", permission: "view" }),
    );
  });
});

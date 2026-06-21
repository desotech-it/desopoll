// Smoke tests for the AdminGroups screen: lists groups, creates a group, and
// shows the forbidden state on a 403.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Group } from "../../api";

const groupsListMock = vi.fn();
const groupsCreateMock = vi.fn();
const groupsRemoveMock = vi.fn();
const membersMock = vi.fn();

vi.mock("../../api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  admin: {
    groups: {
      list: (...a: unknown[]) => groupsListMock(...a),
      create: (...a: unknown[]) => groupsCreateMock(...a),
      remove: (...a: unknown[]) => groupsRemoveMock(...a),
      members: (...a: unknown[]) => membersMock(...a),
    },
  },
  users: { search: vi.fn() },
}));

import { AdminGroups } from "./AdminGroups";
import { ApiError } from "../../api";

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Team Marketing",
    description: "Reparto marketing",
    color: "#8d83e4",
    created_at: new Date().toISOString(),
    member_count: 3,
    ...overrides,
  };
}

describe("AdminGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists groups with name and member count", async () => {
    groupsListMock.mockResolvedValue({ groups: [group()] });
    render(<AdminGroups />);
    expect(await screen.findByText("Team Marketing")).toBeInTheDocument();
    expect(screen.getByText("3 membri")).toBeInTheDocument();
  });

  it("renders the forbidden state on a 403", async () => {
    groupsListMock.mockRejectedValue(new ApiError(403, "forbidden"));
    render(<AdminGroups />);
    expect(await screen.findByText("Accesso negato")).toBeInTheDocument();
  });

  it("shows an empty state when there are no groups", async () => {
    groupsListMock.mockResolvedValue({ groups: [] });
    render(<AdminGroups />);
    expect(await screen.findByText(/Nessun gruppo/i)).toBeInTheDocument();
  });

  it("creates a group via the form and prepends it to the list", async () => {
    groupsListMock.mockResolvedValue({ groups: [] });
    groupsCreateMock.mockResolvedValue({ group: group({ id: "g2", name: "Vendite", member_count: 0 }) });

    render(<AdminGroups />);
    await screen.findByText(/Nessun gruppo/i);

    fireEvent.click(screen.getByRole("button", { name: /nuovo gruppo/i }));
    fireEvent.change(screen.getByLabelText(/Nome/i), { target: { value: "Vendite" } });
    fireEvent.click(screen.getByRole("button", { name: /crea gruppo/i }));

    await waitFor(() => expect(groupsCreateMock).toHaveBeenCalled());
    expect(groupsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Vendite" }),
    );
    expect(await screen.findByText("Vendite")).toBeInTheDocument();
  });
});

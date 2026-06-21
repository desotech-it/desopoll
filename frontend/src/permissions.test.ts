// Unit tests for the frontend permission-gating helpers (issue #4).
import { describe, it, expect } from "vitest";
import {
  can,
  canEdit,
  canManage,
  canPlay,
  canView,
  isPermission,
  LEVELS,
  permissionLabel,
  PERMISSION_TONES,
  type Permission,
} from "./permissions";

describe("LEVELS ordering", () => {
  it("orders view < play < edit < manage", () => {
    expect(LEVELS.view).toBeLessThan(LEVELS.play);
    expect(LEVELS.play).toBeLessThan(LEVELS.edit);
    expect(LEVELS.edit).toBeLessThan(LEVELS.manage);
  });
});

describe("isPermission", () => {
  it("accepts the four valid levels", () => {
    for (const p of ["view", "play", "edit", "manage"]) {
      expect(isPermission(p)).toBe(true);
    }
  });
  it("rejects anything else", () => {
    expect(isPermission("owner")).toBe(false);
    expect(isPermission("")).toBe(false);
    expect(isPermission(null)).toBe(false);
    expect(isPermission(undefined)).toBe(false);
    expect(isPermission(3)).toBe(false);
  });
});

describe("can(have, need)", () => {
  it("is false for null/undefined have", () => {
    expect(can(null, "view")).toBe(false);
    expect(can(undefined, "view")).toBe(false);
  });

  it("satisfies a need when have >= need", () => {
    expect(can("manage", "view")).toBe(true);
    expect(can("manage", "manage")).toBe(true);
    expect(can("edit", "play")).toBe(true);
    expect(can("play", "play")).toBe(true);
    expect(can("view", "view")).toBe(true);
  });

  it("fails when have < need", () => {
    expect(can("view", "play")).toBe(false);
    expect(can("play", "edit")).toBe(false);
    expect(can("edit", "manage")).toBe(false);
    expect(can("view", "manage")).toBe(false);
  });
});

describe("capability helpers", () => {
  const cases: { perm: Permission | null; view: boolean; play: boolean; edit: boolean; manage: boolean }[] = [
    { perm: null, view: false, play: false, edit: false, manage: false },
    { perm: "view", view: true, play: false, edit: false, manage: false },
    { perm: "play", view: true, play: true, edit: false, manage: false },
    { perm: "edit", view: true, play: true, edit: true, manage: false },
    { perm: "manage", view: true, play: true, edit: true, manage: true },
  ];
  for (const c of cases) {
    it(`gates correctly for permission=${c.perm ?? "null"}`, () => {
      expect(canView(c.perm)).toBe(c.view);
      expect(canPlay(c.perm)).toBe(c.play);
      expect(canEdit(c.perm)).toBe(c.edit);
      expect(canManage(c.perm)).toBe(c.manage);
    });
  }
});

describe("labels and tones", () => {
  it("maps each level to a non-empty Italian label", () => {
    expect(permissionLabel("view")).toBe("Visualizza");
    expect(permissionLabel("play")).toBe("Avvia");
    expect(permissionLabel("edit")).toBe("Modifica");
    expect(permissionLabel("manage")).toBe("Gestisci");
  });
  it("renders a dash for an unknown/null level", () => {
    expect(permissionLabel(null)).toBe("—");
    expect(permissionLabel(undefined)).toBe("—");
  });
  it("has a chip tone for every level", () => {
    for (const p of ["view", "play", "edit", "manage"] as Permission[]) {
      expect(PERMISSION_TONES[p]).toBeTruthy();
    }
  });
});

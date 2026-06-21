import { describe, it, expect } from "vitest";
import {
  LEVELS,
  PERMISSIONS,
  isPermission,
  effectivePermission,
  can,
  type Permission,
} from "../src/auth/permissions.js";

describe("LEVELS / ordering", () => {
  it("is a strict total order view < play < edit < manage", () => {
    expect(LEVELS.view).toBeLessThan(LEVELS.play);
    expect(LEVELS.play).toBeLessThan(LEVELS.edit);
    expect(LEVELS.edit).toBeLessThan(LEVELS.manage);
  });
  it("lists the four levels low-to-high", () => {
    expect(PERMISSIONS).toEqual(["view", "play", "edit", "manage"]);
  });
});

describe("isPermission", () => {
  it("accepts the four valid levels", () => {
    for (const p of PERMISSIONS) expect(isPermission(p)).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isPermission("admin")).toBe(false);
    expect(isPermission("")).toBe(false);
    expect(isPermission(null)).toBe(false);
    expect(isPermission(undefined)).toBe(false);
    expect(isPermission(3)).toBe(false);
  });
});

describe("effectivePermission", () => {
  it("returns null when there is no access at all", () => {
    expect(effectivePermission({})).toBeNull();
    expect(effectivePermission({ isOwner: false, isPublic: false })).toBeNull();
    expect(effectivePermission({ directShare: null, groupShares: [null, undefined] })).toBeNull();
  });

  it("owner always gets manage, overriding everything", () => {
    expect(effectivePermission({ isOwner: true })).toBe("manage");
    expect(
      effectivePermission({ isOwner: true, isPublic: false, directShare: "view" }),
    ).toBe("manage");
  });

  it("public grants view to everyone", () => {
    expect(effectivePermission({ isPublic: true })).toBe("view");
  });

  it("uses a direct user share permission", () => {
    expect(effectivePermission({ directShare: "edit" })).toBe("edit");
    expect(effectivePermission({ directShare: "play" })).toBe("play");
  });

  it("uses a group share permission", () => {
    expect(effectivePermission({ groupShares: ["edit"] })).toBe("edit");
  });

  it("takes the MAX across multiple group shares", () => {
    expect(effectivePermission({ groupShares: ["view", "manage", "play"] })).toBe("manage");
    expect(effectivePermission({ groupShares: ["view", null, "play", undefined] })).toBe("play");
  });

  it("takes the MAX across direct + group + public combined", () => {
    // public(view) + direct(play) + group(edit) => edit
    expect(
      effectivePermission({ isPublic: true, directShare: "play", groupShares: ["edit"] }),
    ).toBe("edit");
    // public(view) + direct(view) + group(manage) => manage
    expect(
      effectivePermission({ isPublic: true, directShare: "view", groupShares: ["manage"] }),
    ).toBe("manage");
    // direct(manage) beats group(view)
    expect(
      effectivePermission({ directShare: "manage", groupShares: ["view"] }),
    ).toBe("manage");
  });

  it("owner wins even against a manage group share (both manage)", () => {
    expect(
      effectivePermission({ isOwner: true, groupShares: ["manage"] }),
    ).toBe("manage");
  });

  it("ignores empty/falsey share entries", () => {
    expect(effectivePermission({ directShare: undefined, groupShares: [] })).toBeNull();
    expect(effectivePermission({ isPublic: false, directShare: null })).toBeNull();
  });
});

describe("can", () => {
  const levels: Permission[] = ["view", "play", "edit", "manage"];

  it("returns false for null / invalid have", () => {
    expect(can(null, "view")).toBe(false);
    expect(can(undefined, "view")).toBe(false);
    expect(can("nope" as Permission, "view")).toBe(false);
  });

  it("a level satisfies itself and everything below it", () => {
    expect(can("manage", "view")).toBe(true);
    expect(can("manage", "play")).toBe(true);
    expect(can("manage", "edit")).toBe(true);
    expect(can("manage", "manage")).toBe(true);
    expect(can("edit", "edit")).toBe(true);
    expect(can("edit", "play")).toBe(true);
    expect(can("play", "play")).toBe(true);
    expect(can("view", "view")).toBe(true);
  });

  it("a level does not satisfy a higher requirement", () => {
    expect(can("view", "play")).toBe(false);
    expect(can("view", "edit")).toBe(false);
    expect(can("play", "edit")).toBe(false);
    expect(can("edit", "manage")).toBe(false);
  });

  it("is consistent with the numeric LEVELS for every pair", () => {
    for (const have of levels) {
      for (const need of levels) {
        expect(can(have, need)).toBe(LEVELS[have] >= LEVELS[need]);
      }
    }
  });

  // Capability mapping sanity: owner (manage) can do all four capabilities.
  it("manage unlocks view/play/edit/manage capabilities", () => {
    for (const cap of levels) expect(can("manage", cap)).toBe(true);
  });
});

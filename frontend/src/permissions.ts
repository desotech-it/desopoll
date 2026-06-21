// Frontend mirror of the backend permission model (issue #4 quiz sharing).
// Levels: view(1) < play(2) < edit(3) < manage(4). Effective level = MAX over
// all sources; the backend already resolves this and sends a single `permission`
// per quiz, so the frontend only needs the ordering + capability gating helpers.
import i18n from "./i18n";

export const PERMISSIONS = ["view", "play", "edit", "manage"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const LEVELS: Record<Permission, number> = {
  view: 1,
  play: 2,
  edit: 3,
  manage: 4,
};

export function isPermission(v: unknown): v is Permission {
  return typeof v === "string" && (PERMISSIONS as readonly string[]).includes(v);
}

// Does `have` satisfy the required `need` level? (have >= need)
export function can(have: Permission | null | undefined, need: Permission): boolean {
  if (!have) return false;
  return LEVELS[have] >= LEVELS[need];
}

// Capability helpers used to gate UI affordances. Mirror the backend gates:
//   view  => open/read the quiz
//   play  => host a live session
//   edit  => modify quiz/questions
//   manage => delete + manage shares
export const canView = (p: Permission | null | undefined) => can(p, "view");
export const canPlay = (p: Permission | null | undefined) => can(p, "play");
export const canEdit = (p: Permission | null | undefined) => can(p, "edit");
export const canManage = (p: Permission | null | undefined) => can(p, "manage");

// Localized label for a permission level (badges, selects, captions). Resolved
// at call time via the shared i18n instance (share.permission.* keys).
export function permissionLabel(p: Permission | null | undefined): string {
  if (!p) return "—";
  return i18n.t(`permission.${p}`, { ns: "share" }) as string;
}

// Localized one-line description per level, used as helper text in the share dialog.
const PERMISSION_DESC_KEY: Record<Permission, string> = {
  view: "permission.descView",
  play: "permission.descPlay",
  edit: "permission.descEdit",
  manage: "permission.descManage",
};

export function permissionDescription(p: Permission): string {
  return i18n.t(PERMISSION_DESC_KEY[p], { ns: "share" }) as string;
}

// Chip tone per level (uses the ui.tsx Chip tones), brightest for higher access.
export type ChipTone = "violet" | "teal" | "amber" | "rose" | "sky" | "green";
export const PERMISSION_TONES: Record<Permission, ChipTone> = {
  view: "sky",
  play: "teal",
  edit: "amber",
  manage: "violet",
};

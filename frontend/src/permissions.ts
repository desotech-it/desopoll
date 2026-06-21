// Frontend mirror of the backend permission model (issue #4 quiz sharing).
// Levels: view(1) < play(2) < edit(3) < manage(4). Effective level = MAX over
// all sources; the backend already resolves this and sends a single `permission`
// per quiz, so the frontend only needs the ordering + capability gating helpers.

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

// Italian labels for the four permission levels (badges, selects, captions).
export const PERMISSION_LABELS: Record<Permission, string> = {
  view: "Visualizza",
  play: "Avvia",
  edit: "Modifica",
  manage: "Gestisci",
};

export function permissionLabel(p: Permission | null | undefined): string {
  return p ? PERMISSION_LABELS[p] : "—";
}

// One-line description per level, used as helper text in the share dialog.
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  view: "Può aprire e consultare il quiz.",
  play: "Può aprire e avviare una partita dal vivo.",
  edit: "Può modificare quiz e domande.",
  manage: "Pieno controllo: modifica, elimina e gestisce le condivisioni.",
};

// Chip tone per level (uses the ui.tsx Chip tones), brightest for higher access.
export type ChipTone = "violet" | "teal" | "amber" | "rose" | "sky" | "green";
export const PERMISSION_TONES: Record<Permission, ChipTone> = {
  view: "sky",
  play: "teal",
  edit: "amber",
  manage: "violet",
};

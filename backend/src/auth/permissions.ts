// Pure permission algebra for quiz sharing (issue #4). No I/O — every function here is a
// deterministic computation over already-resolved facts, so it is exhaustively unit-tested.
//
// Levels are totally ordered: view < play < edit < manage. The effective permission a user
// has on a quiz is the MAXIMUM over every source that grants them access:
//   - owner            => manage (always)
//   - quiz.is_public   => view (everyone)
//   - direct user share => its permission (poll_shares subject_type='user')
//   - group share       => its permission (poll_shares subject_type='group', user in group)

export type Permission = "view" | "play" | "edit" | "manage";

// Numeric rank of each level. Higher wins. Keep in sync with the DB CHECK constraint.
export const LEVELS: Record<Permission, number> = {
  view: 1,
  play: 2,
  edit: 3,
  manage: 4,
};

export const PERMISSIONS: readonly Permission[] = ["view", "play", "edit", "manage"];

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && value in LEVELS;
}

// The capabilities each permission level unlocks. Effective permission >= the listed level
// is required for the action. Owner (manage) implies all of them.
//   view   => GET quiz
//   play   => host a live session
//   edit   => modify quiz / questions / order
//   manage => delete quiz + manage shares
export type Capability = "view" | "play" | "edit" | "manage";

// What the caller knows about a (user, quiz) pair. Any subset may be present.
export interface PermissionSources {
  // The user owns the quiz.
  isOwner?: boolean;
  // The quiz is public (visible to everyone).
  isPublic?: boolean;
  // Permission from a direct user share, if one exists.
  directShare?: Permission | null;
  // Permissions from every group the user belongs to that the quiz is shared with.
  groupShares?: ReadonlyArray<Permission | null | undefined>;
}

// Highest level among the provided permissions, or null if none apply.
function maxLevel(perms: Array<Permission | null | undefined>): Permission | null {
  let best: Permission | null = null;
  for (const p of perms) {
    if (!p || !isPermission(p)) continue;
    if (best === null || LEVELS[p] > LEVELS[best]) best = p;
  }
  return best;
}

// Effective permission for a user on a quiz: the MAX over all matched sources, or null when
// the user has no access at all.
export function effectivePermission(sources: PermissionSources): Permission | null {
  if (sources.isOwner) return "manage";
  const candidates: Array<Permission | null | undefined> = [];
  if (sources.isPublic) candidates.push("view");
  if (sources.directShare) candidates.push(sources.directShare);
  if (sources.groupShares) candidates.push(...sources.groupShares);
  return maxLevel(candidates);
}

// True when `have` (an effective permission, possibly null) meets or exceeds `need`.
export function can(have: Permission | null | undefined, need: Capability): boolean {
  if (!have || !isPermission(have)) return false;
  return LEVELS[have] >= LEVELS[need];
}

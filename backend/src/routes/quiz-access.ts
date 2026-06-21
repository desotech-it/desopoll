// Access resolution for a (quiz, user) pair. Bridges the durable model (quizzes, poll_shares,
// group_members) to the pure permission algebra in auth/permissions.ts.
import { db } from "../db.js";
import { effectivePermission, type Permission } from "../auth/permissions.js";

export interface QuizRow {
  id: string;
  owner_id: string;
  is_public: boolean;
  title: string;
  description: string | null;
  base_language: string;
  available_languages: string[];
  cover_image: unknown | null;
  settings: unknown;
  updated_at: string;
  [key: string]: unknown;
}

export interface QuizAccess {
  // The quiz row, or null when the id does not exist.
  quiz: QuizRow | null;
  // The user's effective permission, or null when they have no access (or the quiz is missing).
  permission: Permission | null;
}

// Resolve a user's effective permission on a quiz in a single round-trip:
//   - the quiz row (owner_id, is_public, ...)
//   - the user's direct share (poll_shares subject_type='user')
//   - the highest group share for groups the user belongs to
// Returns { quiz: null, permission: null } when the quiz does not exist.
export async function getQuizAccess(quizId: string, userId: string): Promise<QuizAccess> {
  const { rows } = await db().query(
    `SELECT
       q.*,
       ds.permission AS direct_permission,
       gs.permission AS group_permission
     FROM quizzes q
     LEFT JOIN poll_shares ds
       ON ds.poll_id = q.id AND ds.subject_type = 'user' AND ds.subject_id = $2
     LEFT JOIN LATERAL (
       SELECT s.permission
       FROM poll_shares s
       JOIN group_members gm ON gm.group_id = s.subject_id AND gm.user_id = $2
       WHERE s.poll_id = q.id AND s.subject_type = 'group'
       ORDER BY CASE s.permission
                  WHEN 'manage' THEN 4 WHEN 'edit' THEN 3 WHEN 'play' THEN 2 ELSE 1 END DESC
       LIMIT 1
     ) gs ON true
     WHERE q.id = $1`,
    [quizId, userId],
  );

  const row = rows[0];
  if (!row) return { quiz: null, permission: null };

  const { direct_permission, group_permission, ...quiz } = row as Record<string, unknown>;
  const permission = effectivePermission({
    isOwner: quiz.owner_id === userId,
    isPublic: Boolean(quiz.is_public),
    directShare: (direct_permission as Permission | null) ?? null,
    groupShares: [group_permission as Permission | null],
  });

  return { quiz: quiz as QuizRow, permission };
}

// Share management for a quiz: list / upsert / delete the poll_shares rows. Only a user with
// `manage` on the quiz (owner, or shared at manage) may touch shares.
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../db.js";
import { requireAuth } from "../auth/guard.js";
import { can, isPermission, type Permission } from "../auth/permissions.js";
import { getQuizAccess } from "./quiz-access.js";

const SUBJECT_TYPES = ["user", "group"] as const;
type SubjectType = (typeof SUBJECT_TYPES)[number];

function isSubjectType(v: unknown): v is SubjectType {
  return v === "user" || v === "group";
}

// Resolve the quiz and require manage, sending the response and returning false on failure.
async function requireManage(
  reply: FastifyReply,
  quizId: string,
  userId: string,
): Promise<boolean> {
  const { quiz, permission } = await getQuizAccess(quizId, userId);
  if (!quiz) {
    reply.code(404).send({ error: "not found" });
    return false;
  }
  if (!can(permission, "manage")) {
    if (can(permission, "view")) reply.code(403).send({ error: "forbidden" });
    else reply.code(404).send({ error: "not found" });
    return false;
  }
  return true;
}

export async function registerShareRoutes(app: FastifyInstance): Promise<void> {
  // List the shares on a quiz, each with a resolved subject label (user email / group name).
  app.get("/api/quizzes/:id/shares", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    if (!(await requireManage(reply, id, user.id))) return;

    const { rows } = await db().query(
      `SELECT s.id, s.subject_type, s.subject_id, s.permission, s.granted_by, s.granted_at,
              CASE s.subject_type
                WHEN 'user'  THEN (SELECT u.email FROM users u WHERE u.id = s.subject_id)
                WHEN 'group' THEN (SELECT g.name  FROM groups g WHERE g.id = s.subject_id)
              END AS subject_label,
              CASE s.subject_type
                WHEN 'user' THEN (SELECT u.display_name FROM users u WHERE u.id = s.subject_id)
                ELSE NULL
              END AS subject_display_name
       FROM poll_shares s
       WHERE s.poll_id = $1
       ORDER BY s.subject_type, subject_label`,
      [id],
    );
    return { shares: rows };
  });

  // Create or update a share (upsert on poll_id, subject_type, subject_id).
  app.post("/api/quizzes/:id/shares", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    if (!(await requireManage(reply, id, user.id))) return;

    const b = (req.body ?? {}) as {
      subjectType?: unknown;
      subjectId?: unknown;
      permission?: unknown;
    };
    if (!isSubjectType(b.subjectType)) {
      return reply.code(400).send({ error: "subjectType must be 'user' or 'group'" });
    }
    if (typeof b.subjectId !== "string" || !b.subjectId) {
      return reply.code(400).send({ error: "subjectId required" });
    }
    const permission: Permission = isPermission(b.permission) ? b.permission : "view";

    // Validate the subject exists, and never let a quiz be shared back to its own owner.
    if (b.subjectType === "user") {
      const { rows } = await db().query(`SELECT owner_id FROM quizzes WHERE id = $1`, [id]);
      if (rows[0]?.owner_id === b.subjectId) {
        return reply.code(400).send({ error: "cannot share with the owner" });
      }
      const { rows: u } = await db().query(`SELECT 1 FROM users WHERE id = $1`, [b.subjectId]);
      if (!u[0]) return reply.code(404).send({ error: "user not found" });
    } else {
      const { rows: g } = await db().query(`SELECT 1 FROM groups WHERE id = $1`, [b.subjectId]);
      if (!g[0]) return reply.code(404).send({ error: "group not found" });
    }

    const { rows } = await db().query(
      `INSERT INTO poll_shares (poll_id, subject_type, subject_id, permission, granted_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (poll_id, subject_type, subject_id)
       DO UPDATE SET permission = EXCLUDED.permission, granted_by = EXCLUDED.granted_by, granted_at = now()
       RETURNING id, subject_type, subject_id, permission, granted_by, granted_at`,
      [id, b.subjectType, b.subjectId, permission, user.id],
    );
    return reply.code(201).send({ share: rows[0] });
  });

  // Remove a share.
  app.delete("/api/quizzes/:id/shares/:shareId", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id, shareId } = req.params as { id: string; shareId: string };
    if (!(await requireManage(reply, id, user.id))) return;

    const { rowCount } = await db().query(
      `DELETE FROM poll_shares WHERE id = $1 AND poll_id = $2`,
      [shareId, id],
    );
    if (!rowCount) return reply.code(404).send({ error: "share not found" });
    return { ok: true };
  });
}

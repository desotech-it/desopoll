// Group administration (admin-only). Groups are the subjects of group-type shares; managing
// them — and their membership — is restricted to admins via requireAdmin.
import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { requireAdmin } from "../auth/guard.js";

const ROLES_IN_GROUP = ["member", "manager"] as const;

export async function registerGroupRoutes(app: FastifyInstance): Promise<void> {
  // List all groups with their member counts.
  app.get("/api/admin/groups", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const { rows } = await db().query(
      `SELECT g.id, g.name, g.description, g.color, g.created_at,
              (SELECT count(*) FROM group_members m WHERE m.group_id = g.id)::int AS member_count
       FROM groups g
       ORDER BY g.name`,
    );
    return { groups: rows };
  });

  // Create a group.
  app.post("/api/admin/groups", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const b = (req.body ?? {}) as { name?: string; description?: string; color?: string };
    const name = (b.name ?? "").trim();
    if (!name) return reply.code(400).send({ error: "name required" });
    try {
      const { rows } = await db().query(
        `INSERT INTO groups (name, description, color, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, color, created_at`,
        [name, b.description ?? null, b.color ?? null, admin.id],
      );
      return reply.code(201).send({ group: rows[0] });
    } catch (err) {
      if (err instanceof Error && /duplicate key/.test(err.message)) {
        return reply.code(409).send({ error: "group name already exists" });
      }
      throw err;
    }
  });

  // Delete a group (cascades to its memberships and group-type shares).
  app.delete("/api/admin/groups/:id", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const { rowCount } = await db().query(`DELETE FROM groups WHERE id = $1`, [id]);
    if (!rowCount) return reply.code(404).send({ error: "not found" });
    return { ok: true };
  });

  // List a group's members.
  app.get("/api/admin/groups/:id/members", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const { rows: g } = await db().query(`SELECT 1 FROM groups WHERE id = $1`, [id]);
    if (!g[0]) return reply.code(404).send({ error: "not found" });
    const { rows } = await db().query(
      `SELECT u.id, u.email, u.display_name, m.role_in_group, m.added_at
       FROM group_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.group_id = $1
       ORDER BY u.display_name NULLS LAST, u.email`,
      [id],
    );
    return { members: rows };
  });

  // Add a user to a group (idempotent on the (group, user) primary key).
  app.post("/api/admin/groups/:id/members", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as { userId?: unknown; roleInGroup?: unknown };
    if (typeof b.userId !== "string" || !b.userId) {
      return reply.code(400).send({ error: "userId required" });
    }
    const roleInGroup = ROLES_IN_GROUP.includes(b.roleInGroup as (typeof ROLES_IN_GROUP)[number])
      ? (b.roleInGroup as string)
      : "member";

    const { rows: g } = await db().query(`SELECT 1 FROM groups WHERE id = $1`, [id]);
    if (!g[0]) return reply.code(404).send({ error: "group not found" });
    const { rows: u } = await db().query(`SELECT 1 FROM users WHERE id = $1`, [b.userId]);
    if (!u[0]) return reply.code(404).send({ error: "user not found" });

    const { rows } = await db().query(
      `INSERT INTO group_members (group_id, user_id, role_in_group, added_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id, user_id)
       DO UPDATE SET role_in_group = EXCLUDED.role_in_group
       RETURNING group_id, user_id, role_in_group, added_at`,
      [id, b.userId, roleInGroup, admin.id],
    );
    return reply.code(201).send({ member: rows[0] });
  });

  // Remove a user from a group.
  app.delete("/api/admin/groups/:id/members/:userId", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const { id, userId } = req.params as { id: string; userId: string };
    const { rowCount } = await db().query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [id, userId],
    );
    if (!rowCount) return reply.code(404).send({ error: "membership not found" });
    return { ok: true };
  });
}

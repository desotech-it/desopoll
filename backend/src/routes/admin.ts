import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { requireAdmin } from "../auth/guard.js";

const ROLES = ["user", "admin"] as const;
const STATUSES = ["active", "invited", "suspended", "deleted"] as const;

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  // List all users.
  app.get("/api/admin/users", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const { rows } = await db().query(
      `SELECT id, email, display_name, role, status, created_at,
              (password_hash <> '') AS has_password
       FROM users WHERE status <> 'deleted' ORDER BY created_at`,
    );
    return { users: rows };
  });

  // Create a user (local password optional; without one the account is SSO-only / invited).
  app.post("/api/admin/users", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const b = (req.body ?? {}) as {
      email?: string;
      display_name?: string;
      role?: string;
      password?: string;
    };
    const email = (b.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) return reply.code(400).send({ error: "valid email required" });
    const role = ROLES.includes(b.role as (typeof ROLES)[number]) ? b.role : "user";
    const passwordHash = b.password ? await bcrypt.hash(b.password, 10) : "";
    const status = b.password ? "active" : "invited";
    try {
      const { rows } = await db().query(
        `INSERT INTO users (email, password_hash, display_name, role, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, display_name, role, status, created_at`,
        [email, passwordHash, b.display_name ?? null, role, status, admin.id],
      );
      return reply.code(201).send({ user: rows[0] });
    } catch (err) {
      if (err instanceof Error && /duplicate key/.test(err.message)) {
        return reply.code(409).send({ error: "email already exists" });
      }
      throw err;
    }
  });

  // Update a user's role / status / display name. Guards against self-lockout.
  app.patch("/api/admin/users/:id", async (req, reply) => {
    const admin = await requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as { role?: string; status?: string; display_name?: string };
    if (id === admin.id && ((b.role && b.role !== "admin") || (b.status && b.status !== "active"))) {
      return reply.code(400).send({ error: "you cannot demote or deactivate yourself" });
    }
    const { rows } = await db().query(
      `UPDATE users SET
         role = COALESCE($2, role),
         status = COALESCE($3, status),
         display_name = COALESCE($4, display_name),
         updated_at = now()
       WHERE id = $1 AND status <> 'deleted'
       RETURNING id, email, display_name, role, status, created_at`,
      [
        id,
        ROLES.includes(b.role as (typeof ROLES)[number]) ? b.role : null,
        STATUSES.includes(b.status as (typeof STATUSES)[number]) ? b.status : null,
        typeof b.display_name === "string" ? b.display_name : null,
      ],
    );
    if (!rows[0]) return reply.code(404).send({ error: "not found" });
    return { user: rows[0] };
  });
}

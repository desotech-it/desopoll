// User lookup for the share typeahead. Any authenticated user may search the directory by
// email / display name; results are intentionally minimal (no role, status, etc.).
import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { requireAuth } from "../auth/guard.js";

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  // Search up to 10 active users matching the query against email or display_name.
  app.get("/api/users/search", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const q = ((req.query ?? {}) as { q?: string }).q?.trim() ?? "";
    if (!q) return { users: [] };

    // Escape LIKE wildcards in user input so they match literally.
    const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    const pattern = `%${escaped}%`;
    const { rows } = await db().query(
      `SELECT id, email, display_name
       FROM users
       WHERE status = 'active'
         AND (email ILIKE $1 ESCAPE '\\' OR display_name ILIKE $1 ESCAPE '\\')
       ORDER BY display_name NULLS LAST, email
       LIMIT 10`,
      [pattern],
    );
    return { users: rows };
  });
}

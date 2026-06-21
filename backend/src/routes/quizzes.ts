import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { requireAuth } from "../auth/guard.js";
import { can, type Permission } from "../auth/permissions.js";
import { getQuizAccess } from "./quiz-access.js";
import { validateOrder, computePositions } from "./question-order.js";

export async function registerQuizRoutes(app: FastifyInstance): Promise<void> {
  // List quizzes the current user owns OR has been shared (view+). Public quizzes are NOT
  // included here unless explicitly shared — this is the personal library, not the catalog.
  // Each row carries a `permission` field: 'manage' for owned, the effective level for shared.
  app.get("/api/quizzes", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { rows } = await db().query(
      `WITH accessible AS (
         -- owned
         SELECT q.id, 'manage'::text AS permission, true AS owned
         FROM quizzes q WHERE q.owner_id = $1
         UNION
         -- direct user share
         SELECT s.poll_id AS id, s.permission, false AS owned
         FROM poll_shares s
         WHERE s.subject_type = 'user' AND s.subject_id = $1
         UNION
         -- group share (user is a member)
         SELECT s.poll_id AS id, s.permission, false AS owned
         FROM poll_shares s
         JOIN group_members gm ON gm.group_id = s.subject_id AND gm.user_id = $1
         WHERE s.subject_type = 'group'
       ),
       ranked AS (
         SELECT id,
                bool_or(owned) AS owned,
                max(CASE permission
                      WHEN 'manage' THEN 4 WHEN 'edit' THEN 3 WHEN 'play' THEN 2 ELSE 1 END) AS lvl
         FROM accessible GROUP BY id
       )
       SELECT q.id, q.title, q.description, q.base_language, q.available_languages,
              q.is_public, q.owner_id, q.updated_at,
              r.owned,
              (CASE r.lvl WHEN 4 THEN 'manage' WHEN 3 THEN 'edit' WHEN 2 THEN 'play' ELSE 'view' END) AS permission,
              (SELECT count(*) FROM questions x WHERE x.quiz_id = q.id)::int AS question_count
       FROM ranked r
       JOIN quizzes q ON q.id = r.id
       ORDER BY q.updated_at DESC`,
      [user.id],
    );
    return { quizzes: rows };
  });

  // Create a quiz.
  app.post("/api/quizzes", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const b = (req.body ?? {}) as { title?: string; description?: string; base_language?: string };
    const title = (b.title ?? "").trim();
    if (!title) return reply.code(400).send({ error: "title required" });
    const { rows } = await db().query(
      `INSERT INTO quizzes (owner_id, title, description, base_language)
       VALUES ($1, $2, $3, COALESCE($4, 'it')) RETURNING *`,
      [user.id, title, b.description ?? null, b.base_language ?? null],
    );
    return reply.code(201).send({ quiz: rows[0] });
  });

  // Get a quiz with its questions. Requires view permission. The user's effective permission
  // is returned alongside so the client can gate edit/manage UI.
  app.get("/api/quizzes/:id", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { quiz, permission } = await getQuizAccess(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    if (!can(permission, "view")) return reply.code(404).send({ error: "not found" });
    const { rows: questions } = await db().query(
      `SELECT id, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec
       FROM questions WHERE quiz_id = $1 ORDER BY position`,
      [id],
    );
    return { quiz, questions, permission };
  });

  // Update quiz metadata. Requires edit.
  app.patch("/api/quizzes/:id", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { quiz, permission } = await getQuizAccess(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    if (!can(permission, "edit")) return forbiddenOrNotFound(reply, permission);
    const b = (req.body ?? {}) as Record<string, unknown>;

    // available_languages, when provided, must be a string[]. We normalise (trim, dedupe) and
    // always keep the (possibly updated) base_language in the set so a quiz can never end up
    // unable to display its own base content.
    const langs = normalizeAvailableLanguages(b.available_languages);
    if (b.available_languages !== undefined && !langs) {
      return reply.code(400).send({ error: "available_languages must be string[]" });
    }
    const nextBase =
      typeof b.base_language === "string" && b.base_language.trim()
        ? b.base_language.trim()
        : (quiz.base_language as string);
    const availableLanguages = langs
      ? Array.from(new Set([nextBase, ...langs]))
      : null;

    const { rows } = await db().query(
      `UPDATE quizzes SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         is_public = COALESCE($4, is_public),
         base_language = COALESCE($5, base_language),
         available_languages = COALESCE($6, available_languages),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        id,
        typeof b.title === "string" && b.title.trim() ? b.title.trim() : null,
        typeof b.description === "string" ? b.description : null,
        typeof b.is_public === "boolean" ? b.is_public : null,
        typeof b.base_language === "string" && b.base_language.trim() ? b.base_language.trim() : null,
        availableLanguages,
      ],
    );
    return { quiz: rows[0] };
  });

  // Delete a quiz. Requires manage.
  app.delete("/api/quizzes/:id", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { quiz, permission } = await getQuizAccess(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    if (!can(permission, "manage")) return forbiddenOrNotFound(reply, permission);
    await db().query(`DELETE FROM quizzes WHERE id = $1`, [id]);
    return { ok: true };
  });

  // Reorder a quiz's questions. Body { order: string[] } lists every question id in the
  // desired order. Requires edit.
  app.patch("/api/quizzes/:id/questions/order", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { quiz, permission } = await getQuizAccess(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    if (!can(permission, "edit")) return forbiddenOrNotFound(reply, permission);

    const order = ((req.body ?? {}) as { order?: unknown }).order as string[];
    const { rows: existing } = await db().query(
      `SELECT id FROM questions WHERE quiz_id = $1`,
      [id],
    );
    const existingIds = existing.map((r) => r.id as string);

    const check = validateOrder(existingIds, order);
    if (!check.ok) return reply.code(400).send({ error: check.error });

    const targets = computePositions(order);
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      // UNIQUE(quiz_id, position) is not deferrable, so we first push every row to a
      // temporary high offset to vacate the 1..n range, then assign the final positions.
      await client.query(`UPDATE questions SET position = position + 1000 WHERE quiz_id = $1`, [id]);
      for (const t of targets) {
        await client.query(
          `UPDATE questions SET position = $1, updated_at = now() WHERE id = $2 AND quiz_id = $3`,
          [t.position, t.id, id],
        );
      }
      await client.query(`UPDATE quizzes SET updated_at = now() WHERE id = $1`, [id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const { rows: questions } = await db().query(
      `SELECT id, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec
       FROM questions WHERE quiz_id = $1 ORDER BY position`,
      [id],
    );
    return { questions };
  });

  // Duplicate a quiz (deep copy: quiz row + all its questions). Requires view — anyone who can
  // see a quiz may take their own copy, which they then own.
  app.post("/api/quizzes/:id/duplicate", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { quiz, permission } = await getQuizAccess(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    if (!can(permission, "view")) return reply.code(404).send({ error: "not found" });

    const client = await db().connect();
    let newQuiz;
    try {
      await client.query("BEGIN");
      const { rows: created } = await client.query(
        `INSERT INTO quizzes (owner_id, title, description, cover_image, base_language, available_languages, is_public, settings)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7)
         RETURNING *`,
        [
          user.id,
          `${quiz.title} (copia)`,
          quiz.description ?? null,
          quiz.cover_image ? JSON.stringify(quiz.cover_image) : null,
          quiz.base_language,
          quiz.available_languages,
          JSON.stringify(quiz.settings ?? {}),
        ],
      );
      newQuiz = created[0];
      // Copy every question, preserving order and all type-specific config.
      await client.query(
        `INSERT INTO questions (quiz_id, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec)
         SELECT $1, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec
         FROM questions WHERE quiz_id = $2`,
        [newQuiz.id, id],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return reply.code(201).send({ quiz: newQuiz });
  });
}

// Validate + normalise an available_languages input. Returns null when the field is absent
// (so the caller leaves the column untouched) OR when it is an invalid type. The caller
// distinguishes the two cases by also checking `b.available_languages !== undefined`.
// Valid input → trimmed, de-duplicated, blank-dropped list (base_language re-added by caller).
export function normalizeAvailableLanguages(value: unknown): string[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// When the quiz exists but the caller lacks the needed level: 403 if they can at least see it
// (honest "you don't have permission"), 404 otherwise (don't leak existence).
function forbiddenOrNotFound(
  reply: import("fastify").FastifyReply,
  permission: Permission | null,
) {
  if (can(permission, "view")) return reply.code(403).send({ error: "forbidden" });
  return reply.code(404).send({ error: "not found" });
}

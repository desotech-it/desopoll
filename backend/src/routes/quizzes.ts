import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { requireAuth } from "../auth/guard.js";
import { validateImage } from "./question-image.js";
import { validateOrder, computePositions } from "./question-order.js";

const QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "open_text",
  "numeric",
  "slider",
  "ordering",
  "poll",
  "word_cloud",
] as const;

const POINTS_MODES = ["standard", "double", "none"] as const;

// A quiz the current user may edit (owner today; share-based edit comes later).
async function ownedQuiz(id: string, userId: string) {
  const { rows } = await db().query(`SELECT * FROM quizzes WHERE id = $1 AND owner_id = $2`, [id, userId]);
  return rows[0] ?? null;
}

export async function registerQuizRoutes(app: FastifyInstance): Promise<void> {
  // List quizzes owned by the current user.
  app.get("/api/quizzes", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { rows } = await db().query(
      `SELECT q.id, q.title, q.description, q.base_language, q.available_languages, q.is_public, q.updated_at,
              (SELECT count(*) FROM questions x WHERE x.quiz_id = q.id)::int AS question_count
       FROM quizzes q
       WHERE q.owner_id = $1
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

  // Get a quiz with its questions (owner only for now).
  app.get("/api/quizzes/:id", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const quiz = await ownedQuiz(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    const { rows: questions } = await db().query(
      `SELECT id, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec
       FROM questions WHERE quiz_id = $1 ORDER BY position`,
      [id],
    );
    return { quiz, questions };
  });

  // Update quiz metadata.
  app.patch("/api/quizzes/:id", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const quiz = await ownedQuiz(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    const b = (req.body ?? {}) as Record<string, unknown>;
    const { rows } = await db().query(
      `UPDATE quizzes SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         is_public = COALESCE($4, is_public),
         base_language = COALESCE($5, base_language),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        id,
        typeof b.title === "string" && b.title.trim() ? b.title.trim() : null,
        typeof b.description === "string" ? b.description : null,
        typeof b.is_public === "boolean" ? b.is_public : null,
        typeof b.base_language === "string" ? b.base_language : null,
      ],
    );
    return { quiz: rows[0] };
  });

  // Delete a quiz.
  app.delete("/api/quizzes/:id", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const quiz = await ownedQuiz(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    await db().query(`DELETE FROM quizzes WHERE id = $1`, [id]);
    return { ok: true };
  });

  // Reorder a quiz's questions. Body { order: string[] } lists every question id in the
  // desired order. Owner only.
  app.patch("/api/quizzes/:id/questions/order", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const quiz = await ownedQuiz(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });

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

  // Duplicate a quiz (deep copy: quiz row + all its questions). Owner only.
  app.post("/api/quizzes/:id/duplicate", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const quiz = await ownedQuiz(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });

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

  // Add a question to a quiz (appended at the end).
  app.post("/api/quizzes/:id/questions", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const quiz = await ownedQuiz(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });

    const b = (req.body ?? {}) as {
      type?: string;
      prompt?: string;
      image?: unknown;
      time_limit_sec?: number;
      points_mode?: string;
      speed_bonus?: boolean;
      answer_spec?: unknown;
    };
    if (!b.type || !QUESTION_TYPES.includes(b.type as (typeof QUESTION_TYPES)[number])) {
      return reply.code(400).send({ error: "invalid question type" });
    }
    // Empty prompt is allowed on create: the editor adds a draft question, then the
    // author types the text inline (saved via PATCH). The prompt is required to host a game.
    const prompt = (b.prompt ?? "").trim();
    const pointsMode = POINTS_MODES.includes(b.points_mode as (typeof POINTS_MODES)[number])
      ? b.points_mode
      : "standard";

    // image: accept null or a data-URL string within the size cap; reject anything else.
    let image: string | null = null;
    if (b.image !== undefined) {
      const v = validateImage(b.image);
      if (!v.ok) return reply.code(400).send({ error: v.error });
      image = v.value;
    }

    const { rows: posRows } = await db().query(
      `SELECT COALESCE(max(position), 0) + 1 AS next FROM questions WHERE quiz_id = $1`,
      [id],
    );
    const position = posRows[0].next as number;

    const { rows } = await db().query(
      `INSERT INTO questions (quiz_id, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 20), $7, COALESCE($8, true), COALESCE($9, '{}'::jsonb))
       RETURNING id, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec`,
      [
        id,
        position,
        b.type,
        prompt,
        image !== null ? JSON.stringify(image) : null,
        typeof b.time_limit_sec === "number" ? b.time_limit_sec : null,
        pointsMode,
        typeof b.speed_bonus === "boolean" ? b.speed_bonus : null,
        b.answer_spec ? JSON.stringify(b.answer_spec) : null,
      ],
    );
    await db().query(`UPDATE quizzes SET updated_at = now() WHERE id = $1`, [id]);
    return reply.code(201).send({ question: rows[0] });
  });

  // Update a question (must own the parent quiz).
  app.patch("/api/questions/:qid", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { qid } = req.params as { qid: string };
    const { rows: own } = await db().query(
      `SELECT q.id FROM questions x JOIN quizzes q ON q.id = x.quiz_id WHERE x.id = $1 AND q.owner_id = $2`,
      [qid, user.id],
    );
    if (!own[0]) return reply.code(404).send({ error: "not found" });
    const b = (req.body ?? {}) as Record<string, unknown>;

    // image: validate when present. Unlike the other fields, `image` is nullable and
    // must be clearable, so a separate "provided" flag drives a CASE rather than COALESCE
    // (which can't distinguish "omit" from "set to null").
    let imageProvided = false;
    let imageValue: string | null = null;
    if (b.image !== undefined) {
      const v = validateImage(b.image);
      if (!v.ok) return reply.code(400).send({ error: v.error });
      imageProvided = true;
      imageValue = v.value;
    }

    const { rows } = await db().query(
      `UPDATE questions SET
         prompt = COALESCE($2, prompt),
         image = CASE WHEN $3 THEN $4::jsonb ELSE image END,
         time_limit_sec = COALESCE($5, time_limit_sec),
         points_mode = COALESCE($6, points_mode),
         speed_bonus = COALESCE($7, speed_bonus),
         answer_spec = COALESCE($8, answer_spec),
         updated_at = now()
       WHERE id = $1
       RETURNING id, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec`,
      [
        qid,
        typeof b.prompt === "string" && b.prompt.trim() ? b.prompt.trim() : null,
        imageProvided,
        imageValue !== null ? JSON.stringify(imageValue) : null,
        typeof b.time_limit_sec === "number" ? b.time_limit_sec : null,
        POINTS_MODES.includes(b.points_mode as (typeof POINTS_MODES)[number]) ? b.points_mode : null,
        typeof b.speed_bonus === "boolean" ? b.speed_bonus : null,
        b.answer_spec !== undefined ? JSON.stringify(b.answer_spec) : null,
      ],
    );
    await db().query(`UPDATE quizzes SET updated_at = now() WHERE id = $1`, [own[0].id]);
    return { question: rows[0] };
  });

  // Delete a question.
  app.delete("/api/questions/:qid", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { qid } = req.params as { qid: string };
    const { rows: own } = await db().query(
      `SELECT q.id FROM questions x JOIN quizzes q ON q.id = x.quiz_id WHERE x.id = $1 AND q.owner_id = $2`,
      [qid, user.id],
    );
    if (!own[0]) return reply.code(404).send({ error: "not found" });
    await db().query(`DELETE FROM questions WHERE id = $1`, [qid]);
    return { ok: true };
  });
}

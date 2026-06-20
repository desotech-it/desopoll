import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { requireAuth } from "../auth/guard.js";

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
        b.image ? JSON.stringify(b.image) : null,
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
    const { rows } = await db().query(
      `UPDATE questions SET
         prompt = COALESCE($2, prompt),
         image = COALESCE($3, image),
         time_limit_sec = COALESCE($4, time_limit_sec),
         points_mode = COALESCE($5, points_mode),
         speed_bonus = COALESCE($6, speed_bonus),
         answer_spec = COALESCE($7, answer_spec),
         updated_at = now()
       WHERE id = $1
       RETURNING id, position, type, prompt, image, time_limit_sec, points_mode, speed_bonus, answer_spec`,
      [
        qid,
        typeof b.prompt === "string" && b.prompt.trim() ? b.prompt.trim() : null,
        b.image !== undefined ? JSON.stringify(b.image) : null,
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

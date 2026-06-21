// Question CRUD. Split out of quizzes.ts to keep both files under the 500-line cap. Every
// route resolves the parent quiz's effective permission and requires `edit`.
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../db.js";
import { requireAuth } from "../auth/guard.js";
import { can, type Permission } from "../auth/permissions.js";
import { getQuizAccess } from "./quiz-access.js";
import { validateImage } from "./question-image.js";

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

// When the quiz exists but the caller lacks edit: 403 if they can at least view, else 404.
function denyEdit(reply: FastifyReply, permission: Permission | null) {
  if (can(permission, "view")) return reply.code(403).send({ error: "forbidden" });
  return reply.code(404).send({ error: "not found" });
}

// Resolve the parent quiz of a question and the caller's permission on it. Returns the quiz id
// when found, or null (after sending the response) when missing.
async function quizOfQuestion(qid: string): Promise<string | null> {
  const { rows } = await db().query<{ quiz_id: string }>(
    `SELECT quiz_id FROM questions WHERE id = $1`,
    [qid],
  );
  return rows[0]?.quiz_id ?? null;
}

export async function registerQuestionRoutes(app: FastifyInstance): Promise<void> {
  // Add a question to a quiz (appended at the end). Requires edit.
  app.post("/api/quizzes/:id/questions", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { quiz, permission } = await getQuizAccess(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    if (!can(permission, "edit")) return denyEdit(reply, permission);

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

  // Update a question. Requires edit on the parent quiz.
  app.patch("/api/questions/:qid", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { qid } = req.params as { qid: string };
    const quizId = await quizOfQuestion(qid);
    if (!quizId) return reply.code(404).send({ error: "not found" });
    const { permission } = await getQuizAccess(quizId, user.id);
    if (!can(permission, "edit")) return denyEdit(reply, permission);
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
    await db().query(`UPDATE quizzes SET updated_at = now() WHERE id = $1`, [quizId]);
    return { question: rows[0] };
  });

  // Delete a question. Requires edit on the parent quiz.
  app.delete("/api/questions/:qid", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { qid } = req.params as { qid: string };
    const quizId = await quizOfQuestion(qid);
    if (!quizId) return reply.code(404).send({ error: "not found" });
    const { permission } = await getQuizAccess(quizId, user.id);
    if (!can(permission, "edit")) return denyEdit(reply, permission);
    await db().query(`DELETE FROM questions WHERE id = $1`, [qid]);
    await db().query(`UPDATE quizzes SET updated_at = now() WHERE id = $1`, [quizId]);
    return { ok: true };
  });
}

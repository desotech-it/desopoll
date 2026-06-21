// Content-translation management for a quiz (issue #6). Translations live in the EAV table
// content_translations(entity_type, entity_id, lang, field, value) — adding a language means
// inserting rows, never an ALTER. These routes read/write that table for a single quiz plus
// its questions and their options (option ids live inside questions.answer_spec.options[].id
// and .items[].id for ordering).
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../db.js";
import { requireAuth } from "../auth/guard.js";
import { can, type Permission } from "../auth/permissions.js";
import { getQuizAccess } from "./quiz-access.js";

// Always-allowed language codes even if not yet in the quiz's available_languages, so an
// editor can author a new language before flipping it on.
const ALWAYS_ALLOWED_LANGS = ["it", "en", "es"] as const;

type EntityType = "quiz" | "question" | "option";
const ENTITY_TYPES: readonly EntityType[] = ["quiz", "question", "option"];

interface TranslationEntry {
  entity_type: EntityType;
  entity_id: string;
  lang: string;
  field: string;
  value: string;
}

// The set of ids belonging to a quiz: the quiz itself, its question ids, and its option ids
// (extracted from each question's answer_spec). Used to reject entries that reference content
// outside this quiz, and to scope the GET query.
interface QuizEntityIds {
  questionIds: string[];
  optionIds: string[];
}

async function loadQuizEntityIds(quizId: string): Promise<QuizEntityIds> {
  const { rows } = await db().query<{ id: string; answer_spec: unknown }>(
    `SELECT id, answer_spec FROM questions WHERE quiz_id = $1`,
    [quizId],
  );
  const questionIds: string[] = [];
  const optionIds = new Set<string>();
  for (const r of rows) {
    questionIds.push(r.id);
    const spec = (r.answer_spec ?? {}) as Record<string, unknown>;
    for (const key of ["options", "items"]) {
      const arr = spec[key];
      if (Array.isArray(arr)) {
        for (const o of arr) {
          if (o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string") {
            optionIds.add((o as { id: string }).id);
          }
        }
      }
    }
  }
  return { questionIds, optionIds: Array.from(optionIds) };
}

function isEntityType(v: unknown): v is EntityType {
  return typeof v === "string" && (ENTITY_TYPES as readonly string[]).includes(v);
}

// Validate one entry's shape and that its (entity_type, entity_id) belongs to this quiz.
function validateEntry(
  e: unknown,
  quizId: string,
  ids: QuizEntityIds,
  allowedLangs: ReadonlySet<string>,
): { ok: true; entry: TranslationEntry } | { ok: false; error: string } {
  if (!e || typeof e !== "object") return { ok: false, error: "entry must be an object" };
  const r = e as Record<string, unknown>;
  if (!isEntityType(r.entity_type)) return { ok: false, error: "invalid entity_type" };
  if (typeof r.entity_id !== "string" || !r.entity_id) return { ok: false, error: "invalid entity_id" };
  if (typeof r.lang !== "string" || !allowedLangs.has(r.lang)) return { ok: false, error: `invalid lang: ${String(r.lang)}` };
  if (typeof r.field !== "string" || !r.field.trim()) return { ok: false, error: "invalid field" };
  const value = typeof r.value === "string" ? r.value : "";

  const entityType = r.entity_type;
  const entityId = r.entity_id;
  const belongs =
    (entityType === "quiz" && entityId === quizId) ||
    (entityType === "question" && ids.questionIds.includes(entityId)) ||
    (entityType === "option" && ids.optionIds.includes(entityId));
  if (!belongs) return { ok: false, error: `entity ${entityType}:${entityId} not in quiz` };

  return { ok: true, entry: { entity_type: entityType, entity_id: entityId, lang: r.lang, field: r.field.trim(), value } };
}

function forbiddenOrNotFound(reply: FastifyReply, permission: Permission | null) {
  if (can(permission, "view")) return reply.code(403).send({ error: "forbidden" });
  return reply.code(404).send({ error: "not found" });
}

export async function registerTranslationRoutes(app: FastifyInstance): Promise<void> {
  // GET all translation rows for a quiz + its questions + its options. Requires view.
  app.get("/api/quizzes/:id/translations", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { quiz, permission } = await getQuizAccess(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    if (!can(permission, "view")) return reply.code(404).send({ error: "not found" });

    const ids = await loadQuizEntityIds(id);
    const { rows: entries } = await db().query<TranslationEntry>(
      `SELECT entity_type, entity_id, lang, field, value
         FROM content_translations
        WHERE (entity_type = 'quiz'     AND entity_id = $1)
           OR (entity_type = 'question' AND entity_id = ANY($2::uuid[]))
           OR (entity_type = 'option'   AND entity_id = ANY($3::uuid[]))
        ORDER BY entity_type, entity_id, lang, field`,
      [id, ids.questionIds, ids.optionIds],
    );
    return {
      baseLanguage: quiz.base_language,
      availableLanguages: quiz.available_languages,
      entries,
    };
  });

  // PUT (replace-by-key) the translation rows. Requires edit. Non-empty values are upserted;
  // empty/blank values delete the matching row. Runs in a single transaction.
  app.put("/api/quizzes/:id/translations", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const { quiz, permission } = await getQuizAccess(id, user.id);
    if (!quiz) return reply.code(404).send({ error: "not found" });
    if (!can(permission, "edit")) return forbiddenOrNotFound(reply, permission);

    const body = (req.body ?? {}) as { entries?: unknown };
    if (!Array.isArray(body.entries)) return reply.code(400).send({ error: "entries[] required" });

    const allowedLangs = new Set<string>([
      ...ALWAYS_ALLOWED_LANGS,
      ...(quiz.available_languages ?? []),
    ]);
    const ids = await loadQuizEntityIds(id);

    const valid: TranslationEntry[] = [];
    for (const e of body.entries) {
      const v = validateEntry(e, id, ids, allowedLangs);
      if (!v.ok) return reply.code(400).send({ error: v.error });
      valid.push(v.entry);
    }

    const client = await db().connect();
    let upserted = 0;
    let deleted = 0;
    try {
      await client.query("BEGIN");
      for (const e of valid) {
        if (e.value.trim() === "") {
          const res = await client.query(
            `DELETE FROM content_translations
              WHERE entity_type = $1 AND entity_id = $2 AND lang = $3 AND field = $4`,
            [e.entity_type, e.entity_id, e.lang, e.field],
          );
          deleted += res.rowCount ?? 0;
        } else {
          await client.query(
            `INSERT INTO content_translations (entity_type, entity_id, lang, field, value)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (entity_type, entity_id, lang, field)
             DO UPDATE SET value = EXCLUDED.value`,
            [e.entity_type, e.entity_id, e.lang, e.field, e.value],
          );
          upserted += 1;
        }
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { ok: true, upserted, deleted };
  });
}

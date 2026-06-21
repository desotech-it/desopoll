// Post-game report endpoint. Live sessions are deleted from Redis when they end, but the
// durable rows in Postgres persist — so this report reads exclusively from Postgres
// (game_sessions, questions via the quiz, answers, session_players). Host-only.
import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { requireAuth } from "../auth/guard.js";
import {
  buildReport,
  type ReportAnswerRow,
  type ReportPlayerRow,
  type ReportQuestionRow,
} from "./report-aggregate.js";

interface SessionRow {
  id: string;
  quiz_id: string;
  host_id: string;
  state: string;
  started_at: string | null;
  ended_at: string | null;
}

export async function registerReportRoutes(app: FastifyInstance): Promise<void> {
  // Host-only post-game report. Returns per-question stats + final standings, all from
  // durable Postgres rows (works after the live session has been torn down from Redis).
  app.get("/api/sessions/:id/report", async (req, reply) => {
    const user = await requireAuth(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };

    const { rows: sessRows } = await db().query<SessionRow>(
      `SELECT id, quiz_id, host_id, state, started_at, ended_at
       FROM game_sessions WHERE id = $1`,
      [id],
    );
    const session = sessRows[0];
    if (!session) return reply.code(404).send({ error: "session not found" });
    if (session.host_id !== user.id) return reply.code(403).send({ error: "not the host" });

    // Questions of the session's quiz, in play order.
    const { rows: questions } = await db().query<ReportQuestionRow>(
      `SELECT id, position, type, prompt, answer_spec
       FROM questions WHERE quiz_id = $1 ORDER BY position`,
      [session.quiz_id],
    );

    // Every recorded answer for this session.
    const { rows: answers } = await db().query<ReportAnswerRow>(
      `SELECT question_id, player_id, payload, is_correct, points_awarded
       FROM answers WHERE session_id = $1`,
      [id],
    );

    // Final per-player scores.
    const { rows: players } = await db().query<ReportPlayerRow>(
      `SELECT id, nickname, score FROM session_players WHERE session_id = $1`,
      [id],
    );

    const report = buildReport(questions, answers, players);
    return {
      session: {
        id: session.id,
        quizId: session.quiz_id,
        state: session.state,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        playerCount: players.length,
      },
      questions: report.questions,
      standings: report.standings,
    };
  });
}

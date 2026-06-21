// Quiz editor (/quiz/:id) — edit quiz meta + manage questions of all supported types.
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  questions as questionsApi,
  quizzes,
  sessions,
  type Question,
  type QuestionType,
  type Quiz,
} from "../../api";
import { defaultAnswerSpec } from "../../questionTypes";
import {
  canEdit as canEditFn,
  canManage as canManageFn,
  canPlay as canPlayFn,
  type Permission,
} from "../../permissions";
import {
  btnGhost,
  btnPrimary,
  Chip,
  ErrorBox,
  glass,
  glassSoft,
  Spinner,
  tokens,
} from "../../ui";
import { useAuth } from "../../auth";
import { QuizMetaEditor, QuizMetaReadOnly } from "./QuizMeta";
import { TypePicker } from "./TypePicker";
import { QuestionEditor } from "./QuestionEditor";
import { QuestionReadOnly } from "./QuestionReadOnly";
import { ShareDialog } from "../share/ShareDialog";

export function QuizEditor() {
  const { t } = useTranslation("editor");
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [items, setItems] = useState<Question[]>([]);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [sharing, setSharing] = useState(false);

  const editable = canEditFn(permission);
  const manageable = canManageFn(permission);
  const playable = canPlayFn(permission);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quizzes.get(id);
      setQuiz(data.quiz);
      setPermission(data.permission);
      setItems([...data.questions].sort((a, b) => a.position - b.position));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchQuiz = useCallback(
    async (body: { title?: string; description?: string; is_public?: boolean }) => {
      try {
        const { quiz: updated } = await quizzes.update(id, body);
        setQuiz(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("errorPatch"));
        throw e; // let callers (e.g. the public toggle) reflect the failed save
      }
    },
    [id, t],
  );

  async function addQuestion(type: QuestionType) {
    setAdding(true);
    setError(null);
    try {
      const { question } = await questionsApi.create(id, {
        type,
        prompt: "",
        time_limit_sec: 30,
        points_mode: "standard",
        speed_bonus: true,
        answer_spec: defaultAnswerSpec(type),
      });
      setItems((prev) => [...prev, question].sort((a, b) => a.position - b.position));
      setShowTypePicker(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorAddQuestion"));
    } finally {
      setAdding(false);
    }
  }

  async function launchGame() {
    setLaunching(true);
    setError(null);
    try {
      const { id: sessionId } = await sessions.create(id);
      navigate(`/host/${sessionId}`);
    } catch (e) {
      // 400 {error:"quiz has no questions"} is surfaced here.
      setError(e instanceof Error ? e.message : t("errorLaunch"));
    } finally {
      setLaunching(false);
    }
  }

  function onQuestionSaved(updated: Question) {
    setItems((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  }

  // Move the question at `from` by one slot in `dir` and persist the new order.
  async function moveQuestion(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= items.length || reordering) return;
    const prev = items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Optimistic reorder; reconcile with server response (renumbered positions).
    setItems(next);
    setReordering(true);
    setError(null);
    try {
      const { questions: ordered } = await quizzes.reorderQuestions(
        id,
        next.map((q) => q.id),
      );
      setItems([...ordered].sort((a, b) => a.position - b.position));
    } catch (e) {
      setItems(prev); // revert on failure
      setError(e instanceof Error ? e.message : t("errorReorder"));
    } finally {
      setReordering(false);
    }
  }

  async function deleteQuestion(q: Question) {
    if (!window.confirm(t("confirmDeleteQuestion"))) return;
    try {
      await questionsApi.remove(q.id);
      setItems((prev) => prev.filter((x) => x.id !== q.id));
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : t("errorDeleteQuestion"));
    }
  }

  if (loading) {
    return (
      <div style={{ ...glass, padding: 8 }}>
        <Spinner label={t("loading")} />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div>
        <ErrorBox message={error ?? t("quizNotFound")} onRetry={load} />
        <div style={{ marginTop: 16 }}>
          <Link to="/" style={btnGhost}>
            {t("common:actions.backToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link to="/" style={btnGhost}>
          {t("allQuizzes")}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {manageable && (
            <button style={btnGhost} onClick={() => setSharing(true)} title={t("shareHint")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {t("share")}
            </button>
          )}
          {playable && (
            <button
              style={{ ...btnPrimary, opacity: launching || items.length === 0 ? 0.6 : 1 }}
              disabled={launching || items.length === 0}
              onClick={launchGame}
              title={items.length === 0 ? t("launchEmptyHint") : t("launchHint")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
              </svg>
              {launching ? t("launching") : t("launch")}
            </button>
          )}
        </div>
      </div>

      {!editable && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(130,190,255,.16)",
            border: "1px solid rgba(255,255,255,0.6)",
            fontSize: 13,
            color: tokens.ink2,
          }}
        >
          <Chip tone="sky">{t("readOnlyChip")}</Chip>
          <span>{t("readOnlyNote")}</span>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox message={error} />
        </div>
      )}

      {editable ? (
        <QuizMetaEditor quiz={quiz} onPatch={patchQuiz} />
      ) : (
        <QuizMetaReadOnly quiz={quiz} />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "26px 0 14px",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          {t("questionsHeading")}{" "}
          <span style={{ fontSize: 13, fontWeight: 400, color: tokens.ink3, marginLeft: 4 }}>
            {items.length}
          </span>
        </h2>
        {editable && !showTypePicker && (
          <button style={btnPrimary} onClick={() => setShowTypePicker(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t("addQuestion")}
          </button>
        )}
      </div>

      {editable && showTypePicker && (
        <TypePicker
          adding={adding}
          onPick={addQuestion}
          onCancel={() => setShowTypePicker(false)}
        />
      )}

      {items.length === 0 && !showTypePicker ? (
        <div style={{ ...glassSoft, borderRadius: 22, padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: tokens.muted, margin: editable ? "0 0 18px" : 0, fontSize: 14 }}>
            {t("noQuestions")}
          </p>
          {editable && (
            <button style={btnPrimary} onClick={() => setShowTypePicker(true)}>
              {t("addFirstQuestion")}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((q, i) =>
            editable ? (
              <QuestionEditor
                key={q.id}
                index={i}
                question={q}
                onSaved={onQuestionSaved}
                onDelete={() => deleteQuestion(q)}
                onError={setError}
                onMoveUp={() => moveQuestion(i, -1)}
                onMoveDown={() => moveQuestion(i, 1)}
                canMoveUp={i > 0}
                canMoveDown={i < items.length - 1}
                reordering={reordering}
              />
            ) : (
              <QuestionReadOnly key={q.id} index={i} question={q} />
            ),
          )}
        </div>
      )}

      {sharing && (
        <ShareDialog
          quizId={id}
          quizTitle={quiz.title}
          isAdmin={isAdmin}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}

// Dashboard (/) — lists OWNED quizzes and quizzes SHARED WITH ME, as glass
// cards. Per-card actions are gated by the caller's permission level (issue #4):
// host needs play+, edit needs edit+, delete/share need manage. The "Condividi"
// dialog opens for manageable quizzes.
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, quizzes, sessions, type Quiz } from "../api";
import { canEdit, canManage, canPlay } from "../permissions";
import {
  btnGhost,
  btnPrimary,
  ErrorBox,
  glass,
  glassSoft,
  inputStyle,
  Spinner,
  tokens,
} from "../ui";
import { QuizCard } from "./dashboard/QuizCard";
import { ShareDialog } from "./share/ShareDialog";
import { useAuth } from "../auth";

export function Dashboard() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [list, setList] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState<Quiz | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { quizzes: qs } = await quizzes.list();
      setList(qs);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorLoad"));
      setList([]);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setBusy(true);
    try {
      const { quiz } = await quizzes.create({ title });
      setNewTitle("");
      setCreating(false);
      navigate(`/quiz/${quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorCreate"));
    } finally {
      setBusy(false);
    }
  }

  async function launchGame(q: Quiz) {
    try {
      const { id } = await sessions.create(q.id);
      navigate(`/host/${id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("errorLaunch");
      window.alert(msg);
    }
  }

  async function deleteQuiz(q: Quiz) {
    if (!window.confirm(t("confirmDelete", { title: q.title }))) return;
    try {
      await quizzes.remove(q.id);
      setList((prev) => (prev ? prev.filter((x) => x.id !== q.id) : prev));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("errorDelete");
      window.alert(msg);
    }
  }

  async function duplicateQuiz(q: Quiz) {
    setError(null);
    try {
      const { quiz } = await quizzes.duplicate(q.id);
      await load(); // refresh so the copy + exact counts/timestamps appear
      navigate(`/quiz/${quiz.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorDuplicate"));
    }
  }

  const owned = (list ?? []).filter((q) => q.owned !== false);
  const shared = (list ?? []).filter((q) => q.owned === false);

  function renderCard(q: Quiz) {
    return (
      <QuizCard
        key={q.id}
        quiz={q}
        canPlay={canPlay(q.permission)}
        canEdit={canEdit(q.permission)}
        canManage={canManage(q.permission)}
        onOpen={() => navigate(`/quiz/${q.id}`)}
        onLaunch={() => launchGame(q)}
        onDelete={() => deleteQuiz(q)}
        onDuplicate={() => duplicateQuiz(q)}
        onShare={() => setSharing(q)}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>{t("title")}</h1>
          <p style={{ color: tokens.muted, margin: 0, fontSize: 14 }}>
            {list ? t("libraryCount", { count: owned.length }) : t("libraryFallback")}
          </p>
        </div>
        {!creating && (
          <button style={btnPrimary} onClick={() => setCreating(true)}>
            <PlusIcon />
            {t("newQuiz")}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={createQuiz} style={{ ...glass, padding: 18, marginBottom: 22 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: tokens.ink2, display: "block", marginBottom: 8 }}>
            {t("newQuizTitleLabel")}
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("newQuizPlaceholder")}
              style={{ ...inputStyle, flex: 1, minWidth: 220 }}
            />
            <button type="submit" disabled={busy || !newTitle.trim()} style={{ ...btnPrimary, opacity: busy || !newTitle.trim() ? 0.6 : 1 }}>
              {busy ? t("creating") : t("createAndEdit")}
            </button>
            <button
              type="button"
              style={btnGhost}
              onClick={() => {
                setCreating(false);
                setNewTitle("");
              }}
            >
              {t("common:actions.cancel")}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div style={{ marginBottom: 18 }}>
          <ErrorBox message={error} onRetry={load} />
        </div>
      )}

      {list === null ? (
        <div style={{ ...glass, padding: 8 }}>
          <Spinner label={t("loadingQuizzes")} />
        </div>
      ) : owned.length === 0 && shared.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <>
          {owned.length === 0 ? (
            <EmptyOwned onCreate={() => setCreating(true)} />
          ) : (
            <CardGrid>{owned.map(renderCard)}</CardGrid>
          )}

          {shared.length > 0 && (
            <section style={{ marginTop: 34 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{t("sharedWithMe")}</h2>
              <p style={{ color: tokens.muted, margin: "0 0 16px", fontSize: 13.5 }}>
                {t("sharedCount", { count: shared.length })}
              </p>
              <CardGrid>{shared.map(renderCard)}</CardGrid>
            </section>
          )}
        </>
      )}

      {sharing && (
        <ShareDialog
          quizId={sharing.id}
          quizTitle={sharing.title}
          isAdmin={isAdmin}
          onClose={() => setSharing(null)}
        />
      )}
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
        gap: 18,
      }}
    >
      {children}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <div style={{ ...glassSoft, borderRadius: 22, padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>{t("emptyTitle")}</h2>
      <p style={{ color: tokens.muted, margin: "0 0 20px", fontSize: 14 }}>{t("emptyBody")}</p>
      <button style={btnPrimary} onClick={onCreate}>
        <PlusIcon />
        {t("emptyCreate")}
      </button>
    </div>
  );
}

function EmptyOwned({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <div style={{ ...glassSoft, borderRadius: 22, padding: "32px 24px", textAlign: "center" }}>
      <p style={{ color: tokens.muted, margin: "0 0 16px", fontSize: 14 }}>{t("emptyOwnedBody")}</p>
      <button style={btnPrimary} onClick={onCreate}>
        <PlusIcon />
        {t("emptyOwnedCreate")}
      </button>
    </div>
  );
}

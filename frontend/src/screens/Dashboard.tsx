// Dashboard (/) — lists the user's quizzes as glass cards, with create + delete.
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, quizzes, sessions, type Quiz } from "../api";
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  Chip,
  ErrorBox,
  glass,
  glassSoft,
  inputStyle,
  Spinner,
  tokens,
} from "../ui";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function Dashboard() {
  const navigate = useNavigate();
  const [list, setList] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { quizzes: qs } = await quizzes.list();
      setList(qs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento dei quiz.");
      setList([]);
    }
  }, []);

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
      setError(err instanceof Error ? err.message : "Creazione del quiz non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  async function launchGame(q: Quiz) {
    try {
      const { id } = await sessions.create(q.id);
      navigate(`/host/${id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Avvio della partita non riuscito.";
      window.alert(msg);
    }
  }

  async function deleteQuiz(q: Quiz) {
    if (!window.confirm(`Eliminare il quiz "${q.title}"? L'operazione non è reversibile.`)) return;
    try {
      await quizzes.remove(q.id);
      setList((prev) => (prev ? prev.filter((x) => x.id !== q.id) : prev));
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Eliminazione non riuscita.";
      window.alert(msg);
    }
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
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>I tuoi quiz</h1>
          <p style={{ color: tokens.muted, margin: 0, fontSize: 14 }}>
            {list ? `${list.length} quiz nella tua libreria` : "Libreria quiz"}
          </p>
        </div>
        {!creating && (
          <button style={btnPrimary} onClick={() => setCreating(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuovo quiz
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={createQuiz} style={{ ...glass, padding: 18, marginBottom: 22 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: tokens.ink2, display: "block", marginBottom: 8 }}>
            Titolo del nuovo quiz
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Es. AWS Solutions Architect — Capitolo 1"
              style={{ ...inputStyle, flex: 1, minWidth: 220 }}
            />
            <button type="submit" disabled={busy || !newTitle.trim()} style={{ ...btnPrimary, opacity: busy || !newTitle.trim() ? 0.6 : 1 }}>
              {busy ? "Creazione…" : "Crea e modifica"}
            </button>
            <button
              type="button"
              style={btnGhost}
              onClick={() => {
                setCreating(false);
                setNewTitle("");
              }}
            >
              Annulla
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
          <Spinner label="Caricamento dei quiz…" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
            gap: 18,
          }}
        >
          {list.map((q) => (
            <QuizCard
              key={q.id}
              quiz={q}
              onOpen={() => navigate(`/quiz/${q.id}`)}
              onLaunch={() => launchGame(q)}
              onDelete={() => deleteQuiz(q)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizCard({
  quiz,
  onOpen,
  onLaunch,
  onDelete,
}: {
  quiz: Quiz;
  onOpen: () => void;
  onLaunch: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        ...glass,
        borderRadius: 22,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "16px 18px 0", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              margin: "0 0 6px",
              lineHeight: 1.3,
              color: tokens.ink,
              cursor: "pointer",
            }}
            onClick={onOpen}
          >
            {quiz.title}
          </h3>
          {quiz.is_public ? <Chip tone="green">Pubblico</Chip> : <Chip tone="violet">Privato</Chip>}
        </div>
        <p style={{ fontSize: 13, color: tokens.ink3, margin: "0 0 12px", lineHeight: 1.5, minHeight: 19 }}>
          {quiz.description || "Nessuna descrizione."}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: tokens.ink3, marginBottom: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {quiz.question_count ?? 0} domande
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDate(quiz.updated_at)}
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 18px",
          borderTop: "1px solid rgba(124,108,224,0.12)",
        }}
      >
        <button style={btnPrimary} onClick={onLaunch} title="Avvia una partita dal vivo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
          </svg>
          Avvia partita
        </button>
        <button style={btnGhost} onClick={onOpen}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Modifica
        </button>
        <button style={{ ...btnDanger, marginLeft: "auto" }} onClick={onDelete} title="Elimina quiz">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
          Elimina
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{ ...glassSoft, borderRadius: 22, padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>Nessun quiz, per ora</h2>
      <p style={{ color: tokens.muted, margin: "0 0 20px", fontSize: 14 }}>
        Crea il tuo primo quiz e inizia ad aggiungere domande in stile Kahoot.
      </p>
      <button style={btnPrimary} onClick={onCreate}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Crea il primo quiz
      </button>
    </div>
  );
}

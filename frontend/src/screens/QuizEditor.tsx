// Quiz editor (/quiz/:id) — edit quiz meta + manage questions of all supported types.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  questions as questionsApi,
  quizzes,
  type AnswerSpec,
  type Option,
  type PointsMode,
  type Question,
  type QuestionType,
  type Quiz,
} from "../api";
import {
  answerSummary,
  defaultAnswerSpec,
  hasOptions,
  isOpenText,
  isTrueFalse,
  QUESTION_TYPES,
  typeName,
  uuid,
} from "../questionTypes";
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  Chip,
  ErrorBox,
  glass,
  glassSoft,
  inputStyle,
  labelStyle,
  ShapeBadge,
  Spinner,
  tokens,
} from "../ui";

export function QuizEditor() {
  const { id = "" } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quizzes.get(id);
      setQuiz(data.quiz);
      setItems([...data.questions].sort((a, b) => a.position - b.position));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento del quiz.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchQuiz = useCallback(
    async (body: { title?: string; description?: string; is_public?: boolean }) => {
      try {
        const { quiz: updated } = await quizzes.update(id, body);
        setQuiz(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Salvataggio del quiz non riuscito.");
      }
    },
    [id],
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
      setError(e instanceof Error ? e.message : "Aggiunta della domanda non riuscita.");
    } finally {
      setAdding(false);
    }
  }

  function onQuestionSaved(updated: Question) {
    setItems((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  }

  async function deleteQuestion(q: Question) {
    if (!window.confirm("Eliminare questa domanda?")) return;
    try {
      await questionsApi.remove(q.id);
      setItems((prev) => prev.filter((x) => x.id !== q.id));
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Eliminazione non riuscita.");
    }
  }

  if (loading) {
    return (
      <div style={{ ...glass, padding: 8 }}>
        <Spinner label="Caricamento dell'editor…" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div>
        <ErrorBox message={error ?? "Quiz non trovato."} onRetry={load} />
        <div style={{ marginTop: 16 }}>
          <Link to="/" style={btnGhost}>
            ← Torna alla dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={{ ...btnGhost, marginBottom: 14 }}>
          ← Tutti i quiz
        </Link>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorBox message={error} />
        </div>
      )}

      <QuizMetaEditor quiz={quiz} onPatch={patchQuiz} />

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
          Domande{" "}
          <span style={{ fontSize: 13, fontWeight: 400, color: tokens.ink3, marginLeft: 4 }}>
            {items.length}
          </span>
        </h2>
        {!showTypePicker && (
          <button style={btnPrimary} onClick={() => setShowTypePicker(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Aggiungi domanda
          </button>
        )}
      </div>

      {showTypePicker && (
        <TypePicker
          adding={adding}
          onPick={addQuestion}
          onCancel={() => setShowTypePicker(false)}
        />
      )}

      {items.length === 0 && !showTypePicker ? (
        <div style={{ ...glassSoft, borderRadius: 22, padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: tokens.muted, margin: "0 0 18px", fontSize: 14 }}>
            Questo quiz non ha ancora domande.
          </p>
          <button style={btnPrimary} onClick={() => setShowTypePicker(true)}>
            Aggiungi la prima domanda
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((q, i) => (
            <QuestionEditor
              key={q.id}
              index={i}
              question={q}
              onSaved={onQuestionSaved}
              onDelete={() => deleteQuestion(q)}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Quiz title/description/public ----
function QuizMetaEditor({
  quiz,
  onPatch,
}: {
  quiz: Quiz;
  onPatch: (body: { title?: string; description?: string; is_public?: boolean }) => void;
}) {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? "");

  useEffect(() => {
    setTitle(quiz.title);
    setDescription(quiz.description ?? "");
  }, [quiz.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ ...glass, padding: "22px 24px" }}>
      <label style={labelStyle} htmlFor="quiz-title">
        Titolo del quiz
      </label>
      <input
        id="quiz-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== quiz.title && onPatch({ title: title.trim() })}
        style={{ ...inputStyle, fontSize: 18, fontWeight: 600, marginBottom: 16 }}
      />

      <label style={labelStyle} htmlFor="quiz-desc">
        Descrizione
      </label>
      <textarea
        id="quiz-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={() => description !== (quiz.description ?? "") && onPatch({ description })}
        rows={2}
        placeholder="Una breve descrizione del quiz…"
        style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Toggle
          checked={quiz.is_public}
          onChange={(v) => onPatch({ is_public: v })}
          label="Quiz pubblico"
        />
        <span style={{ fontSize: 12.5, color: tokens.ink3 }}>
          {quiz.is_public
            ? "Visibile e riutilizzabile da altri utenti."
            : "Visibile solo a te."}
        </span>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        font: "inherit",
      }}
    >
      <span
        style={{
          width: 42,
          height: 25,
          borderRadius: 999,
          background: checked ? "rgba(124,108,224,0.7)" : "rgba(124,108,224,0.3)",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.6)",
          flex: "0 0 auto",
          transition: "background .2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 19 : 2,
            width: 19,
            height: 19,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .2s",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: tokens.ink2 }}>{label}</span>
    </button>
  );
}

// ---- Question type picker ----
function TypePicker({
  adding,
  onPick,
  onCancel,
}: {
  adding: boolean;
  onPick: (t: QuestionType) => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Scegli il tipo di domanda</h3>
        <button style={btnGhost} onClick={onCancel} disabled={adding}>
          Annulla
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 12,
          opacity: adding ? 0.6 : 1,
          pointerEvents: adding ? "none" : "auto",
        }}
      >
        {QUESTION_TYPES.map((t, i) => (
          <button
            key={t.type}
            onClick={() => onPick(t.type)}
            style={{
              ...glassSoft,
              textAlign: "left",
              padding: "16px 16px 14px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              font: "inherit",
            }}
          >
            <ShapeBadge index={i} size={40} />
            <span style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>{t.name}</span>
            <span style={{ fontSize: 12.5, color: tokens.ink2, lineHeight: 1.5 }}>{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Per-question editor ----
function QuestionEditor({
  index,
  question,
  onSaved,
  onDelete,
  onError,
}: {
  index: number;
  question: Question;
  onSaved: (q: Question) => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [timeLimit, setTimeLimit] = useState(question.time_limit_sec);
  const [pointsMode, setPointsMode] = useState<PointsMode>(question.points_mode);
  const [spec, setSpec] = useState<AnswerSpec>(question.answer_spec);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimer = useRef<number | null>(null);

  // Keep local state synced if the question object is replaced from server.
  useEffect(() => {
    setPrompt(question.prompt);
    setTimeLimit(question.time_limit_sec);
    setPointsMode(question.points_mode);
    setSpec(question.answer_spec);
  }, [question]);

  const flashSaved = useCallback(() => {
    setSavingState("saved");
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSavingState("idle"), 1600);
  }, []);

  const persist = useCallback(
    async (patch: {
      prompt?: string;
      time_limit_sec?: number;
      points_mode?: PointsMode;
      answer_spec?: AnswerSpec;
    }) => {
      setSavingState("saving");
      try {
        const { question: updated } = await questionsApi.update(question.id, patch);
        onSaved(updated);
        flashSaved();
      } catch (e) {
        setSavingState("idle");
        onError(e instanceof Error ? e.message : "Salvataggio della domanda non riuscito.");
      }
    },
    [question.id, onSaved, onError, flashSaved],
  );

  // Persist a spec change immediately (option add/remove, correct toggles, etc.).
  const persistSpec = useCallback(
    (next: AnswerSpec) => {
      setSpec(next);
      void persist({ answer_spec: next });
    },
    [persist],
  );

  return (
    <div style={{ ...glass, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: "rgba(124,108,224,0.14)",
            color: tokens.brandInk,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            flex: "0 0 auto",
          }}
        >
          {index + 1}
        </span>
        <Chip tone="violet">{typeName(question.type)}</Chip>
        <span style={{ fontSize: 12, color: tokens.ink3 }}>{answerSummary(question.type, spec)}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {savingState === "saving" && (
            <span style={{ fontSize: 12, color: tokens.hint }}>Salvataggio…</span>
          )}
          {savingState === "saved" && (
            <span style={{ fontSize: 12, color: "#2f7d54" }}>✓ Salvato</span>
          )}
          <button style={btnDanger} onClick={onDelete} title="Elimina domanda">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </span>
      </div>

      <label style={labelStyle}>Testo della domanda</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onBlur={() => prompt !== question.prompt && persist({ prompt })}
        rows={Math.min(8, Math.max(2, Math.ceil(prompt.length / 70)))}
        placeholder="Scrivi qui la domanda (anche lunga, stile VMware/AWS)…"
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, marginBottom: 16 }}
      />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ minWidth: 140 }}>
          <label style={labelStyle}>Tempo limite (sec)</label>
          <input
            type="number"
            min={5}
            max={600}
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            onBlur={() => timeLimit !== question.time_limit_sec && persist({ time_limit_sec: timeLimit })}
            style={inputStyle}
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <label style={labelStyle}>Punteggio</label>
          <select
            value={pointsMode}
            onChange={(e) => {
              const v = e.target.value as PointsMode;
              setPointsMode(v);
              void persist({ points_mode: v });
            }}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="standard">Standard</option>
            <option value="double">Doppio</option>
            <option value="none">Nessun punteggio</option>
          </select>
        </div>
      </div>

      <AnswerEditor type={question.type} spec={spec} onChange={persistSpec} />
    </div>
  );
}

// ---- Answer-spec editors (one per type) ----
function AnswerEditor({
  type,
  spec,
  onChange,
}: {
  type: QuestionType;
  spec: AnswerSpec;
  onChange: (next: AnswerSpec) => void;
}) {
  if (type === "true_false") return <TrueFalseEditor spec={spec} onChange={onChange} />;
  if (type === "open_text") return <OpenTextEditor spec={spec} onChange={onChange} />;
  if (type === "poll") return <OptionsEditor type={type} spec={spec} onChange={onChange} />;
  // single_choice / multiple_choice
  return <OptionsEditor type={type} spec={spec} onChange={onChange} />;
}

function OptionsEditor({
  type,
  spec,
  onChange,
}: {
  type: QuestionType;
  spec: AnswerSpec;
  onChange: (next: AnswerSpec) => void;
}) {
  if (!hasOptions(spec)) return null;
  const options = spec.options;
  const correct = type === "poll" ? [] : spec.correct ?? [];
  const isPoll = type === "poll";
  const isSingle = type === "single_choice";

  function setOptionText(optId: string, text: string) {
    const next = { ...spec, options: options.map((o) => (o.id === optId ? { ...o, text } : o)) } as AnswerSpec;
    onChange(next);
  }

  function addOption() {
    if (options.length >= 6) return;
    const opt: Option = { id: uuid(), text: "" };
    onChange({ ...spec, options: [...options, opt] } as AnswerSpec);
  }

  function removeOption(optId: string) {
    if (options.length <= 2) return;
    const nextOptions = options.filter((o) => o.id !== optId);
    if (isPoll) {
      onChange({ options: nextOptions });
    } else {
      onChange({ options: nextOptions, correct: correct.filter((c) => c !== optId) });
    }
  }

  function toggleCorrect(optId: string) {
    if (isPoll) return;
    if (isSingle) {
      onChange({ options, correct: [optId] });
    } else {
      const next = correct.includes(optId)
        ? correct.filter((c) => c !== optId)
        : [...correct, optId];
      onChange({ options, correct: next });
    }
  }

  return (
    <div>
      <label style={labelStyle}>
        {isPoll ? "Opzioni del sondaggio" : "Opzioni di risposta"}
        {!isPoll && (
          <span style={{ fontWeight: 400, color: tokens.ink3, marginLeft: 6 }}>
            {isSingle ? "(seleziona la corretta)" : "(seleziona tutte le corrette)"}
          </span>
        )}
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {options.map((o, i) => {
          const isCorrect = correct.includes(o.id);
          return (
            <div
              key={o.id}
              style={{
                ...glassSoft,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                ...(isCorrect
                  ? { outline: "2px solid rgba(47,125,84,0.5)", background: "rgba(152,226,182,0.18)" }
                  : {}),
              }}
            >
              <ShapeBadge index={i} size={36} />
              <input
                value={o.text}
                onChange={(e) => setOptionText(o.id, e.target.value)}
                placeholder={`Opzione ${i + 1}`}
                style={{ ...inputStyle, flex: 1 }}
              />
              {!isPoll && (
                <button
                  type="button"
                  onClick={() => toggleCorrect(o.id)}
                  title={isCorrect ? "Risposta corretta" : "Segna come corretta"}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    flex: "0 0 auto",
                    cursor: "pointer",
                    border: isCorrect ? "none" : "1px solid rgba(124,108,224,0.3)",
                    background: isCorrect ? "linear-gradient(135deg,#9ee0b6,#5fc98c)" : "rgba(255,255,255,0.6)",
                    color: isCorrect ? "#fff" : tokens.ink3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => removeOption(o.id)}
                disabled={options.length <= 2}
                title="Rimuovi opzione"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  flex: "0 0 auto",
                  cursor: options.length <= 2 ? "default" : "pointer",
                  border: "1px solid rgba(192,85,106,0.22)",
                  background: "rgba(192,85,106,0.08)",
                  color: "#c0556a",
                  opacity: options.length <= 2 ? 0.4 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      {options.length < 6 && (
        <button style={{ ...btnGhost, marginTop: 12 }} onClick={addOption}>
          + Aggiungi opzione
        </button>
      )}
      {!isPoll && correct.length === 0 && (
        <p style={{ fontSize: 12, color: "#a03050", marginTop: 8 }}>
          Seleziona almeno una risposta corretta.
        </p>
      )}
    </div>
  );
}

function TrueFalseEditor({ spec, onChange }: { spec: AnswerSpec; onChange: (n: AnswerSpec) => void }) {
  const value = isTrueFalse(spec) ? spec.correct : true;
  const opts: { v: boolean; label: string }[] = [
    { v: true, label: "Vero" },
    { v: false, label: "Falso" },
  ];
  return (
    <div>
      <label style={labelStyle}>Risposta corretta</label>
      <div style={{ display: "flex", gap: 10 }}>
        {opts.map((o, i) => {
          const active = value === o.v;
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => onChange({ correct: o.v })}
              style={{
                ...glassSoft,
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                cursor: "pointer",
                font: "inherit",
                fontSize: 16,
                fontWeight: 700,
                color: tokens.ink,
                ...(active
                  ? { outline: "2.5px solid rgba(47,125,84,0.6)", background: "rgba(152,226,182,0.22)" }
                  : {}),
              }}
            >
              <ShapeBadge index={i} size={34} />
              {o.label}
              {active && <span style={{ marginLeft: "auto", color: "#2f7d54" }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OpenTextEditor({ spec, onChange }: { spec: AnswerSpec; onChange: (n: AnswerSpec) => void }) {
  const accepted = isOpenText(spec) ? spec.accepted : [];
  const caseSensitive = isOpenText(spec) ? Boolean(spec.caseSensitive) : false;
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const v = draft.trim();
    if (!v) return;
    if (accepted.includes(v)) {
      setDraft("");
      return;
    }
    onChange({ accepted: [...accepted, v], caseSensitive });
    setDraft("");
  }

  function remove(v: string) {
    onChange({ accepted: accepted.filter((a) => a !== v), caseSensitive });
  }

  return (
    <div>
      <label style={labelStyle}>Risposte accettate</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          placeholder="Digita una risposta accettata e premi Invio"
          style={{ ...inputStyle, flex: 1, minWidth: 220 }}
        />
        <button type="button" style={btnGhost} onClick={commitDraft}>
          Aggiungi
        </button>
      </div>

      {accepted.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {accepted.map((a) => (
            <span
              key={a}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(168,144,235,0.18)",
                color: "#6d54b4",
                border: "1px solid rgba(168,144,235,0.35)",
                borderRadius: 999,
                padding: "5px 8px 5px 13px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {a}
              <button
                type="button"
                onClick={() => remove(a)}
                style={{
                  border: "none",
                  background: "rgba(192,85,106,0.12)",
                  color: "#c0556a",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Toggle
          checked={caseSensitive}
          onChange={(v) => onChange({ accepted, caseSensitive: v })}
          label="Distingui maiuscole/minuscole"
        />
      </div>
    </div>
  );
}

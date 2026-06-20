// Player game phase views: Lobby, Answer (per question type), Results, Podium/End.
// Answer submission is owned here; the container passes a send() + tracks the
// "have I answered this round" flag.
import React, { useEffect, useState } from "react";
import { btnPrimary, glass, glassSoft, ShapeBadge, SHAPES, tokens } from "../../ui";
import { Countdown, Leaderboard, Podium, QuestionHeader, QuestionImage } from "../../game/components";
import { useCountdown } from "../../game/useCountdown";
import { myLeaderboardRow, personalResult } from "../../game/reducer";
import type { AnswerPayload, GameSnapshot } from "../../game/types";

export function PlayLobby({ nickname }: { nickname: string }) {
  return (
    <div style={{ ...glass, padding: "40px 28px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Sei dentro!</h1>
      <p style={{ color: tokens.muted, margin: "0 0 18px", fontSize: 15 }}>
        Attendi l'avvio della partita…
      </p>
      <span
        style={{
          ...glassSoft,
          display: "inline-block",
          padding: "10px 18px",
          fontWeight: 700,
          color: tokens.brandInk,
          fontSize: 16,
        }}
      >
        {nickname}
      </span>
    </div>
  );
}

interface AnswerProps {
  snapshot: GameSnapshot;
  answered: boolean;
  onAnswer: (payload: AnswerPayload) => void;
}

export function PlayAnswer({ snapshot, answered, onAnswer }: AnswerProps) {
  const q = snapshot.question;
  const remaining = useCountdown(q?.timeLimitSec, snapshot.questionServerTime);
  if (!q) return null;

  if (answered) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <QuestionHeader question={q} right={<Countdown seconds={remaining} />} />
        <div style={{ ...glass, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>✅</div>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Risposta inviata</h2>
          <p style={{ color: tokens.muted, margin: "6px 0 0", fontSize: 14 }}>Attendi gli altri…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <QuestionHeader question={q} right={<Countdown seconds={remaining} />} />
      {q.type === "open_text" ? (
        <OpenTextInput onSubmit={(text) => onAnswer({ text })} />
      ) : q.type === "true_false" ? (
        <TrueFalseButtons onPick={(value) => onAnswer({ value })} />
      ) : q.type === "multiple_choice" ? (
        <MultiChoice options={q.options} onSubmit={(optionIds) => onAnswer({ optionIds })} />
      ) : (
        // single_choice + poll
        <SingleChoice options={q.options} onPick={(optionId) => onAnswer({ optionId })} />
      )}
    </div>
  );
}

function BigButton({
  index,
  text,
  selected,
  onClick,
}: {
  index: number;
  text: string;
  selected?: boolean;
  onClick: () => void;
}) {
  const shape = SHAPES[index % 4];
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        cursor: "pointer",
        border: selected ? `2px solid ${shape.color}` : "1px solid rgba(255,255,255,0.7)",
        borderRadius: 18,
        padding: "18px 18px",
        background: selected ? shape.bg : "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 10px 28px rgba(90,80,150,.14), inset 0 1px 0 rgba(255,255,255,.85)",
        fontSize: 17,
        fontWeight: 700,
        color: tokens.ink,
        fontFamily: "inherit",
      }}
    >
      <ShapeBadge index={index} size={40} />
      <span>{text || "—"}</span>
    </button>
  );
}

function SingleChoice({
  options,
  onPick,
}: {
  options: { id: string; text: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {options.map((o, i) => (
        <BigButton key={o.id} index={i} text={o.text} onClick={() => onPick(o.id)} />
      ))}
    </div>
  );
}

function TrueFalseButtons({ onPick }: { onPick: (v: boolean) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <BigButton index={3} text="Vero" onClick={() => onPick(true)} />
      <BigButton index={0} text="Falso" onClick={() => onPick(false)} />
    </div>
  );
}

function MultiChoice({
  options,
  onSubmit,
}: {
  options: { id: string; text: string }[];
  onSubmit: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {options.map((o, i) => (
          <BigButton key={o.id} index={i} text={o.text} selected={picked.has(o.id)} onClick={() => toggle(o.id)} />
        ))}
      </div>
      <button
        style={{ ...btnPrimary, alignSelf: "flex-end", opacity: picked.size === 0 ? 0.6 : 1 }}
        disabled={picked.size === 0}
        onClick={() => onSubmit([...picked])}
      >
        Conferma ({picked.size})
      </button>
    </div>
  );
}

function OpenTextInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text.trim());
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Scrivi la tua risposta…"
        aria-label="Risposta"
        style={{
          fontFamily: "inherit",
          fontSize: 18,
          padding: "16px 18px",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.7)",
          background: "rgba(255,255,255,0.6)",
          color: tokens.ink,
          outline: "none",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
        }}
      />
      <button type="submit" style={{ ...btnPrimary, opacity: text.trim() ? 1 : 0.6 }} disabled={!text.trim()}>
        Invia
      </button>
    </form>
  );
}

export function PlayResults({ snapshot }: { snapshot: GameSnapshot }) {
  const mine = personalResult(snapshot, snapshot.myPlayerId);
  const row = myLeaderboardRow(snapshot, snapshot.myPlayerId);
  const correct = mine?.correct === true;
  const points = mine?.points ?? 0;
  const image = snapshot.question?.image;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {image && (
        <div style={{ ...glass, padding: "14px 16px", textAlign: "center" }}>
          <QuestionImage src={image} maxHeight={160} />
        </div>
      )}
      <div
        style={{
          ...glass,
          padding: "36px 24px",
          textAlign: "center",
          background: mine
            ? correct
              ? "rgba(152,226,182,.42)"
              : "rgba(255,158,158,.30)"
            : glass.background,
        }}
      >
        {mine ? (
          <>
            <div style={{ fontSize: 44, marginBottom: 8 }}>{correct ? "🎉" : "😕"}</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: correct ? "#2f7d54" : "#c0556a" }}>
              {correct ? `Giusto! +${points} punti` : "Sbagliato"}
            </h1>
          </>
        ) : (
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: tokens.ink2 }}>Risultati</h1>
        )}
        {row && (
          <p style={{ color: tokens.ink2, margin: "14px 0 0", fontSize: 16, fontWeight: 600 }}>
            Sei {row.rank}° con {row.score} punti
          </p>
        )}
      </div>

      <div style={{ ...glass, padding: "18px 20px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Classifica</h3>
        <Leaderboard rows={snapshot.leaderboard} highlightId={snapshot.myPlayerId} limit={5} />
      </div>
    </div>
  );
}

export function PlayPodium({ snapshot }: { snapshot: GameSnapshot }) {
  const aborted = snapshot.state === "aborted";
  const row = myLeaderboardRow(snapshot, snapshot.myPlayerId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...glass, padding: "28px 22px", textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
          {aborted ? "Partita interrotta" : "🏆 Risultato finale"}
        </h1>
        {row && (
          <p style={{ color: tokens.brandInk, fontWeight: 700, fontSize: 17, margin: "0 0 18px" }}>
            Sei arrivato {row.rank}° con {row.score} punti
          </p>
        )}
        {snapshot.podium.length > 0 && <Podium podium={snapshot.podium} />}
      </div>

      <div style={{ ...glass, padding: "18px 20px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Classifica completa</h3>
        <Leaderboard rows={snapshot.leaderboard} highlightId={snapshot.myPlayerId} />
      </div>
    </div>
  );
}

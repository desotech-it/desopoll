// Host console phase views: Lobby, Active question, Results, Podium.
// Kept separate from HostConsole.tsx so each file stays small.
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  glass,
  glassSoft,
  ShapeBadge,
  tokens,
} from "../../ui";
import {
  AnsweredPill,
  Countdown,
  Distribution,
  Leaderboard,
  Podium,
  QuestionHeader,
  QuestionImage,
} from "../../game/components";
import type { GameSnapshot } from "../../game/types";
import { useCountdown } from "../../game/useCountdown";

interface PhaseProps {
  snapshot: GameSnapshot;
  pin: string;
  send: (action: "start" | "lock" | "next" | "end" | "abort") => void;
}

function joinHint(): string {
  const host = typeof location !== "undefined" ? location.host : "";
  return `${host}/join`;
}

export function HostLobby({ snapshot, pin, send }: PhaseProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...glass, padding: "28px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.brandInk, marginBottom: 6 }}>
          Partecipa su <strong>{joinHint()}</strong>
        </div>
        <div style={{ fontSize: 14, color: tokens.muted, marginBottom: 10 }}>PIN di gioco</div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            letterSpacing: 8,
            color: tokens.brandInk,
            lineHeight: 1,
          }}
        >
          {pin}
        </div>
      </div>

      <div style={{ ...glass, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            Partecipanti{" "}
            <span style={{ color: tokens.ink3, fontWeight: 400 }}>{snapshot.playerCount}</span>
          </h2>
          <button
            style={{ ...btnPrimary, opacity: snapshot.playerCount === 0 ? 0.55 : 1 }}
            disabled={snapshot.playerCount === 0}
            onClick={() => send("start")}
          >
            Avvia partita
          </button>
        </div>
        {snapshot.players.length === 0 ? (
          <p style={{ color: tokens.muted, fontSize: 14, margin: 0 }}>
            In attesa dei partecipanti…
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {snapshot.players.map((p) => (
              <span
                key={p.id}
                style={{
                  ...glassSoft,
                  padding: "8px 14px",
                  fontWeight: 600,
                  color: tokens.ink,
                  fontSize: 14,
                }}
              >
                {p.nickname}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HostActive({ snapshot, send }: PhaseProps) {
  const q = snapshot.question;
  const remaining = useCountdown(q?.timeLimitSec, snapshot.questionServerTime);
  if (!q) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <QuestionHeader question={q} right={<Countdown seconds={remaining} />} />

      {q.type === "open_text" ? (
        <div style={{ ...glassSoft, padding: "18px 20px", color: tokens.muted, fontSize: 15 }}>
          I partecipanti stanno scrivendo la risposta…
        </div>
      ) : q.type === "true_false" ? (
        // Shape indices MUST match the player side (PlayPhases TrueFalseButtons):
        // Vero -> 3 (green square), Falso -> 0 (coral triangle).
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <OptionRow index={3} text="Vero" />
          <OptionRow index={0} text="Falso" />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {q.options.map((o, i) => (
            <OptionRow key={o.id} index={i} text={o.text} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <AnsweredPill count={snapshot.answeredCount} total={snapshot.answeredTotal} />
        <button style={btnPrimary} onClick={() => send("lock")}>
          Mostra risposte
        </button>
      </div>
    </div>
  );
}

function OptionRow({ index, text }: { index: number; text: string }) {
  return (
    <div style={{ ...glass, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
      <ShapeBadge index={index} size={34} />
      <span style={{ fontWeight: 600, color: tokens.ink, fontSize: 15 }}>{text || "—"}</span>
    </div>
  );
}

export function HostResults({ snapshot, send }: PhaseProps) {
  const r = snapshot.results;
  const q = snapshot.question;
  if (!r) return null;
  const correctKeys = new Set<string>(r.correctOptionIds ?? []);
  if (typeof r.correctBoolean === "boolean") {
    // true_false distribution keys are typically "true"/"false".
    correctKeys.add(r.correctBoolean ? "true" : "false");
    correctKeys.add(String(r.correctBoolean));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...glass, padding: "20px 22px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>
          {q?.prompt || "Risultati"}
        </h2>
        {q?.image && (
          <div style={{ marginBottom: 14 }}>
            <QuestionImage src={q.image} maxHeight={180} />
          </div>
        )}
        <Distribution distribution={r.distribution} correctKeys={correctKeys} />
      </div>

      <div style={{ ...glass, padding: "20px 22px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Classifica</h3>
        <Leaderboard rows={r.leaderboard} limit={8} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={btnPrimary} onClick={() => send("next")}>
          Prossima
        </button>
      </div>
    </div>
  );
}

export function HostPodium({ snapshot, send }: PhaseProps) {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...glass, padding: "28px 22px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px", textAlign: "center" }}>
          🎉 Podio finale
        </h2>
        <Podium podium={snapshot.podium} />
      </div>

      <div style={{ ...glass, padding: "20px 22px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Classifica completa</h3>
        <Leaderboard rows={snapshot.leaderboard} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          style={btnPrimary}
          onClick={() => {
            send("end");
            navigate("/");
          }}
        >
          Termina e torna alla dashboard
        </button>
      </div>
    </div>
  );
}

export function HostEnded({ snapshot }: { snapshot: GameSnapshot }) {
  const navigate = useNavigate();
  const aborted = snapshot.state === "aborted";
  return (
    <div style={{ ...glass, padding: "32px 24px", textAlign: "center" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
        {aborted ? "Partita interrotta" : "Partita terminata"}
      </h2>
      <p style={{ color: tokens.muted, margin: "0 0 20px", fontSize: 14 }}>
        Grazie per aver giocato!
      </p>
      <div style={{ maxWidth: 420, margin: "0 auto 22px", textAlign: "left" }}>
        <Leaderboard rows={snapshot.leaderboard} />
      </div>
      <button style={btnPrimary} onClick={() => navigate("/")}>
        Torna alla dashboard
      </button>
    </div>
  );
}

export function HostAbortButton({ send }: { send: (a: "abort") => void }) {
  return (
    <button
      style={btnDanger}
      onClick={() => {
        if (window.confirm("Interrompere la partita per tutti i partecipanti?")) send("abort");
      }}
    >
      Interrompi
    </button>
  );
}

export { btnGhost };

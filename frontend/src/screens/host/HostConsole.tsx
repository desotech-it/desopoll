// Host console (/host/:sessionId). Opens the game WebSocket (cookie identifies
// the host), loads the PIN via REST, and dispatches host actions. The per-phase
// rendering lives in HostPhases.tsx to keep this file small.
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, sessions } from "../../api";
import { useGameSocket } from "../../ws";
import { BrandMark, btnGhost, ErrorBox, glass, Spinner, tokens } from "../../ui";
import { GameStage } from "../../game/components";
import {
  HostAbortButton,
  HostActive,
  HostEnded,
  HostLobby,
  HostPodium,
  HostResults,
} from "./HostPhases";

export function HostConsole() {
  const { sessionId = "" } = useParams();
  const [pin, setPin] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const { snapshot, send: rawSend, connected } = useGameSocket(sessionId || null);

  // Load the PIN (+ title) from REST; the WS only carries gameplay events.
  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    sessions
      .get(sessionId)
      .then((d) => {
        if (alive) setPin(d.session.pin);
      })
      .catch((e) => {
        if (alive) setLoadError(e instanceof ApiError ? e.message : "Sessione non trovata.");
      });
    return () => {
      alive = false;
    };
  }, [sessionId]);

  function send(action: "start" | "lock" | "next" | "end" | "abort") {
    rawSend({ type: "host", action });
  }

  if (loadError) {
    return (
      <GameStage>
        <div style={{ marginTop: 40 }}>
          <ErrorBox message={loadError} />
          <div style={{ marginTop: 16 }}>
            <Link to="/" style={btnGhost}>
              ← Torna alla dashboard
            </Link>
          </div>
        </div>
      </GameStage>
    );
  }

  const phaseProps = { snapshot, pin, send };
  const s = snapshot.state;
  const showAbort = s === "lobby" || s === "question_active" || s === "question_results" || s === "scoreboard";

  return (
    <GameStage>
      <div
        style={{
          ...glass,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 18px",
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <BrandMark size={18} />
        <span style={{ fontSize: 14, fontWeight: 600, color: tokens.ink2, marginLeft: 4 }}>
          {snapshot.title || "Partita dal vivo"}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 600,
            color: connected ? "#2f7d54" : "#c0556a",
          }}
        >
          {connected ? "● Connesso" : "○ Riconnessione…"}
        </span>
        {showAbort && <HostAbortButton send={(a) => send(a)} />}
      </div>

      {snapshot.error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorBox message={snapshot.error} />
        </div>
      )}

      {!connected && s === "lobby" && !pin ? (
        <div style={{ ...glass, padding: 8 }}>
          <Spinner label="Apertura della sessione…" />
        </div>
      ) : s === "lobby" ? (
        <HostLobby {...phaseProps} />
      ) : s === "question_active" ? (
        <HostActive {...phaseProps} />
      ) : s === "question_results" || s === "scoreboard" ? (
        <HostResults {...phaseProps} />
      ) : s === "podium" ? (
        <HostPodium {...phaseProps} />
      ) : (
        <HostEnded snapshot={snapshot} />
      )}
    </GameStage>
  );
}

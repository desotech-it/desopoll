// Host console (/host/:sessionId). Opens the game WebSocket (cookie identifies
// the host), loads the PIN via REST, and dispatches host actions. The per-phase
// rendering lives in HostPhases.tsx to keep this file small.
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, sessions } from "../../api";
import { useGameSocket } from "../../ws";
import { LanguageSelector } from "../../i18n/LanguageSelector";
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
  const { t } = useTranslation("game");
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
        if (alive) setLoadError(e instanceof ApiError ? e.message : t("host.sessionNotFound"));
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
              {t("common:actions.backToDashboard")}
            </Link>
          </div>
        </div>
      </GameStage>
    );
  }

  const phaseProps = { snapshot, pin, send, sessionId };
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
          {snapshot.title || t("host.title")}
        </span>
        <LanguageSelector />
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 600,
            color: connected ? "#2f7d54" : "#c0556a",
          }}
        >
          {connected ? t("host.connected") : t("host.reconnecting")}
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
          <Spinner label={t("host.openingSession")} />
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
        <HostEnded snapshot={snapshot} sessionId={sessionId} />
      )}
    </GameStage>
  );
}

// Player game (/play/:sessionId) — PUBLIC, no auth. Opens the WS, sends the
// join with the stored nickname, captures the returned playerId, and renders the
// current phase. Tracks whether THIS player has answered the active question.
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGameSocket } from "../../ws";
import { LanguageSelector } from "../../i18n/LanguageSelector";
import { BrandMark, btnGhost, ErrorBox, glass, Spinner, tokens } from "../../ui";
import { GameStage } from "../../game/components";
import {
  clearJoinedSession,
  loadJoinedSession,
  saveJoinedSession,
} from "../../game/session";
import type { AnswerPayload } from "../../game/types";
import { PlayAnswer, PlayLobby, PlayPodium, PlayResults } from "./PlayPhases";

export function PlayGame() {
  const { t } = useTranslation("game");
  const { sessionId = "" } = useParams();
  const stored = loadJoinedSession();
  const nickname = stored?.nickname ?? "";
  const { snapshot, send, connected } = useGameSocket(sessionId || null);
  const joinSentRef = useRef(false);
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);

  // Send the join once the socket is open (cookie not needed for players).
  useEffect(() => {
    if (connected && nickname && !joinSentRef.current) {
      joinSentRef.current = true;
      send({ type: "join", nickname });
    }
    if (!connected) joinSentRef.current = false;
  }, [connected, nickname, send]);

  // Persist the playerId once the server assigns it (for refresh-rejoin).
  useEffect(() => {
    if (snapshot.myPlayerId && stored) {
      saveJoinedSession({ ...stored, playerId: snapshot.myPlayerId });
    }
  }, [snapshot.myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset the per-round "answered" flag whenever a new question arrives.
  useEffect(() => {
    if (snapshot.state === "question_active") setAnsweredIndex(null);
  }, [snapshot.currentIndex, snapshot.state]);

  function onAnswer(payload: AnswerPayload) {
    if (!snapshot.myPlayerId) return;
    send({ type: "answer", playerId: snapshot.myPlayerId, payload });
    setAnsweredIndex(snapshot.currentIndex);
  }

  // No stored nickname → user hit /play directly. Send them to /join.
  if (!nickname) {
    return (
      <GameStage>
        <div style={{ ...glass, padding: "32px 24px", textAlign: "center", marginTop: 40 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <LanguageSelector />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 10px" }}>{t("player.needPinTitle")}</h2>
          <Link to="/join" style={btnGhost}>
            {t("player.goToJoin")}
          </Link>
        </div>
      </GameStage>
    );
  }

  const s = snapshot.state;
  const answered = answeredIndex === snapshot.currentIndex;
  const ended = s === "ended" || s === "aborted";

  return (
    <GameStage>
      <div
        style={{
          ...glass,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <BrandMark size={16} />
        <LanguageSelector />
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: tokens.brandInk }}>
          {nickname}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: connected ? "#2f7d54" : "#c0556a" }}>
          {connected ? "●" : "○"}
        </span>
        {ended && (
          <Link
            to="/join"
            style={btnGhost}
            onClick={() => clearJoinedSession()}
          >
            {t("player.leave")}
          </Link>
        )}
      </div>

      {snapshot.error && (
        <div style={{ marginBottom: 14 }}>
          <ErrorBox message={snapshot.error} />
        </div>
      )}

      {!connected && !snapshot.myPlayerId ? (
        <div style={{ ...glass, padding: 8 }}>
          <Spinner label={t("player.connecting")} />
        </div>
      ) : s === "lobby" ? (
        <PlayLobby nickname={nickname} />
      ) : s === "question_active" ? (
        <PlayAnswer snapshot={snapshot} answered={answered} onAnswer={onAnswer} />
      ) : s === "question_results" || s === "scoreboard" ? (
        <PlayResults snapshot={snapshot} />
      ) : (
        // podium / ended / aborted
        <PlayPodium snapshot={snapshot} />
      )}
    </GameStage>
  );
}

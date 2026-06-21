// Host console phase views: Lobby, Active question, Results, Podium.
// Kept separate from HostConsole.tsx so each file stays small.
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  sessionId: string;
}

function joinHint(): string {
  const host = typeof location !== "undefined" ? location.host : "";
  return `${host}/join`;
}

export function HostLobby({ snapshot, pin, send }: PhaseProps) {
  const { t } = useTranslation("game");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...glass, padding: "24px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.brandInk, marginBottom: 6 }}>
          {t("host.joinAtPrefix")} <strong>{joinHint()}</strong>
        </div>
        <div style={{ fontSize: 14, color: tokens.muted, marginBottom: 10 }}>{t("host.gamePin")}</div>
        <div
          className="poll-pin"
          style={{
            fontWeight: 800,
            color: tokens.brandInk,
            lineHeight: 1,
            overflowWrap: "anywhere",
          }}
        >
          {pin}
        </div>
      </div>

      <div style={{ ...glass, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            {t("host.participants")}{" "}
            <span style={{ color: tokens.ink3, fontWeight: 400 }}>{snapshot.playerCount}</span>
          </h2>
          <button
            style={{ ...btnPrimary, opacity: snapshot.playerCount === 0 ? 0.55 : 1 }}
            disabled={snapshot.playerCount === 0}
            onClick={() => send("start")}
          >
            {t("host.startGame")}
          </button>
        </div>
        {snapshot.players.length === 0 ? (
          <p style={{ color: tokens.muted, fontSize: 14, margin: 0 }}>
            {t("host.waitingForPlayers")}
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
  const { t } = useTranslation("game");
  const q = snapshot.question;
  const remaining = useCountdown(q?.timeLimitSec, snapshot.questionServerTime);
  if (!q) return null;
  const sliderRange =
    Number.isFinite(q.min) && Number.isFinite(q.max) ? ` (${q.min}–${q.max})` : "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <QuestionHeader question={q} right={<Countdown seconds={remaining} />} />

      {q.type === "open_text" || q.type === "word_cloud" ? (
        <HostWaitNote>
          {q.type === "word_cloud" ? t("host.waitWord") : t("host.waitText")}
        </HostWaitNote>
      ) : q.type === "numeric" ? (
        <HostWaitNote>{t("host.waitNumeric")}</HostWaitNote>
      ) : q.type === "slider" ? (
        <HostWaitNote>{t("host.waitSlider", { range: sliderRange })}</HostWaitNote>
      ) : q.type === "ordering" ? (
        q.options.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((o, i) => (
              <OptionRow key={o.id} index={i} text={o.text} />
            ))}
          </div>
        ) : (
          <HostWaitNote>{t("host.waitOrdering")}</HostWaitNote>
        )
      ) : q.type === "true_false" ? (
        // Shape indices MUST match the player side (PlayPhases TrueFalseButtons):
        // Vero -> 3 (green square), Falso -> 0 (coral triangle).
        <div className="poll-answer-grid">
          <OptionRow index={3} text={t("common.trueLabel")} />
          <OptionRow index={0} text={t("common.falseLabel")} />
        </div>
      ) : (
        <div className="poll-answer-grid">
          {q.options.map((o, i) => (
            <OptionRow key={o.id} index={i} text={o.text} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <AnsweredPill count={snapshot.answeredCount} total={snapshot.answeredTotal} />
        <button style={btnPrimary} onClick={() => send("lock")}>
          {t("host.showAnswers")}
        </button>
      </div>
    </div>
  );
}

function OptionRow({ index, text }: { index: number; text: string }) {
  return (
    <div style={{ ...glass, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
      <ShapeBadge index={index} size={34} />
      <span style={{ fontWeight: 600, color: tokens.ink, fontSize: 15, minWidth: 0, overflowWrap: "anywhere" }}>
        {text || "—"}
      </span>
    </div>
  );
}

// Note shown on the host active screen for free-input types (no fixed options).
function HostWaitNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...glassSoft, padding: "18px 20px", color: tokens.muted, fontSize: 15 }}>
      {children}
    </div>
  );
}

export function HostResults({ snapshot, send }: PhaseProps) {
  const { t } = useTranslation("game");
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
          {q?.prompt || t("host.results")}
        </h2>
        {q?.image && (
          <div style={{ marginBottom: 14 }}>
            <QuestionImage src={q.image} maxHeight={180} />
          </div>
        )}
        <Distribution distribution={r.distribution} correctKeys={correctKeys} />
      </div>

      <div style={{ ...glass, padding: "20px 22px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>{t("host.leaderboard")}</h3>
        <Leaderboard rows={r.leaderboard} limit={8} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={btnPrimary} onClick={() => send("next")}>
          {t("host.next")}
        </button>
      </div>
    </div>
  );
}

export function HostPodium({ snapshot, send, sessionId }: PhaseProps) {
  const { t } = useTranslation("game");
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...glass, padding: "28px 22px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px", textAlign: "center" }}>
          {t("host.finalPodium")}
        </h2>
        <Podium podium={snapshot.podium} />
      </div>

      <div style={{ ...glass, padding: "20px 22px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>{t("host.fullLeaderboard")}</h3>
        <Leaderboard rows={snapshot.leaderboard} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <Link to={`/report/${sessionId}`} style={btnGhost} onClick={() => send("end")}>
          {t("host.viewFullResults")}
        </Link>
        <button
          style={btnPrimary}
          onClick={() => {
            send("end");
            navigate("/");
          }}
        >
          {t("host.endAndReturn")}
        </button>
      </div>
    </div>
  );
}

export function HostEnded({ snapshot, sessionId }: { snapshot: GameSnapshot; sessionId: string }) {
  const { t } = useTranslation("game");
  const navigate = useNavigate();
  const aborted = snapshot.state === "aborted";
  return (
    <div style={{ ...glass, padding: "32px 24px", textAlign: "center" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
        {aborted ? t("host.gameAborted") : t("host.gameEnded")}
      </h2>
      <p style={{ color: tokens.muted, margin: "0 0 20px", fontSize: 14 }}>
        {t("host.thanksForPlaying")}
      </p>
      <div style={{ maxWidth: 420, margin: "0 auto 22px", textAlign: "left" }}>
        <Leaderboard rows={snapshot.leaderboard} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {!aborted && (
          <Link to={`/report/${sessionId}`} style={btnGhost}>
            {t("host.viewFullResults")}
          </Link>
        )}
        <button style={btnPrimary} onClick={() => navigate("/")}>
          {t("host.returnToDashboard")}
        </button>
      </div>
    </div>
  );
}

export function HostAbortButton({ send }: { send: (a: "abort") => void }) {
  const { t } = useTranslation("game");
  return (
    <button
      style={btnDanger}
      onClick={() => {
        if (window.confirm(t("host.confirmAbort"))) send("abort");
      }}
    >
      {t("host.abort")}
    </button>
  );
}

export { btnGhost };

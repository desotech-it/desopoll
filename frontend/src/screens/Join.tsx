// Player join (/join) — PUBLIC, no auth. Player enters a 6-digit PIN, we resolve
// it via GET /api/sessions/by-pin/:pin, then ask for a nickname and navigate to
// the game. Persists {sessionId, playerId?, nickname} in sessionStorage; the
// actual WS join happens on the player game screen.
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, sessions } from "../api";
import { LanguageSelector } from "../i18n/LanguageSelector";
import {
  BrandMark,
  btnGhost,
  btnPrimary,
  ErrorBox,
  glass,
  inputStyle,
  labelStyle,
  pageStyle,
  tokens,
} from "../ui";
import { saveJoinedSession } from "../game/session";

// Exported for unit testing: a valid PIN is exactly 6 digits.
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin.trim());
}

export function Join() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [step, setStep] = useState<"pin" | "nickname">("pin");
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidPin(pin)) {
      setError(t("join.errorInvalidPin"));
      return;
    }
    setBusy(true);
    try {
      const info = await sessions.byPin(pin.trim());
      if (!info.joinable) {
        setError(t("join.errorNotJoinable"));
        return;
      }
      setSessionId(info.sessionId);
      setStep("nickname");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(t("join.errorNotFound"));
      } else {
        setError(err instanceof Error ? err.message : t("join.errorConnection"));
      }
    } finally {
      setBusy(false);
    }
  }

  function submitNickname(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const nn = nickname.trim();
    if (!nn) {
      setError(t("join.errorNickname"));
      return;
    }
    if (!sessionId) return;
    // The WS join (and playerId) is handled by the game screen; persist now.
    saveJoinedSession({ sessionId, playerId: "", nickname: nn });
    navigate(`/play/${sessionId}`);
  }

  return (
    <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...glass, padding: "36px 32px", maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <LanguageSelector />
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <BrandMark size={26} />
        </div>
        <p style={{ color: tokens.muted, margin: "0 0 26px", textAlign: "center", fontSize: 14 }}>
          {t("join.subtitle")}
        </p>

        {error && (
          <div style={{ marginBottom: 14 }}>
            <ErrorBox message={error} />
          </div>
        )}

        {step === "pin" ? (
          <form onSubmit={submitPin}>
            <label style={labelStyle} htmlFor="join-pin">
              {t("join.pinLabel")}
            </label>
            <input
              id="join-pin"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{ ...inputStyle, fontSize: 28, fontWeight: 800, letterSpacing: 10, textAlign: "center" }}
              placeholder={t("join.pinPlaceholder")}
              aria-label={t("join.pinLabel")}
            />
            <button
              type="submit"
              disabled={busy || !isValidPin(pin)}
              style={{
                ...btnPrimary,
                width: "100%",
                padding: "13px",
                boxSizing: "border-box",
                marginTop: 16,
                opacity: busy || !isValidPin(pin) ? 0.6 : 1,
              }}
            >
              {busy ? t("join.verifying") : t("join.enter")}
            </button>
          </form>
        ) : (
          <form onSubmit={submitNickname}>
            <label style={labelStyle} htmlFor="join-nick">
              {t("join.nicknameLabel")}
            </label>
            <input
              id="join-nick"
              autoFocus
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{ ...inputStyle, fontSize: 16 }}
              placeholder={t("join.nicknamePlaceholder")}
              aria-label={t("join.nicknameAria")}
            />
            <button
              type="submit"
              disabled={!nickname.trim()}
              style={{
                ...btnPrimary,
                width: "100%",
                padding: "13px",
                boxSizing: "border-box",
                marginTop: 16,
                opacity: !nickname.trim() ? 0.6 : 1,
              }}
            >
              {t("join.join")}
            </button>
            <button
              type="button"
              style={{ ...btnGhost, width: "100%", marginTop: 10, boxSizing: "border-box" }}
              onClick={() => {
                setStep("pin");
                setError(null);
              }}
            >
              {t("join.changePin")}
            </button>
          </form>
        )}

        <p style={{ fontSize: 12, color: tokens.hint, marginTop: 22, textAlign: "center" }}>
          <Link to="/" style={{ color: tokens.brandInk, textDecoration: "none", fontWeight: 600 }}>
            {t("join.organizerLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}

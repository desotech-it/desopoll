// Player join (/join) — PUBLIC, no auth. Player enters a 6-digit PIN, we resolve
// it via GET /api/sessions/by-pin/:pin, then ask for a nickname and navigate to
// the game. Persists {sessionId, playerId?, nickname} in sessionStorage; the
// actual WS join happens on the player game screen.
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, sessions } from "../api";
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
      setError("Inserisci un PIN di 6 cifre.");
      return;
    }
    setBusy(true);
    try {
      const info = await sessions.byPin(pin.trim());
      if (!info.joinable) {
        setError("Questa partita non è più aperta alle iscrizioni.");
        return;
      }
      setSessionId(info.sessionId);
      setStep("nickname");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Nessuna partita trovata con questo PIN.");
      } else {
        setError(err instanceof Error ? err.message : "Errore di connessione.");
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
      setError("Scegli un nickname.");
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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <BrandMark size={26} />
        </div>
        <p style={{ color: tokens.muted, margin: "0 0 26px", textAlign: "center", fontSize: 14 }}>
          Partecipa a una partita dal vivo
        </p>

        {error && (
          <div style={{ marginBottom: 14 }}>
            <ErrorBox message={error} />
          </div>
        )}

        {step === "pin" ? (
          <form onSubmit={submitPin}>
            <label style={labelStyle} htmlFor="join-pin">
              PIN di gioco
            </label>
            <input
              id="join-pin"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{ ...inputStyle, fontSize: 28, fontWeight: 800, letterSpacing: 10, textAlign: "center" }}
              placeholder="123456"
              aria-label="PIN di gioco"
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
              {busy ? "Verifica…" : "Entra"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitNickname}>
            <label style={labelStyle} htmlFor="join-nick">
              Il tuo nickname
            </label>
            <input
              id="join-nick"
              autoFocus
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{ ...inputStyle, fontSize: 16 }}
              placeholder="Es. Giulia"
              aria-label="Nickname"
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
              Partecipa
            </button>
            <button
              type="button"
              style={{ ...btnGhost, width: "100%", marginTop: 10, boxSizing: "border-box" }}
              onClick={() => {
                setStep("pin");
                setError(null);
              }}
            >
              ← Cambia PIN
            </button>
          </form>
        )}

        <p style={{ fontSize: 12, color: tokens.hint, marginTop: 22, textAlign: "center" }}>
          <Link to="/" style={{ color: tokens.brandInk, textDecoration: "none", fontWeight: 600 }}>
            Sei un organizzatore? Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}

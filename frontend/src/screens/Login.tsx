// Landing / login card. Shown when GET /api/auth/me returns 401.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, auth } from "../api";
import { useAuth } from "../auth";
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

export function Login() {
  const { t } = useTranslation(["auth", "common"]);
  const { setUser } = useAuth();
  const [oidc, setOidc] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    auth
      .config()
      .then((c) => setOidc(Boolean(c.oidc)))
      .catch(() => setOidc(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await auth.loginLocal(email.trim(), password);
      setUser(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("login.errorBadCredentials"));
      } else {
        setError(err instanceof Error ? err.message : t("login.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        ...pageStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ ...glass, padding: "36px 32px", maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <LanguageSelector />
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <BrandMark size={26} />
        </div>
        <p style={{ color: tokens.muted, margin: "0 0 26px", textAlign: "center", fontSize: 14 }}>
          {t("common:brandTagline")}
        </p>

        {oidc && (
          <>
            <a
              href="/api/auth/login"
              style={{ ...btnPrimary, width: "100%", padding: "13px", boxSizing: "border-box" }}
            >
              {t("login.sso")}
            </a>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                margin: "20px 0",
                color: tokens.hint,
                fontSize: 12,
              }}
            >
              <span style={{ flex: 1, height: 1, background: "rgba(124,108,224,0.18)" }} />
              {t("login.or")}
              <span style={{ flex: 1, height: 1, background: "rgba(124,108,224,0.18)" }} />
            </div>
          </>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle} htmlFor="login-email">
              {t("login.emailLabel")}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder={t("login.emailPlaceholder")}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="login-password">
              {t("login.passwordLabel")}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ marginBottom: 14 }}>
              <ErrorBox message={error} />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...btnPrimary,
              width: "100%",
              padding: "13px",
              boxSizing: "border-box",
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? "default" : "pointer",
            }}
          >
            {submitting ? t("login.submitting") : t("login.submit")}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "22px 0 16px",
            color: tokens.hint,
            fontSize: 12,
          }}
        >
          <span style={{ flex: 1, height: 1, background: "rgba(124,108,224,0.18)" }} />
          {t("login.participants")}
          <span style={{ flex: 1, height: 1, background: "rgba(124,108,224,0.18)" }} />
        </div>
        <Link
          to="/join"
          style={{ ...btnGhost, width: "100%", padding: "13px", boxSizing: "border-box", fontSize: 14 }}
        >
          {t("login.joinWithPin")}
        </Link>

        <p style={{ fontSize: 12, color: tokens.hint, marginTop: 22, textAlign: "center" }}>
          {t("login.restricted")}
        </p>
      </div>
    </div>
  );
}

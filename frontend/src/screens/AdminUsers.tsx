// Admin → Users (/admin/users) — table of users with create + inline role/status edit.
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { admin, ApiError, type AdminUser, type Role, type Status } from "../api";
import {
  btnGhost,
  btnPrimary,
  Chip,
  ErrorBox,
  glass,
  glassSoft,
  inputStyle,
  labelStyle,
  Spinner,
  tokens,
} from "../ui";

// Known role/status values (used to detect custom/legacy values from the server
// so they still render in the select). Labels come from the translations below.
const ROLE_VALUES: Role[] = ["user", "admin"];
const STATUS_VALUES: Status[] = ["active", "suspended", "invited"];

// Localized role/status option lists, built from the active translations.
type TFn = (key: string) => string;
function roleOptions(t: TFn): { value: Role; label: string }[] {
  return [
    { value: "user", label: t("users.roleUser") },
    { value: "admin", label: t("users.roleAdmin") },
  ];
}
function statusOptions(t: TFn): { value: Status; label: string }[] {
  return [
    { value: "active", label: t("users.statusActive") },
    { value: "suspended", label: t("users.statusSuspended") },
    { value: "invited", label: t("users.statusInvited") },
  ];
}
function roleLabel(t: TFn, r: Role) {
  return roleOptions(t).find((o) => o.value === r)?.label ?? r;
}
function statusLabel(t: TFn, s: Status) {
  return statusOptions(t).find((o) => o.value === s)?.label ?? s;
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "6px 8px",
  fontSize: 13,
  cursor: "pointer",
  width: "auto",
  minWidth: 96,
};

export function AdminUsers() {
  const { t } = useTranslation("admin");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setForbidden(false);
    try {
      const { users } = await admin.listUsers();
      setUsers(users);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setForbidden(true);
        setUsers([]);
      } else {
        setError(e instanceof Error ? e.message : t("users.errorLoad"));
        setUsers([]);
      }
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateUser(id: string, body: { role?: Role; status?: Status }) {
    // optimistic
    setUsers((prev) => (prev ? prev.map((u) => (u.id === id ? { ...u, ...body } : u)) : prev));
    try {
      const { user } = await admin.updateUser(id, body);
      setUsers((prev) => (prev ? prev.map((u) => (u.id === id ? { ...u, ...user } : u)) : prev));
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : t("users.errorUpdate"));
      void load(); // revert to server truth
    }
  }

  function onCreated(u: AdminUser) {
    setUsers((prev) => (prev ? [u, ...prev] : [u]));
    setShowForm(false);
  }

  if (forbidden) {
    return (
      <div style={{ ...glass, padding: "40px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
        <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>{t("forbiddenTitle")}</h2>
        <p style={{ color: tokens.muted, margin: 0, fontSize: 14 }}>
          {t("users.forbiddenBody")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>{t("users.title")}</h1>
          <p style={{ color: tokens.muted, margin: 0, fontSize: 14 }}>
            {users ? t("users.count", { count: users.length }) : t("users.fallback")}
          </p>
        </div>
        {!showForm && (
          <button style={btnPrimary} onClick={() => setShowForm(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t("users.newUser")}
          </button>
        )}
      </div>

      {showForm && <CreateUserForm onCreated={onCreated} onCancel={() => setShowForm(false)} />}

      {error && (
        <div style={{ marginBottom: 18 }}>
          <ErrorBox message={error} onRetry={load} />
        </div>
      )}

      {users === null ? (
        <div style={{ ...glass, padding: 8 }}>
          <Spinner label={t("users.loading")} />
        </div>
      ) : users.length === 0 && !error ? (
        <div style={{ ...glassSoft, borderRadius: 22, padding: "40px 24px", textAlign: "center", color: tokens.muted }}>
          {t("users.empty")}
        </div>
      ) : (
        <div style={{ ...glass, padding: "8px 10px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: "left", color: tokens.ink3 }}>
                <th style={thStyle}>{t("users.colEmail")}</th>
                <th style={thStyle}>{t("users.colName")}</th>
                <th style={thStyle}>{t("users.colRole")}</th>
                <th style={thStyle}>{t("users.colStatus")}</th>
                <th style={thStyle}>{t("users.colPassword")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid rgba(124,108,224,0.12)" }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: tokens.ink }}>{u.email}</span>
                  </td>
                  <td style={tdStyle}>{u.display_name || <span style={{ color: tokens.hint }}>—</span>}</td>
                  <td style={tdStyle}>
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                      style={selectStyle}
                      aria-label={t("users.roleAria", { email: u.email })}
                    >
                      {roleOptions(t).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {!ROLE_VALUES.includes(u.role) && (
                        <option value={u.role}>{roleLabel(t, u.role)}</option>
                      )}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={u.status}
                      onChange={(e) => updateUser(u.id, { status: e.target.value as Status })}
                      style={selectStyle}
                      aria-label={t("users.statusAria", { email: u.email })}
                    >
                      {statusOptions(t).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {!STATUS_VALUES.includes(u.status) && (
                        <option value={u.status}>{statusLabel(t, u.status)}</option>
                      )}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    {u.has_password ? <Chip tone="green">{t("users.passwordSet")}</Chip> : <Chip tone="amber">{t("users.passwordMissing")}</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const tdStyle: React.CSSProperties = { padding: "12px", verticalAlign: "middle" };

function CreateUserForm({
  onCreated,
  onCancel,
}: {
  onCreated: (u: AdminUser) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("admin");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { user } = await admin.createUser({
        email: email.trim(),
        display_name: displayName.trim() || undefined,
        role,
        password: password || undefined,
      });
      onCreated(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t("users.errorDuplicate"));
      } else {
        setError(err instanceof Error ? err.message : t("users.errorCreate"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ ...glass, padding: "22px 24px", marginBottom: 22 }}>
      <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>{t("users.formTitle")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="nu-email">
            {t("users.emailLabel")}
          </label>
          <input
            id="nu-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder={t("users.emailPlaceholder")}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="nu-name">
            {t("users.nameLabel")}
          </label>
          <input
            id="nu-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
            placeholder={t("users.namePlaceholder")}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="nu-role">
            {t("users.roleLabel")}
          </label>
          <select id="nu-role" value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ ...inputStyle, cursor: "pointer" }}>
            {roleOptions(t).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="nu-pass">
            {t("users.passwordLabel")}
          </label>
          <input
            id="nu-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder={t("users.passwordPlaceholder")}
            autoComplete="new-password"
          />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16 }}>
          <ErrorBox message={error} />
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="submit" disabled={busy || !email.trim()} style={{ ...btnPrimary, opacity: busy || !email.trim() ? 0.6 : 1 }}>
          {busy ? t("users.creating") : t("users.createUser")}
        </button>
        <button type="button" style={btnGhost} onClick={onCancel}>
          {t("common:actions.cancel")}
        </button>
      </div>
    </form>
  );
}

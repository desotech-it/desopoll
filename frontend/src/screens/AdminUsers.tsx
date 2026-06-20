// Admin → Users (/admin/users) — table of users with create + inline role/status edit.
import React, { useCallback, useEffect, useState } from "react";
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

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "user", label: "Utente" },
  { value: "admin", label: "Admin" },
];
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "active", label: "Attivo" },
  { value: "suspended", label: "Sospeso" },
  { value: "invited", label: "Invitato" },
];

function roleLabel(r: Role) {
  return ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r;
}
function statusLabel(s: Status) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
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
        setError(e instanceof Error ? e.message : "Errore nel caricamento degli utenti.");
        setUsers([]);
      }
    }
  }, []);

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
      window.alert(e instanceof ApiError ? e.message : "Aggiornamento non riuscito.");
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
        <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>Accesso negato</h2>
        <p style={{ color: tokens.muted, margin: 0, fontSize: 14 }}>
          Solo gli amministratori possono gestire gli utenti.
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
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Utenti</h1>
          <p style={{ color: tokens.muted, margin: 0, fontSize: 14 }}>
            {users ? `${users.length} utenti registrati` : "Gestione utenti"}
          </p>
        </div>
        {!showForm && (
          <button style={btnPrimary} onClick={() => setShowForm(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuovo utente
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
          <Spinner label="Caricamento degli utenti…" />
        </div>
      ) : users.length === 0 && !error ? (
        <div style={{ ...glassSoft, borderRadius: 22, padding: "40px 24px", textAlign: "center", color: tokens.muted }}>
          Nessun utente.
        </div>
      ) : (
        <div style={{ ...glass, padding: "8px 10px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: "left", color: tokens.ink3 }}>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Ruolo</th>
                <th style={thStyle}>Stato</th>
                <th style={thStyle}>Password</th>
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
                      aria-label={`Ruolo di ${u.email}`}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {!ROLE_OPTIONS.some((o) => o.value === u.role) && (
                        <option value={u.role}>{roleLabel(u.role)}</option>
                      )}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={u.status}
                      onChange={(e) => updateUser(u.id, { status: e.target.value as Status })}
                      style={selectStyle}
                      aria-label={`Stato di ${u.email}`}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                      {!STATUS_OPTIONS.some((o) => o.value === u.status) && (
                        <option value={u.status}>{statusLabel(u.status)}</option>
                      )}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    {u.has_password ? <Chip tone="green">Impostata</Chip> : <Chip tone="amber">Assente</Chip>}
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
        setError("Esiste già un utente con questa email.");
      } else {
        setError(err instanceof Error ? err.message : "Creazione non riuscita.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ ...glass, padding: "22px 24px", marginBottom: 22 }}>
      <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Nuovo utente</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="nu-email">
            Email *
          </label>
          <input
            id="nu-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="nome@azienda.it"
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="nu-name">
            Nome visualizzato
          </label>
          <input
            id="nu-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
            placeholder="Mario Rossi"
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="nu-role">
            Ruolo
          </label>
          <select id="nu-role" value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ ...inputStyle, cursor: "pointer" }}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="nu-pass">
            Password iniziale
          </label>
          <input
            id="nu-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="Opzionale"
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
          {busy ? "Creazione…" : "Crea utente"}
        </button>
        <button type="button" style={btnGhost} onClick={onCancel}>
          Annulla
        </button>
      </div>
    </form>
  );
}

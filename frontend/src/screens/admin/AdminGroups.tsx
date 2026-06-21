// Admin → Groups (/admin/groups) — list/create/delete groups and manage members
// via the user typeahead (issue #4). Admin-only; mirrors AdminUsers styling.
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { admin, ApiError, type Group } from "../../api";
import {
  btnDanger,
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
} from "../../ui";
import { GroupMembers } from "./GroupMembers";

export function AdminGroups() {
  const { t } = useTranslation("admin");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState<Group | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setForbidden(false);
    try {
      const { groups } = await admin.groups.list();
      setGroups(groups);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setForbidden(true);
        setGroups([]);
      } else {
        setError(e instanceof Error ? e.message : t("groups.errorLoad"));
        setGroups([]);
      }
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeGroup(g: Group) {
    if (!window.confirm(t("groups.confirmDelete", { name: g.name }))) return;
    setGroups((prev) => (prev ? prev.filter((x) => x.id !== g.id) : prev));
    try {
      await admin.groups.remove(g.id);
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : t("groups.errorDelete"));
      void load();
    }
  }

  function onCreated(g: Group) {
    setGroups((prev) => (prev ? [g, ...prev] : [g]));
    setShowForm(false);
  }

  function onMemberCountChange(groupId: string, delta: number) {
    setGroups((prev) =>
      prev ? prev.map((g) => (g.id === groupId ? { ...g, member_count: Math.max(0, g.member_count + delta) } : g)) : prev,
    );
  }

  if (forbidden) {
    return (
      <div style={{ ...glass, padding: "40px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
        <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>{t("forbiddenTitle")}</h2>
        <p style={{ color: tokens.muted, margin: 0, fontSize: 14 }}>
          {t("groups.forbiddenBody")}
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
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>{t("groups.title")}</h1>
          <p style={{ color: tokens.muted, margin: 0, fontSize: 14 }}>
            {groups ? t("groups.count", { count: groups.length }) : t("groups.fallback")}
          </p>
        </div>
        {!showForm && (
          <button style={btnPrimary} onClick={() => setShowForm(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t("groups.newGroup")}
          </button>
        )}
      </div>

      {showForm && <CreateGroupForm onCreated={onCreated} onCancel={() => setShowForm(false)} />}

      {error && (
        <div style={{ marginBottom: 18 }}>
          <ErrorBox message={error} onRetry={load} />
        </div>
      )}

      {groups === null ? (
        <div style={{ ...glass, padding: 8 }}>
          <Spinner label={t("groups.loading")} />
        </div>
      ) : groups.length === 0 && !error ? (
        <div style={{ ...glassSoft, borderRadius: 22, padding: "40px 24px", textAlign: "center", color: tokens.muted }}>
          {t("groups.empty")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 18 }}>
          {groups.map((g) => (
            <div key={g.id} style={{ ...glass, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 5,
                      background: g.color || "rgba(124,108,224,0.5)",
                      flex: "0 0 auto",
                    }}
                  />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tokens.ink }}>{g.name}</h3>
                </div>
                <Chip tone="violet">{t("groups.members", { count: g.member_count })}</Chip>
              </div>
              <p style={{ fontSize: 13, color: tokens.ink3, margin: 0, minHeight: 18 }}>
                {g.description || t("groups.noDescription")}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button style={btnGhost} onClick={() => setOpen(g)}>
                  {t("groups.manageMembers")}
                </button>
                <button style={{ ...btnDanger, marginLeft: "auto" }} onClick={() => removeGroup(g)}>
                  {t("groups.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <GroupMembers
          group={open}
          onClose={() => setOpen(null)}
          onCountChange={(delta) => onMemberCountChange(open.id, delta)}
        />
      )}
    </div>
  );
}

function CreateGroupForm({ onCreated, onCancel }: { onCreated: (g: Group) => void; onCancel: () => void }) {
  const { t } = useTranslation("admin");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#8d83e4");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { group } = await admin.groups.create({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      onCreated(group);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("groups.errorCreate"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ ...glass, padding: "22px 24px", marginBottom: 22 }}>
      <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>{t("groups.formTitle")}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        <div>
          <label style={labelStyle} htmlFor="ng-name">
            {t("groups.nameLabel")}
          </label>
          <input
            id="ng-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder={t("groups.namePlaceholder")}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ng-desc">
            {t("groups.descriptionLabel")}
          </label>
          <input
            id="ng-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={inputStyle}
            placeholder={t("groups.descriptionPlaceholder")}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ng-color">
            {t("groups.colorLabel")}
          </label>
          <input
            id="ng-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ ...inputStyle, padding: 4, height: 42, cursor: "pointer" }}
          />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16 }}>
          <ErrorBox message={error} />
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="submit" disabled={busy || !name.trim()} style={{ ...btnPrimary, opacity: busy || !name.trim() ? 0.6 : 1 }}>
          {busy ? t("groups.creating") : t("groups.createGroup")}
        </button>
        <button type="button" style={btnGhost} onClick={onCancel}>
          {t("common:actions.cancel")}
        </button>
      </div>
    </form>
  );
}

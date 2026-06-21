// Modal to manage a group's members (issue #4): lists members, adds via the user
// typeahead, removes them. onCountChange keeps the parent's member_count badge in
// sync (+1 on add, -1 on remove).
import React, { useCallback, useEffect, useState } from "react";
import { admin, ApiError, type Group, type GroupMember, type UserSearchResult } from "../../api";
import { btnDanger, btnGhost, ErrorBox, glass, Spinner, tokens } from "../../ui";
import { UserSearch } from "../share/UserSearch";

export function GroupMembers({
  group,
  onClose,
  onCountChange,
}: {
  group: Group;
  onClose: () => void;
  onCountChange: (delta: number) => void;
}) {
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { members } = await admin.groups.members(group.id);
      setMembers(members);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento dei membri.");
      setMembers([]);
    }
  }, [group.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addMember(u: UserSearchResult) {
    if (members?.some((m) => m.id === u.id)) return; // already a member
    setBusy(true);
    setError(null);
    try {
      const { member } = await admin.groups.addMember(group.id, { userId: u.id });
      setMembers((prev) => [...(prev ?? []), member]);
      onCountChange(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aggiunta non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(m: GroupMember) {
    setMembers((prev) => (prev ? prev.filter((x) => x.id !== m.id) : prev));
    onCountChange(-1);
    try {
      await admin.groups.removeMember(group.id, m.id);
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Rimozione non riuscita.");
      onCountChange(1);
      void load();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Membri di ${group.name}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(43,42,60,0.32)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "6vh 16px 24px",
        overflowY: "auto",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...glass, width: "100%", maxWidth: 520, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 700 }}>Membri del gruppo</h2>
            <p style={{ margin: 0, fontSize: 13, color: tokens.ink3 }}>{group.name}</p>
          </div>
          <button style={btnGhost} onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <div style={{ margin: "18px 0 6px" }}>
          <UserSearch onPick={addMember} label="Aggiungi un membro" autoFocus />
        </div>

        {error && (
          <div style={{ marginTop: 12 }}>
            <ErrorBox message={error} />
          </div>
        )}

        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "20px 0 10px", color: tokens.ink2 }}>
          Membri attuali
        </h3>
        {members === null ? (
          <Spinner label="Caricamento…" />
        ) : members.length === 0 ? (
          <p style={{ fontSize: 13, color: tokens.hint, margin: 0 }}>Questo gruppo non ha ancora membri.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((m) => (
              <li
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.4)",
                  border: "1px solid rgba(255,255,255,0.6)",
                }}
              >
                <span style={{ flex: "0 0 auto", fontSize: 16 }}>👤</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: tokens.ink }}>
                    {m.display_name || m.email}
                  </div>
                  {m.display_name && <div style={{ fontSize: 12, color: tokens.ink3 }}>{m.email}</div>}
                </div>
                <button
                  style={{ ...btnDanger, padding: "5px 10px", opacity: busy ? 0.7 : 1 }}
                  onClick={() => removeMember(m)}
                  aria-label={`Rimuovi ${m.display_name || m.email}`}
                >
                  Rimuovi
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

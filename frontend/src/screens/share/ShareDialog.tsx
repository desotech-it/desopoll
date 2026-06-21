// "Condividi" dialog (issue #4): a modal to manage a quiz's shares. Lets the
// owner/manager find users (typeahead) or pick a group, choose a permission
// level, and add/remove shares. Only mounted when the caller can manage.
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ApiError,
  admin,
  shares as sharesApi,
  type Group,
  type Share,
  type SubjectType,
  type UserSearchResult,
} from "../../api";
import { type Permission, permissionDescription, PERMISSION_TONES, permissionLabel } from "../../permissions";
import { btnDanger, btnGhost, btnPrimary, Chip, ErrorBox, glass, Spinner, tokens } from "../../ui";
import { UserSearch } from "./UserSearch";
import { PermissionSelect } from "./PermissionSelect";

export function ShareDialog({
  quizId,
  quizTitle,
  isAdmin,
  onClose,
}: {
  quizId: string;
  quizTitle: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("share");
  const [list, setList] = useState<Share[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<SubjectType>("user");
  const [permission, setPermission] = useState<Permission>("view");
  const [pendingUser, setPendingUser] = useState<UserSearchResult | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { shares } = await sharesApi.list(quizId);
      setList(shares);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorLoad"));
      setList([]);
    }
  }, [quizId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Groups are only loadable by admins; lazy-load them when the tab is opened.
  useEffect(() => {
    if (tab !== "group" || groups !== null || !isAdmin) return;
    let cancelled = false;
    void (async () => {
      try {
        const { groups: gs } = await admin.groups.list();
        if (!cancelled) setGroups(gs);
      } catch {
        if (!cancelled) setGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, groups, isAdmin]);

  // Close on Escape for accessibility.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addShare(subjectType: SubjectType, subjectId: string) {
    setBusy(true);
    setError(null);
    try {
      const { share } = await sharesApi.add(quizId, { subjectType, subjectId, permission });
      setList((prev) => {
        const others = (prev ?? []).filter(
          (s) => !(s.subject_type === share.subject_type && s.subject_id === share.subject_id),
        );
        return [...others, share];
      });
      setPendingUser(null);
      setSelectedGroup("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        setError(t("errorOwner"));
      } else {
        setError(e instanceof Error ? e.message : t("errorShare"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeShare(s: Share) {
    setList((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
    try {
      await sharesApi.remove(quizId, s.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorRemove"));
      void load();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("ariaLabel", { title: quizTitle })}
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...glass, width: "100%", maxWidth: 540, padding: 24 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 700 }}>{t("title")}</h2>
            <p style={{ margin: 0, fontSize: 13, color: tokens.ink3 }}>{quizTitle}</p>
          </div>
          <button style={btnGhost} onClick={onClose} aria-label={t("common:actions.close")}>
            ✕
          </button>
        </div>

        {/* Subject tabs */}
        <div style={{ display: "flex", gap: 8, margin: "18px 0 12px" }}>
          <TabBtn active={tab === "user"} onClick={() => setTab("user")}>
            {t("tabUsers")}
          </TabBtn>
          {isAdmin && (
            <TabBtn active={tab === "group"} onClick={() => setTab("group")}>
              {t("tabGroups")}
            </TabBtn>
          )}
        </div>

        {/* Add controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tab === "user" ? (
            pendingUser ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: tokens.ink, flex: 1, minWidth: 140 }}>
                  {pendingUser.display_name || pendingUser.email}
                </span>
                <PermissionSelect value={permission} onChange={setPermission} ariaLabel={t("permissionUserAria")} />
                <button
                  style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}
                  disabled={busy}
                  onClick={() => addShare("user", pendingUser.id)}
                >
                  {t("shareBtn")}
                </button>
                <button style={btnGhost} onClick={() => setPendingUser(null)}>
                  {t("common:actions.cancel")}
                </button>
              </div>
            ) : (
              <UserSearch onPick={setPendingUser} autoFocus label={t("addPerson")} />
            )
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: tokens.ink2, display: "block", marginBottom: 6 }}>
                  {t("addGroup")}
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  aria-label={t("groupAria")}
                  style={{
                    width: "100%",
                    fontFamily: "inherit",
                    fontSize: 14,
                    color: tokens.ink,
                    background: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.7)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    cursor: "pointer",
                  }}
                >
                  <option value="">{groups === null ? t("loading") : t("selectGroup")}</option>
                  {(groups ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.member_count})
                    </option>
                  ))}
                </select>
              </div>
              <PermissionSelect value={permission} onChange={setPermission} ariaLabel={t("permissionGroupAria")} />
              <button
                style={{ ...btnPrimary, opacity: busy || !selectedGroup ? 0.6 : 1 }}
                disabled={busy || !selectedGroup}
                onClick={() => selectedGroup && addShare("group", selectedGroup)}
              >
                {t("shareBtn")}
              </button>
            </div>
          )}
          <p style={{ margin: 0, fontSize: 12, color: tokens.hint }}>
            {permissionDescription(permission)}
          </p>
        </div>

        {error && (
          <div style={{ marginTop: 14 }}>
            <ErrorBox message={error} />
          </div>
        )}

        {/* Current shares */}
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "22px 0 10px", color: tokens.ink2 }}>
          {t("activeShares")}
        </h3>
        {list === null ? (
          <Spinner label={t("loading")} />
        ) : list.length === 0 ? (
          <p style={{ fontSize: 13, color: tokens.hint, margin: 0 }}>
            {t("noShares")}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((s) => (
              <ShareRow key={s.id} share={s} onRemove={() => removeShare(s)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ShareRow({ share, onRemove }: { share: Share; onRemove: () => void }) {
  const { t } = useTranslation("share");
  const name = share.subject_display_name || share.subject_label;
  return (
    <li
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
      <span style={{ flex: "0 0 auto", fontSize: 16 }}>{share.subject_type === "group" ? "👥" : "👤"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: tokens.ink, overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </div>
        {share.subject_display_name && share.subject_type === "user" && (
          <div style={{ fontSize: 12, color: tokens.ink3 }}>{share.subject_label}</div>
        )}
      </div>
      <Chip tone={PERMISSION_TONES[share.permission]}>{permissionLabel(share.permission)}</Chip>
      <button style={{ ...btnDanger, padding: "5px 10px" }} onClick={onRemove} aria-label={t("removeAria", { name })}>
        {t("common:actions.remove")}
      </button>
    </li>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 12,
        padding: "8px 16px",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
        color: active ? tokens.brandInk : tokens.ink2,
        background: active ? "rgba(108,92,231,0.14)" : "rgba(255,255,255,0.4)",
      }}
    >
      {children}
    </button>
  );
}

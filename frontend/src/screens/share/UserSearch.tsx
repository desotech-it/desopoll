// Debounced user typeahead. Calls users.search(q) and renders a result list;
// picking a result invokes onPick and clears the query. Reused by the share
// dialog and the groups admin screen (add-member flow).
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { users, type UserSearchResult } from "../../api";
import { glassSoft, inputStyle, tokens } from "../../ui";

export function UserSearch({
  onPick,
  placeholder,
  label,
  autoFocus,
}: {
  onPick: (u: UserSearchResult) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation("share");
  const resolvedPlaceholder = placeholder ?? t("userSearch.placeholder");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const myId = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const { users: found } = await users.search(term);
        if (myId === reqId.current) {
          setResults(found);
          setOpen(true);
        }
      } catch {
        if (myId === reqId.current) setResults([]);
      } finally {
        if (myId === reqId.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function pick(u: UserSearchResult) {
    onPick(u);
    setQ("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      {label && (
        <label style={{ fontSize: 12.5, fontWeight: 600, color: tokens.ink2, display: "block", marginBottom: 6 }}>
          {label}
        </label>
      )}
      <input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={resolvedPlaceholder}
        aria-label={label ?? t("userSearch.aria")}
        style={inputStyle}
      />
      {open && q.trim().length >= 2 && (
        <div
          style={{
            ...glassSoft,
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            maxHeight: 220,
            overflowY: "auto",
            padding: 4,
          }}
        >
          {searching && results.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 13, color: tokens.hint }}>{t("userSearch.searching")}</div>
          ) : results.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 13, color: tokens.hint }}>
              {t("userSearch.noResults")}
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => pick(u)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "9px 12px",
                  borderRadius: 10,
                  font: "inherit",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600, color: tokens.ink }}>
                  {u.display_name || u.email}
                </span>
                {u.display_name && (
                  <span style={{ fontSize: 12, color: tokens.ink3, marginLeft: 8 }}>{u.email}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

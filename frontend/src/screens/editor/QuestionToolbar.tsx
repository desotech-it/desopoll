// Per-question header toolbar: move up / move down (reorder) + delete.
import React from "react";
import { btnDanger } from "../../ui";

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(124,108,224,0.3)",
  background: "rgba(255,255,255,0.6)",
  color: "#7268c8",
  cursor: "pointer",
};

export function QuestionToolbar({
  canMoveUp,
  canMoveDown,
  reordering,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  reordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const upDisabled = !canMoveUp || reordering;
  const downDisabled = !canMoveDown || reordering;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        onClick={onMoveUp}
        disabled={upDisabled}
        title="Sposta su"
        aria-label="Sposta domanda su"
        style={{ ...iconBtn, opacity: upDisabled ? 0.4 : 1, cursor: upDisabled ? "default" : "pointer" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={downDisabled}
        title="Sposta giù"
        aria-label="Sposta domanda giù"
        style={{ ...iconBtn, opacity: downDisabled ? 0.4 : 1, cursor: downDisabled ? "default" : "pointer" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <button style={btnDanger} onClick={onDelete} title="Elimina domanda" disabled={reordering}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </button>
    </span>
  );
}

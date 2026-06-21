// Small permission-level <select> (view/play/edit/manage) with Italian labels.
import React from "react";
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from "../../permissions";
import { inputStyle } from "../../ui";

export function PermissionSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: Permission;
  onChange: (p: Permission) => void;
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Permission)}
      aria-label={ariaLabel ?? "Livello di permesso"}
      style={{ ...inputStyle, width: "auto", minWidth: 130, cursor: "pointer", padding: "8px 10px", fontSize: 13 }}
    >
      {PERMISSIONS.map((p) => (
        <option key={p} value={p}>
          {PERMISSION_LABELS[p]}
        </option>
      ))}
    </select>
  );
}

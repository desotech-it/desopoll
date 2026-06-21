// Small permission-level <select> (view/play/edit/manage) with localized labels.
import React from "react";
import { useTranslation } from "react-i18next";
import { PERMISSIONS, permissionLabel, type Permission } from "../../permissions";
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
  const { t } = useTranslation("share");
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Permission)}
      aria-label={ariaLabel ?? t("permission.aria")}
      style={{ ...inputStyle, width: "auto", minWidth: 130, cursor: "pointer", padding: "8px 10px", fontSize: 13 }}
    >
      {PERMISSIONS.map((p) => (
        <option key={p} value={p}>
          {permissionLabel(p)}
        </option>
      ))}
    </select>
  );
}

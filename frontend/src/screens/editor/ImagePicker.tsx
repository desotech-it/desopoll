// Per-question image picker: file input -> client resize -> data URL, with a
// preview thumbnail and a Remove button. The parent persists the value.
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { btnGhost, glassSoft, labelStyle, tokens } from "../../ui";
import { fileToResizedDataUrl } from "../../imageResize";

export function ImagePicker({
  image,
  onChange,
}: {
  image: string | null;
  // null clears the image; a data URL sets it.
  onChange: (next: string | null) => void;
}) {
  const { t } = useTranslation("editor");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again re-triggers change.
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      onChange(dataUrl);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("image.errorUpload"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{t("image.label")}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: "none" }}
        aria-label={t("image.upload")}
      />
      {image ? (
        <div
          style={{
            ...glassSoft,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 12px",
          }}
        >
          <img
            src={image}
            alt={t("image.previewAlt")}
            style={{
              width: 84,
              height: 64,
              objectFit: "cover",
              borderRadius: 10,
              flex: "0 0 auto",
              border: "1px solid rgba(255,255,255,0.6)",
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btnGhost}
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? t("image.loading") : t("image.replace")}
            </button>
            <button
              type="button"
              style={{
                ...btnGhost,
                color: "#c0556a",
                background: "rgba(192,85,106,0.08)",
                border: "1px solid rgba(192,85,106,0.22)",
              }}
              onClick={() => onChange(null)}
            >
              {t("image.remove")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          style={{ ...btnGhost, opacity: busy ? 0.6 : 1 }}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {busy ? t("image.loading") : t("image.add")}
        </button>
      )}
      {err && (
        <p style={{ fontSize: 12, color: "#a03050", marginTop: 8 }}>{err}</p>
      )}
      {!err && image && (
        <p style={{ fontSize: 11.5, color: tokens.hint, marginTop: 6 }}>
          {t("image.resizedNote")}
        </p>
      )}
    </div>
  );
}

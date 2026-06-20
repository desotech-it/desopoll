import { useEffect, useState } from "react";

type Health = { service: string; version: string; languages: string[]; defaultLanguage: string };

const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(26px) saturate(160%)",
  WebkitBackdropFilter: "blur(26px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.7)",
  borderRadius: 22,
  boxShadow: "0 24px 60px rgba(90,80,150,0.2), inset 0 1px 0 rgba(255,255,255,0.85)",
};

const shapes = [
  { d: "M12 4 L21 20 H3 Z", c: "#c0556a", bg: "rgba(255,158,158,.34)" },
  { d: "M12 3 L21 12 L12 21 L3 12 Z", c: "#3f6fb5", bg: "rgba(150,184,255,.36)" },
  { d: "", circle: true, c: "#9a7016", bg: "rgba(255,213,128,.42)" },
  { d: "", square: true, c: "#2f7d54", bg: "rgba(152,226,182,.42)" },
];

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setHealth)
      .catch(() => setErr(true));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        color: "#2b2a3c",
        background: "linear-gradient(135deg,#e9ecfb 0%,#f3edfb 45%,#e9f8f1 75%,#fbeef3 100%)",
      }}
    >
      <div style={{ ...glass, padding: "40px 36px", maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div style={{ display: "inline-flex", gap: 8, marginBottom: 14 }}>
          {shapes.map((s, i) => (
            <span
              key={i}
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: s.c,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                {s.circle ? (
                  <circle cx="12" cy="12" r="9" fill="currentColor" />
                ) : s.square ? (
                  <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" />
                ) : (
                  <path d={s.d} fill="currentColor" />
                )}
              </svg>
            </span>
          ))}
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, margin: "0 0 6px" }}>polling</h1>
        <p style={{ color: "#6b6982", margin: "0 0 26px" }}>Quiz e sondaggi dal vivo</p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontSize: 14,
            padding: "12px 16px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: health ? "#5fc9a6" : err ? "#e88a8a" : "#e0c06a",
            }}
          />
          {health ? (
            <span>
              Backend attivo · v{health.version} · lingue {health.languages.join(", ")}
            </span>
          ) : err ? (
            <span>Backend non raggiungibile</span>
          ) : (
            <span>Connessione al backend…</span>
          )}
        </div>

        <p style={{ fontSize: 12, color: "#9a98ad", marginTop: 24 }}>In costruzione — fase di implementazione</p>
      </div>
    </div>
  );
}

// Host post-game report route (/report/:sessionId). Auth-gated (rendered inside
// the app Shell). Loads the durable report from the backend and renders it with
// the glass design. Works after the live game (and Redis runtime) is gone.
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, sessions, type SessionReport } from "../../api";
import { btnGhost, ErrorBox, glass, Spinner } from "../../ui";
import { ReportView } from "./ReportView";

function errorFor(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "Solo l'organizzatore può vedere questi risultati.";
    if (e.status === 401) return "Devi effettuare l'accesso per vedere i risultati.";
    if (e.status === 404) return "Partita non trovata.";
    return e.message;
  }
  return "Impossibile caricare i risultati.";
}

export function ReportScreen() {
  const { sessionId = "" } = useParams();
  const [report, setReport] = useState<SessionReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!sessionId) return;
    setError(null);
    setReport(null);
    sessions
      .report(sessionId)
      .then(setReport)
      .catch((e) => setError(errorFor(e)));
  }

  useEffect(load, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={btnGhost}>
          ← Torna alla dashboard
        </Link>
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : report === null ? (
        <div style={{ ...glass, padding: 8 }}>
          <Spinner label="Caricamento dei risultati…" />
        </div>
      ) : (
        <ReportView report={report} />
      )}
    </div>
  );
}

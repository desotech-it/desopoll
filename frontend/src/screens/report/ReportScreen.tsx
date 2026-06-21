// Host post-game report route (/report/:sessionId). Auth-gated (rendered inside
// the app Shell). Loads the durable report from the backend and renders it with
// the glass design. Works after the live game (and Redis runtime) is gone.
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, sessions, type SessionReport } from "../../api";
import { btnGhost, ErrorBox, glass, Spinner } from "../../ui";
import { ReportView } from "./ReportView";
import i18n from "../../i18n";

function errorFor(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return i18n.t("errorHostOnly", { ns: "report" }) as string;
    if (e.status === 401) return i18n.t("errorLogin", { ns: "report" }) as string;
    if (e.status === 404) return i18n.t("errorNotFound", { ns: "report" }) as string;
    return e.message;
  }
  return i18n.t("errorGeneric", { ns: "report" }) as string;
}

export function ReportScreen() {
  const { t } = useTranslation(["report", "common"]);
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
          {t("common:actions.backToDashboard")}
        </Link>
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : report === null ? (
        <div style={{ ...glass, padding: 8 }}>
          <Spinner label={t("loading")} />
        </div>
      ) : (
        <ReportView report={report} />
      )}
    </div>
  );
}

// Presentational post-game report (issue #3). Pure: props in, glass JSX out.
// Renders per-question stats (correct %, distribution bars) + final standings.
import React from "react";
import { useTranslation } from "react-i18next";
import { glass, glassSoft, tokens } from "../../ui";
import { TypeChip } from "../../typeIcons";
import { typeName } from "../../questionTypes";
import type { ReportQuestionStat, SessionReport } from "../../api";
import {
  answeredLabel,
  averageCorrectPct,
  gameDuration,
  isScored,
  pct,
  sortedDistribution,
  totalAnswers,
  winner,
} from "./reportFormat";

export function ReportView({ report }: { report: SessionReport }) {
  const { t } = useTranslation("report");
  const top = winner(report.standings);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <SummaryCard report={report} winnerName={top?.nickname ?? null} />
      <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("questions")}</h2>
        {report.questions.length === 0 ? (
          <div style={{ ...glassSoft, padding: "18px 20px", color: tokens.muted }}>
            {t("noQuestions")}
          </div>
        ) : (
          report.questions.map((q, i) => <QuestionCard key={q.questionId} stat={q} index={i} playerCount={report.session.playerCount} />)
        )}
      </section>
      <StandingsCard report={report} />
    </div>
  );
}

function SummaryCard({ report, winnerName }: { report: SessionReport; winnerName: string | null }) {
  const { t } = useTranslation("report");
  const stats: { label: string; value: string }[] = [
    { label: t("stats.participants"), value: String(report.session.playerCount) },
    { label: t("stats.questions"), value: String(report.questions.length) },
    { label: t("stats.avgCorrect"), value: `${averageCorrectPct(report.questions)}%` },
    { label: t("stats.totalAnswers"), value: String(totalAnswers(report.questions)) },
    { label: t("stats.duration"), value: gameDuration(report) },
  ];
  return (
    <div style={{ ...glass, padding: "24px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{t("title")}</h1>
      {winnerName ? (
        <p style={{ margin: "0 0 18px", color: tokens.brandInk, fontWeight: 700, fontSize: 15 }}>
          {t("winner", { name: winnerName })}
        </p>
      ) : (
        <p style={{ margin: "0 0 18px", color: tokens.muted, fontSize: 14 }}>
          {t("noWinner")}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...glassSoft, padding: "12px 16px", minWidth: 120, flex: 1 }}>
            <div style={{ fontSize: 12, color: tokens.ink3, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: tokens.ink }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionCard({
  stat,
  index,
  playerCount,
}: {
  stat: ReportQuestionStat;
  index: number;
  playerCount: number;
}) {
  const { t } = useTranslation("report");
  const scored = isScored(stat.type);
  const buckets = sortedDistribution(stat);
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div style={{ ...glass, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: "rgba(124,108,224,0.14)",
            color: tokens.brandInk,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
            flex: "0 0 auto",
          }}
        >
          {index + 1}
        </span>
        <TypeChip type={stat.type} name={typeName(stat.type)} />
        <span style={{ marginLeft: "auto", fontSize: 13, color: tokens.ink3, fontWeight: 600 }}>
          {answeredLabel(stat, playerCount)}
        </span>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.3 }}>
        {stat.prompt || "—"}
      </h3>

      {scored && (
        <div style={{ marginBottom: 14 }}>
          <CorrectMeter value={pct(stat.correctPct)} />
        </div>
      )}

      {buckets.length === 0 ? (
        <p style={{ color: tokens.muted, fontSize: 13, margin: 0 }}>{t("noAnswer")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {buckets.map((b) => {
            const w = Math.round((b.count / max) * 100);
            return (
              <div key={b.key}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    fontWeight: 600,
                    color: tokens.ink2,
                    marginBottom: 4,
                  }}
                >
                  <span>{b.label}</span>
                  <span>{b.count}</span>
                </div>
                <div
                  style={{
                    height: 14,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${w}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "linear-gradient(90deg,#bdb7f3,#9890ea)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CorrectMeter({ value }: { value: number }) {
  const { t } = useTranslation("report");
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
        <span style={{ color: tokens.ink3 }}>{t("correctAnswers")}</span>
        <span style={{ color: value >= 50 ? "#2f7d54" : "#c0556a" }}>{value}%</span>
      </div>
      <div
        style={{
          height: 16,
          borderRadius: 999,
          background: "rgba(255,255,255,0.45)",
          border: "1px solid rgba(255,255,255,0.6)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg,#9ee0b6,#5fc98c)",
          }}
        />
      </div>
    </div>
  );
}

function StandingsCard({ report }: { report: SessionReport }) {
  const { t } = useTranslation("report");
  if (report.standings.length === 0) {
    return (
      <div style={{ ...glass, padding: "18px 20px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>{t("finalStandings")}</h2>
        <p style={{ color: tokens.muted, fontSize: 14, margin: 0 }}>{t("noScores")}</p>
      </div>
    );
  }
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <div style={{ ...glass, padding: "18px 20px" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>{t("finalStandings")}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {report.standings.map((s) => (
          <div
            key={`${s.rank}-${s.nickname}`}
            style={{ ...glassSoft, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}
          >
            <span style={{ width: 30, fontWeight: 800, color: tokens.brandInk }}>
              {medals[s.rank] ?? s.rank}
            </span>
            <span style={{ flex: 1, fontWeight: 600, color: tokens.ink }}>{s.nickname}</span>
            <span style={{ fontWeight: 800, color: tokens.ink2 }}>{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

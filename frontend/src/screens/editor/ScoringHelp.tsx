// Inline scoring explanation for the question editor (issue #8): a compact
// helper line + an expandable "How does scoring work?" panel with the full
// rules and the speed-bonus formula, and a clear note for survey types.
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PointsMode, QuestionType } from "../../api";
import { glassSoft, tokens } from "../../ui";
import { isSurveyType, speedBonusApplies, supportsPartialCredit } from "../../scoring";

export function ScoringHelp({
  type,
  pointsMode,
  speedBonus,
}: {
  type: QuestionType;
  pointsMode: PointsMode;
  speedBonus: boolean;
}) {
  const { t } = useTranslation("scoring");
  const [open, setOpen] = useState(false);
  const survey = isSurveyType(type);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: tokens.ink3, flex: "1 1 240px", lineHeight: 1.45 }}>
          {survey ? t("surveyNote") : t("helperLine")}
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            font: "inherit",
            fontSize: 12.5,
            fontWeight: 600,
            color: tokens.brandInk,
            textDecoration: "underline",
            flex: "0 0 auto",
          }}
        >
          {open ? t("help.close") : t("help.toggle")}
        </button>
      </div>

      {open && (
        <div
          role="region"
          aria-label={t("help.title")}
          style={{ ...glassSoft, marginTop: 10, padding: "14px 16px" }}
        >
          <strong style={{ display: "block", fontSize: 13.5, color: tokens.ink, marginBottom: 6 }}>
            {t("help.title")}
          </strong>
          <p style={{ margin: "0 0 10px", fontSize: 12.5, color: tokens.ink3, lineHeight: 1.5 }}>
            {t("help.intro")}
          </p>

          <Section heading={t("help.baseHeading")}>
            <li>{t("help.baseStandard")}</li>
            <li>{t("help.baseDouble")}</li>
            <li>{t("help.baseNone")}</li>
          </Section>

          <Section heading={t("help.speedHeading")}>
            <li>{t("help.speedOn")}</li>
            <li>{t("help.speedOff")}</li>
            <li>
              <code style={codeStyle}>{t("help.speedFormula")}</code>
            </li>
          </Section>

          {supportsPartialCredit(type) && (
            <Section heading={t("help.partialHeading")}>
              <li>{t("help.partialBody")}</li>
            </Section>
          )}

          <Section heading={t("help.zeroHeading")}>
            <li>{t("help.zeroBody")}</li>
          </Section>

          {/* When the current config makes the speed bonus inert, the helper
              line above already reflects it; the formula stays for reference. */}
          {!speedBonusApplies(type, pointsMode) && speedBonus && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: tokens.hint }}>
              {survey ? t("surveyNote") : t("help.baseNone")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: tokens.ink2, marginBottom: 2 }}>
        {heading}
      </span>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: tokens.ink3, lineHeight: 1.5 }}>
        {children}
      </ul>
    </div>
  );
}

const codeStyle: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 12,
  background: "rgba(124,108,224,0.10)",
  padding: "1px 6px",
  borderRadius: 6,
  color: tokens.brandInk,
};

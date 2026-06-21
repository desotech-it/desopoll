// English — scoring explanation shown in the question editor (issue #8).
export default {
  helperLine: "Standard 1000 pts, Double 2000 pts, None 0 pts. Wrong answers score 0.",
  surveyNote: "This is a survey: answers are not scored (0 points).",
  help: {
    toggle: "How does scoring work?",
    close: "Close",
    title: "How scoring works",
    intro: "Scoring is computed by the server. These are the rules applied to each question.",
    baseHeading: "Base points",
    baseStandard: "Standard: 1000 points for a correct answer.",
    baseDouble: "Double: 2000 points for a correct answer.",
    baseNone: "None: 0 points, the question awards no score.",
    speedHeading: "Speed bonus",
    speedOn:
      "On: a correct answer is worth from 100% (instant) down to 50% (at time-up).",
    speedOff: "Off: a correct answer always earns 100% of the base points.",
    speedFormula: "Formula: base × (1 − (response time / time limit) / 2).",
    partialHeading: "Partial credit",
    partialBody:
      "Multiple choice (fraction of correct options) and ordering (items in the right position) award a fraction of the points. Numeric and slider use the tolerance. True/False and single choice are all-or-nothing.",
    zeroHeading: "When the score is 0",
    zeroBody:
      "Wrong answers score 0. Surveys (Poll and Word cloud) are not scored.",
  },
} as const;

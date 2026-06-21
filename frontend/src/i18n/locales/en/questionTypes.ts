// English — question type names + descriptions + answer summaries.
export default {
  single_choice: {
    name: "Single choice",
    desc: "Participants pick a single correct answer among the options. Ideal for factual questions.",
  },
  multiple_choice: {
    name: "Multiple choice",
    desc: "Participants can select several correct answers at once.",
  },
  true_false: {
    name: "True / False",
    desc: "Participants decide whether a statement is true or false. Quick to set up.",
  },
  poll: {
    name: "Poll",
    desc: "Participants vote for an option with no correct answer. Real-time results.",
  },
  open_text: {
    name: "Open answer",
    desc: "Participants freely type a text answer from the accepted ones.",
  },
  numeric: {
    name: "Numeric answer",
    desc: "Participants enter a number. Correct within a configurable tolerance.",
  },
  slider: {
    name: "Slider",
    desc: "Participants choose a value on a min–max scale. Correct within a tolerance.",
  },
  ordering: {
    name: "Ordering",
    desc: "Participants reorder the items into the correct sequence. Partial scoring.",
  },
  word_cloud: {
    name: "Word cloud",
    desc: "Participants type a free word. Survey: no scoring, just aggregation.",
  },
  summary: {
    trueValue: "True",
    falseValue: "False",
    trueFalse: "Correct: {{value}}",
    acceptedNone: "No accepted answers",
    acceptedCount: "{{count}} accepted answer(s)",
    numeric: "Answer: {{answer}}",
    numericTol: "Answer: {{answer}} ± {{tol}}",
    slider: "Scale {{min}}–{{max}} · answer {{answer}}",
    sliderTol: "Scale {{min}}–{{max}} · answer {{answer}} ± {{tol}}",
    ordering: "{{count}} items to order",
    wordCloud: "Survey · no scoring",
    pollOptions: "{{count}} options",
    optionsCorrect: "{{total}} options · {{correct}} correct",
  },
} as const;

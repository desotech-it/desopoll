// English — post-game report screen.
export default {
  loading: "Loading results…",
  errorHostOnly: "Only the organizer can view these results.",
  errorLogin: "You must sign in to view the results.",
  errorNotFound: "Game not found.",
  errorGeneric: "Couldn't load the results.",
  title: "Game results",
  winner: "🏆 Winner: {{name}}",
  noWinner: "No participant scored any points.",
  questions: "Questions",
  noQuestions: "No questions recorded for this game.",
  noAnswer: "No answers.",
  correctAnswers: "Correct answers",
  finalStandings: "Final standings",
  noScores: "No scores recorded.",
  stats: {
    participants: "Participants",
    questions: "Questions",
    avgCorrect: "Average correct",
    totalAnswers: "Total answers",
    duration: "Duration",
  },
} as const;

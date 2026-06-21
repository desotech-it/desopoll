// Italian — post-game report screen.
export default {
  loading: "Caricamento dei risultati…",
  errorHostOnly: "Solo l'organizzatore può vedere questi risultati.",
  errorLogin: "Devi effettuare l'accesso per vedere i risultati.",
  errorNotFound: "Partita non trovata.",
  errorGeneric: "Impossibile caricare i risultati.",
  title: "Risultati della partita",
  winner: "🏆 Vincitore: {{name}}",
  noWinner: "Nessun partecipante ha totalizzato punti.",
  questions: "Domande",
  noQuestions: "Nessuna domanda registrata per questa partita.",
  noAnswer: "Nessuna risposta.",
  correctAnswers: "Risposte corrette",
  finalStandings: "Classifica finale",
  noScores: "Nessun punteggio registrato.",
  stats: {
    participants: "Partecipanti",
    questions: "Domande",
    avgCorrect: "Media corrette",
    totalAnswers: "Risposte totali",
    duration: "Durata",
  },
} as const;

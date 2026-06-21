// Spanish — post-game report screen.
export default {
  loading: "Cargando los resultados…",
  errorHostOnly: "Solo el organizador puede ver estos resultados.",
  errorLogin: "Debes iniciar sesión para ver los resultados.",
  errorNotFound: "Partida no encontrada.",
  errorGeneric: "No se han podido cargar los resultados.",
  title: "Resultados de la partida",
  winner: "🏆 Ganador: {{name}}",
  noWinner: "Ningún participante ha conseguido puntos.",
  questions: "Preguntas",
  noQuestions: "No se han registrado preguntas para esta partida.",
  noAnswer: "Sin respuestas.",
  correctAnswers: "Respuestas correctas",
  finalStandings: "Clasificación final",
  noScores: "No se han registrado puntuaciones.",
  stats: {
    participants: "Participantes",
    questions: "Preguntas",
    avgCorrect: "Media de aciertos",
    totalAnswers: "Respuestas totales",
    duration: "Duración",
  },
} as const;

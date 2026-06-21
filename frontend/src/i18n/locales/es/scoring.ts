// Spanish — scoring explanation shown in the question editor (issue #8).
export default {
  helperLine: "Estándar 1000 pts, Doble 2000 pts, Ninguno 0 pts. Las respuestas erróneas valen 0.",
  surveyNote: "Esto es una encuesta: las respuestas no se puntúan (0 puntos).",
  help: {
    toggle: "¿Cómo funciona la puntuación?",
    close: "Cerrar",
    title: "Cómo funciona la puntuación",
    intro: "La puntuación la calcula el servidor. Estas son las reglas aplicadas a cada pregunta.",
    baseHeading: "Puntos base",
    baseStandard: "Estándar: 1000 puntos por una respuesta correcta.",
    baseDouble: "Doble: 2000 puntos por una respuesta correcta.",
    baseNone: "Ninguno: 0 puntos, la pregunta no otorga puntuación.",
    speedHeading: "Bonus de velocidad",
    speedOn:
      "Activo: una respuesta correcta vale desde el 100% (inmediata) hasta el 50% (al agotarse el tiempo).",
    speedOff: "Desactivado: una respuesta correcta siempre obtiene el 100% de los puntos base.",
    speedFormula: "Fórmula: base × (1 − (tiempo de respuesta / tiempo límite) / 2).",
    partialHeading: "Puntuación parcial",
    partialBody:
      "Opción múltiple (fracción de opciones correctas) y ordenación (elementos en la posición correcta) otorgan una fracción de los puntos. Numérico y deslizador usan la tolerancia. Verdadero/Falso y opción única son todo o nada.",
    zeroHeading: "Cuándo la puntuación es 0",
    zeroBody:
      "Las respuestas erróneas valen 0. Las encuestas (Encuesta y Nube de palabras) no se puntúan.",
  },
} as const;

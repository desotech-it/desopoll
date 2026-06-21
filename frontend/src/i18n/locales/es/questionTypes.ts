// Spanish — question type names + descriptions + answer summaries.
export default {
  single_choice: {
    name: "Opción única",
    desc: "Los participantes eligen una sola respuesta correcta entre las opciones. Ideal para preguntas factuales.",
  },
  multiple_choice: {
    name: "Opción múltiple",
    desc: "Los participantes pueden seleccionar varias respuestas correctas a la vez.",
  },
  true_false: {
    name: "Verdadero / Falso",
    desc: "Los participantes deciden si una afirmación es verdadera o falsa. Rápida de configurar.",
  },
  poll: {
    name: "Encuesta (Poll)",
    desc: "Los participantes votan una opción sin respuesta correcta. Resultados en tiempo real.",
  },
  open_text: {
    name: "Respuesta abierta",
    desc: "Los participantes escriben libremente una respuesta de texto entre las aceptadas.",
  },
  numeric: {
    name: "Respuesta numérica",
    desc: "Los participantes introducen un número. Correcta dentro de una tolerancia configurable.",
  },
  slider: {
    name: "Control deslizante (Slider)",
    desc: "Los participantes eligen un valor en una escala mín–máx. Correcta dentro de una tolerancia.",
  },
  ordering: {
    name: "Ordenación",
    desc: "Los participantes reordenan los elementos en la secuencia correcta. Puntuación parcial.",
  },
  word_cloud: {
    name: "Nube de palabras",
    desc: "Los participantes escriben una palabra libre. Encuesta: sin puntuación, solo agregación.",
  },
  summary: {
    trueValue: "Verdadero",
    falseValue: "Falso",
    trueFalse: "Correcta: {{value}}",
    acceptedNone: "Ninguna respuesta aceptada",
    acceptedCount: "{{count}} respuesta(s) aceptada(s)",
    numeric: "Respuesta: {{answer}}",
    numericTol: "Respuesta: {{answer}} ± {{tol}}",
    slider: "Escala {{min}}–{{max}} · respuesta {{answer}}",
    sliderTol: "Escala {{min}}–{{max}} · respuesta {{answer}} ± {{tol}}",
    ordering: "{{count}} elementos por ordenar",
    wordCloud: "Encuesta · sin puntuación",
    pollOptions: "{{count}} opciones",
    optionsCorrect: "{{total}} opciones · {{correct}} correcta(s)",
  },
} as const;

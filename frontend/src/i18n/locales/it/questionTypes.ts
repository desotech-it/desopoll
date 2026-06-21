// Italian — question type names + descriptions + answer summaries.
export default {
  single_choice: {
    name: "Scelta singola",
    desc: "I partecipanti scelgono una sola risposta corretta tra le opzioni. Ideale per domande fattuali.",
  },
  multiple_choice: {
    name: "Scelta multipla",
    desc: "I partecipanti possono selezionare più risposte corrette contemporaneamente.",
  },
  true_false: {
    name: "Vero / Falso",
    desc: "I partecipanti decidono se un'affermazione è vera o falsa. Rapida da configurare.",
  },
  poll: {
    name: "Sondaggio (Poll)",
    desc: "I partecipanti votano un'opzione senza risposta corretta. Risultati in tempo reale.",
  },
  open_text: {
    name: "Risposta aperta",
    desc: "I partecipanti digitano liberamente una risposta testuale tra quelle accettate.",
  },
  numeric: {
    name: "Risposta numerica",
    desc: "I partecipanti inseriscono un numero. Corretto entro una tolleranza configurabile.",
  },
  slider: {
    name: "Cursore (Slider)",
    desc: "I partecipanti scelgono un valore su una scala min–max. Corretto entro una tolleranza.",
  },
  ordering: {
    name: "Ordinamento",
    desc: "I partecipanti riordinano gli elementi nella sequenza corretta. Punteggio parziale.",
  },
  word_cloud: {
    name: "Nuvola di parole",
    desc: "I partecipanti scrivono una parola libera. Sondaggio: nessun punteggio, solo aggregazione.",
  },
  summary: {
    trueValue: "Vero",
    falseValue: "Falso",
    trueFalse: "Corretta: {{value}}",
    acceptedNone: "Nessuna risposta accettata",
    acceptedCount: "{{count}} risposta/e accettata/e",
    numeric: "Risposta: {{answer}}",
    numericTol: "Risposta: {{answer}} ± {{tol}}",
    slider: "Scala {{min}}–{{max}} · risposta {{answer}}",
    sliderTol: "Scala {{min}}–{{max}} · risposta {{answer}} ± {{tol}}",
    ordering: "{{count}} elementi da ordinare",
    wordCloud: "Sondaggio · nessun punteggio",
    pollOptions: "{{count}} opzioni",
    optionsCorrect: "{{total}} opzioni · {{correct}} corretta/e",
  },
} as const;

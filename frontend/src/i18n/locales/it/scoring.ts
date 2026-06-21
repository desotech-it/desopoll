// Italian — scoring explanation shown in the question editor (issue #8).
export default {
  helperLine: "Standard 1000 pt, Doppio 2000 pt, Nessuno 0 pt. Le risposte errate valgono 0.",
  surveyNote: "Questo è un sondaggio: le risposte non vengono valutate (0 punti).",
  help: {
    toggle: "Come funziona il punteggio?",
    close: "Chiudi",
    title: "Come funziona il punteggio",
    intro: "Il punteggio è calcolato dal server. Ecco le regole applicate a ogni domanda.",
    baseHeading: "Punti base",
    baseStandard: "Standard: 1000 punti per una risposta corretta.",
    baseDouble: "Doppio: 2000 punti per una risposta corretta.",
    baseNone: "Nessuno: 0 punti, la domanda non assegna punteggio.",
    speedHeading: "Bonus velocità",
    speedOn:
      "Attivo: una risposta corretta vale dal 100% (immediata) fino al 50% (allo scadere del tempo).",
    speedOff: "Disattivato: una risposta corretta vale sempre il 100% dei punti base.",
    speedFormula: "Formula: base × (1 − (tempo di risposta / tempo limite) / 2).",
    partialHeading: "Punteggio parziale",
    partialBody:
      "Scelta multipla (frazione di opzioni corrette) e ordinamento (elementi nella posizione giusta) assegnano una frazione dei punti. Numerico e cursore usano la tolleranza. Vero/Falso e scelta singola sono tutto-o-niente.",
    zeroHeading: "Quando il punteggio è 0",
    zeroBody:
      "Le risposte errate valgono 0. I sondaggi (Poll e Nuvola di parole) non vengono valutati.",
  },
} as const;

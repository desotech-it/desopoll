// Italian — "Lingue & traduzioni" tab (issue #6): manage available languages
// and translate the quiz title + question prompts + option texts.
export default {
  translations: "Lingue & traduzioni",
  translationsHint: "Gestisci lingue e traduzioni del quiz",
  title: "Lingue & traduzioni",
  ariaLabel: "Lingue e traduzioni di {{title}}",
  loading: "Caricamento…",
  languagesHeading: "Lingue disponibili",
  baseChip: "{{lang}} (base)",
  removeLanguageAria: "Rimuovi {{lang}}",
  confirmRemoveLanguage: "Rimuovere la lingua {{lang}} e le sue traduzioni?",
  translationsHeading: "Traduzioni",
  noLanguages: "Aggiungi una lingua per iniziare a tradurre.",
  noStrings: "Non ci sono testi da tradurre in questo quiz.",
  quizTitleLabel: "Titolo del quiz",
  translationPlaceholder: "Traduzione…",
  inputAria: "Traduzione per {{group}}: {{base}}",
  completenessAria: "{{lang}}: {{translated}} su {{total}} testi tradotti",
  saveLanguage: "Salva {{lang}}",
  errorLoad: "Errore nel caricamento delle traduzioni.",
  errorSave: "Salvataggio delle traduzioni non riuscito.",
  errorSaveLanguages: "Aggiornamento delle lingue non riuscito.",
} as const;

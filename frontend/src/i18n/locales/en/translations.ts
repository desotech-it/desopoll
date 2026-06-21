// English — "Languages & translations" tab (issue #6): manage available
// languages and translate the quiz title + question prompts + option texts.
export default {
  translations: "Languages & translations",
  translationsHint: "Manage quiz languages and translations",
  title: "Languages & translations",
  ariaLabel: "Languages and translations for {{title}}",
  loading: "Loading…",
  languagesHeading: "Available languages",
  baseChip: "{{lang}} (base)",
  removeLanguageAria: "Remove {{lang}}",
  confirmRemoveLanguage: "Remove the {{lang}} language and its translations?",
  translationsHeading: "Translations",
  noLanguages: "Add a language to start translating.",
  noStrings: "There is nothing to translate in this quiz.",
  quizTitleLabel: "Quiz title",
  translationPlaceholder: "Translation…",
  inputAria: "Translation for {{group}}: {{base}}",
  completenessAria: "{{lang}}: {{translated}} of {{total}} strings translated",
  saveLanguage: "Save {{lang}}",
  errorLoad: "Failed to load translations.",
  errorSave: "Failed to save translations.",
  errorSaveLanguages: "Failed to update languages.",
} as const;

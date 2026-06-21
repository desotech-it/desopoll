// Spanish — pestaña "Idiomas y traducciones" (issue #6): gestionar los idiomas
// disponibles y traducir el título del cuestionario, las preguntas y las opciones.
export default {
  translations: "Idiomas y traducciones",
  translationsHint: "Gestiona los idiomas y las traducciones del cuestionario",
  title: "Idiomas y traducciones",
  ariaLabel: "Idiomas y traducciones de {{title}}",
  loading: "Cargando…",
  languagesHeading: "Idiomas disponibles",
  baseChip: "{{lang}} (base)",
  removeLanguageAria: "Quitar {{lang}}",
  confirmRemoveLanguage: "¿Quitar el idioma {{lang}} y sus traducciones?",
  translationsHeading: "Traducciones",
  noLanguages: "Añade un idioma para empezar a traducir.",
  noStrings: "No hay nada que traducir en este cuestionario.",
  quizTitleLabel: "Título del cuestionario",
  translationPlaceholder: "Traducción…",
  inputAria: "Traducción para {{group}}: {{base}}",
  completenessAria: "{{lang}}: {{translated}} de {{total}} textos traducidos",
  saveLanguage: "Guardar {{lang}}",
  errorLoad: "Error al cargar las traducciones.",
  errorSave: "No se pudieron guardar las traducciones.",
  errorSaveLanguages: "No se pudieron actualizar los idiomas.",
} as const;

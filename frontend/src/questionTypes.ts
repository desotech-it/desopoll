// Metadata + answer_spec factory/normalizer helpers for the supported question types.
import type { AnswerSpec, Option, QuestionType } from "./api";

// A stable icon key per question type. Each type gets its OWN distinct glyph
// (rendered by TypeIcon in typeIcons.tsx) and a consistent tone — deliberately
// NOT reusing the four answer-option shapes (triangle/diamond/circle/square),
// which players learn as "answer A/B/C/D" in the game.
export type TypeIconKey = "single" | "multi" | "truefalse" | "poll" | "text";

export interface TypeMeta {
  type: QuestionType;
  name: string;
  desc: string;
  icon: TypeIconKey;
  tone: "violet" | "teal" | "amber" | "rose" | "sky" | "green";
}

export const QUESTION_TYPES: TypeMeta[] = [
  {
    type: "single_choice",
    name: "Scelta singola",
    desc: "I partecipanti scelgono una sola risposta corretta tra le opzioni. Ideale per domande fattuali.",
    icon: "single",
    tone: "violet",
  },
  {
    type: "multiple_choice",
    name: "Scelta multipla",
    desc: "I partecipanti possono selezionare più risposte corrette contemporaneamente.",
    icon: "multi",
    tone: "sky",
  },
  {
    type: "true_false",
    name: "Vero / Falso",
    desc: "I partecipanti decidono se un'affermazione è vera o falsa. Rapida da configurare.",
    icon: "truefalse",
    tone: "green",
  },
  {
    type: "poll",
    name: "Sondaggio (Poll)",
    desc: "I partecipanti votano un'opzione senza risposta corretta. Risultati in tempo reale.",
    icon: "poll",
    tone: "amber",
  },
  {
    type: "open_text",
    name: "Risposta aperta",
    desc: "I partecipanti digitano liberamente una risposta testuale tra quelle accettate.",
    icon: "text",
    tone: "teal",
  },
];

export function typeName(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.type === type)?.name ?? type;
}

// Look up the metadata (icon key + tone + name) for a question type.
export function typeMeta(type: QuestionType): TypeMeta | undefined {
  return QUESTION_TYPES.find((t) => t.type === type);
}

// The icon key for a type (used by TypeIcon and unit-tested for distinctness).
export function typeIconKey(type: QuestionType): TypeIconKey {
  return typeMeta(type)?.icon ?? "single";
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (older browsers): RFC4122-ish.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function opt(text = ""): Option {
  return { id: uuid(), text };
}

// Build a fresh, valid answer_spec for a newly created question of the given type.
export function defaultAnswerSpec(type: QuestionType): AnswerSpec {
  switch (type) {
    case "single_choice": {
      const a = opt();
      const b = opt();
      return { options: [a, b, opt(), opt()], correct: [a.id] };
    }
    case "multiple_choice": {
      // No option is pre-marked correct: the author must explicitly pick at
      // least one (validation enforces this before launch).
      return { options: [opt(), opt(), opt(), opt()], correct: [] };
    }
    case "true_false":
      return { correct: true };
    case "poll":
      return { options: [opt(), opt(), opt(), opt()] };
    case "open_text":
      return { accepted: [], caseSensitive: false };
    default:
      return { options: [opt(), opt()], correct: [] };
  }
}

// Type guards for reading the union safely.
export function hasOptions(spec: AnswerSpec): spec is { options: Option[]; correct?: string[] } {
  return typeof spec === "object" && spec !== null && "options" in spec;
}
export function isTrueFalse(spec: AnswerSpec): spec is { correct: boolean } {
  return (
    typeof spec === "object" &&
    spec !== null &&
    "correct" in spec &&
    typeof (spec as { correct: unknown }).correct === "boolean"
  );
}
export function isOpenText(spec: AnswerSpec): spec is { accepted: string[]; caseSensitive?: boolean } {
  return typeof spec === "object" && spec !== null && "accepted" in spec;
}

// Short human description of the configured answer (for the question list).
export function answerSummary(type: QuestionType, spec: AnswerSpec): string {
  if (type === "true_false" && isTrueFalse(spec)) {
    return `Corretta: ${spec.correct ? "Vero" : "Falso"}`;
  }
  if (type === "open_text" && isOpenText(spec)) {
    const n = spec.accepted.length;
    return n ? `${n} risposta/e accettata/e` : "Nessuna risposta accettata";
  }
  if (hasOptions(spec)) {
    const total = spec.options.length;
    if (type === "poll") return `${total} opzioni`;
    const correct = (spec.correct ?? []).length;
    return `${total} opzioni · ${correct} corretta/e`;
  }
  return "";
}

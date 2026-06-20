// Metadata + answer_spec factory/normalizer helpers for the supported question types.
import type { AnswerSpec, Option, QuestionType } from "./api";

export interface TypeMeta {
  type: QuestionType;
  name: string;
  desc: string;
}

export const QUESTION_TYPES: TypeMeta[] = [
  {
    type: "single_choice",
    name: "Scelta singola",
    desc: "I partecipanti scelgono una sola risposta corretta tra le opzioni. Ideale per domande fattuali.",
  },
  {
    type: "multiple_choice",
    name: "Scelta multipla",
    desc: "I partecipanti possono selezionare più risposte corrette contemporaneamente.",
  },
  {
    type: "true_false",
    name: "Vero / Falso",
    desc: "I partecipanti decidono se un'affermazione è vera o falsa. Rapida da configurare.",
  },
  {
    type: "poll",
    name: "Sondaggio (Poll)",
    desc: "I partecipanti votano un'opzione senza risposta corretta. Risultati in tempo reale.",
  },
  {
    type: "open_text",
    name: "Risposta aperta",
    desc: "I partecipanti digitano liberamente una risposta testuale tra quelle accettate.",
  },
];

export function typeName(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.type === type)?.name ?? type;
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
      const a = opt();
      return { options: [a, opt(), opt(), opt()], correct: [a.id] };
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

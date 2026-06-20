// Typed fetch helpers for the desopoll backend (same origin, session cookie auth).
// Every request uses credentials:"include" so the session cookie is sent.

// ---- Types ----
export type Role = "admin" | "user" | string;
export type Status = "active" | "suspended" | "invited" | string;

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  status: Status;
}

export interface AdminUser extends User {
  created_at?: string;
  has_password?: boolean;
}

export interface AuthConfig {
  oidc: boolean;
  localLogin: boolean;
}

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "poll"
  | "open_text";

export type PointsMode = "standard" | "double" | "none";

export interface Option {
  id: string;
  text: string;
}

// answer_spec is a discriminated-ish union depending on question type.
export type AnswerSpec =
  | { options: Option[]; correct: string[] } // single_choice / multiple_choice
  | { options: Option[] } // poll
  | { correct: boolean } // true_false
  | { accepted: string[]; caseSensitive?: boolean }; // open_text

export interface Question {
  id: string;
  position: number;
  type: QuestionType;
  prompt: string;
  image: string | null;
  time_limit_sec: number;
  points_mode: PointsMode;
  speed_bonus: boolean;
  answer_spec: AnswerSpec;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  base_language: string;
  available_languages?: string[];
  is_public: boolean;
  updated_at: string;
  question_count?: number;
}

// ---- Core request helper ----
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {},
  };
  if (options.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, "Impossibile contattare il server.");
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : null) ?? `Errore ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

// ---- Auth ----
export const auth = {
  me: () => request<{ user: User }>("/api/auth/me"),
  config: () => request<AuthConfig>("/api/auth/config"),
  loginLocal: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login/local", { method: "POST", body: { email, password } }),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
};

// ---- Quizzes ----
export const quizzes = {
  list: () => request<{ quizzes: Quiz[] }>("/api/quizzes"),
  create: (body: { title: string; description?: string; base_language?: string }) =>
    request<{ quiz: Quiz }>("/api/quizzes", { method: "POST", body }),
  get: (id: string) => request<{ quiz: Quiz; questions: Question[] }>(`/api/quizzes/${id}`),
  update: (
    id: string,
    body: { title?: string; description?: string; is_public?: boolean; base_language?: string },
  ) => request<{ quiz: Quiz }>(`/api/quizzes/${id}`, { method: "PATCH", body }),
  remove: (id: string) => request<{ ok: true }>(`/api/quizzes/${id}`, { method: "DELETE" }),
};

// ---- Questions ----
export interface QuestionCreate {
  type: QuestionType;
  prompt: string;
  time_limit_sec?: number;
  points_mode?: PointsMode;
  speed_bonus?: boolean;
  answer_spec: AnswerSpec;
  image?: string | null;
}

export interface QuestionPatch {
  prompt?: string;
  time_limit_sec?: number;
  points_mode?: PointsMode;
  speed_bonus?: boolean;
  answer_spec?: AnswerSpec;
  image?: string | null;
}

export const questions = {
  create: (quizId: string, body: QuestionCreate) =>
    request<{ question: Question }>(`/api/quizzes/${quizId}/questions`, { method: "POST", body }),
  update: (qid: string, body: QuestionPatch) =>
    request<{ question: Question }>(`/api/questions/${qid}`, { method: "PATCH", body }),
  remove: (qid: string) => request<{ ok: true }>(`/api/questions/${qid}`, { method: "DELETE" }),
};

// ---- Admin users ----
export const admin = {
  listUsers: () => request<{ users: AdminUser[] }>("/api/admin/users"),
  createUser: (body: { email: string; display_name?: string; role?: Role; password?: string }) =>
    request<{ user: AdminUser }>("/api/admin/users", { method: "POST", body }),
  updateUser: (id: string, body: { role?: Role; status?: Status; display_name?: string }) =>
    request<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body }),
};

// Typed fetch helpers for the desopoll backend (same origin, session cookie auth).
// Every request uses credentials:"include" so the session cookie is sent.

import type { Permission } from "./permissions";
export type { Permission };

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
  | "open_text"
  | "numeric"
  | "slider"
  | "ordering"
  | "word_cloud";

export type PointsMode = "standard" | "double" | "none";

export interface Option {
  id: string;
  text: string;
}

// An ordering item (distinct shape from Option to keep the contract explicit).
export interface OrderingItem {
  id: string;
  text: string;
}

// answer_spec is a discriminated-ish union depending on question type.
export type AnswerSpec =
  | { options: Option[]; correct: string[] } // single_choice / multiple_choice
  | { options: Option[] } // poll
  | { correct: boolean } // true_false
  | { accepted: string[]; caseSensitive?: boolean } // open_text
  | { answer: number; tolerance?: number } // numeric
  | { min: number; max: number; step?: number; answer: number; tolerance?: number } // slider
  | { items: OrderingItem[]; correctOrder: string[] } // ordering
  | Record<string, never>; // word_cloud (survey, no scoring)

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
  // Sharing (issue #4): owner rows have owned=true & permission='manage'; shared
  // rows have owned=false and the caller's effective level. owner_id identifies
  // the owner. Older endpoints (e.g. duplicate) may omit these, so optional.
  owner_id?: string;
  owned?: boolean;
  permission?: Permission;
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
  get: (id: string) =>
    request<{ quiz: Quiz; questions: Question[]; permission: Permission }>(`/api/quizzes/${id}`),
  update: (
    id: string,
    body: { title?: string; description?: string; is_public?: boolean; base_language?: string },
  ) => request<{ quiz: Quiz }>(`/api/quizzes/${id}`, { method: "PATCH", body }),
  remove: (id: string) => request<{ ok: true }>(`/api/quizzes/${id}`, { method: "DELETE" }),
  // Reorder questions: pass the full ordered list of question ids. Returns the
  // reordered question rows (positions renumbered 1..n).
  reorderQuestions: (id: string, order: string[]) =>
    request<{ questions: Question[] }>(`/api/quizzes/${id}/questions/order`, {
      method: "PATCH",
      body: { order },
    }),
  // Deep-copy a quiz (with all its questions). Returns the new quiz row.
  duplicate: (id: string) =>
    request<{ quiz: Quiz }>(`/api/quizzes/${id}/duplicate`, { method: "POST" }),
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

// ---- Sharing: shares, user search, groups (issue #4) ----
export type SubjectType = "user" | "group";

export interface Share {
  id: string;
  subject_type: SubjectType;
  subject_id: string;
  permission: Permission;
  granted_by: string | null;
  granted_at: string;
  // Resolved display fields (email for users, name for groups).
  subject_label: string;
  subject_display_name: string | null;
}

export interface UserSearchResult {
  id: string;
  email: string;
  display_name: string | null;
}

export const shares = {
  // manage-gated: list current shares for a quiz.
  list: (quizId: string) =>
    request<{ shares: Share[] }>(`/api/quizzes/${quizId}/shares`),
  // manage-gated: upsert a share for a user/group at a permission level.
  add: (quizId: string, body: { subjectType: SubjectType; subjectId: string; permission: Permission }) =>
    request<{ share: Share }>(`/api/quizzes/${quizId}/shares`, { method: "POST", body }),
  // manage-gated: revoke a share.
  remove: (quizId: string, shareId: string) =>
    request<{ ok: true }>(`/api/quizzes/${quizId}/shares/${shareId}`, { method: "DELETE" }),
};

export const users = {
  // Any authenticated user: typeahead search (max 10).
  search: (q: string) =>
    request<{ users: UserSearchResult[] }>(`/api/users/search?q=${encodeURIComponent(q)}`),
};

// ---- Sessions (live games) ----
export interface SessionInfo {
  id: string;
  pin: string;
  title: string;
  state: string;
  currentIndex: number;
  total: number;
}

export interface SessionPlayer {
  id: string;
  nickname: string;
  score: number;
}

export interface SessionDetail {
  session: SessionInfo;
  players: SessionPlayer[];
  count: number;
}

export interface SessionByPin {
  sessionId: string;
  title: string;
  state: string;
  joinable: boolean;
}

// ---- Post-game report (issue #3) ----
export interface ReportDistributionEntry {
  key: string;
  label: string;
  count: number;
}

export interface ReportQuestionStat {
  questionId: string;
  prompt: string;
  type: QuestionType;
  answeredCount: number;
  correctCount: number;
  correctPct: number; // 0..100, 0 (not NaN) when unanswered
  distribution: ReportDistributionEntry[];
}

export interface ReportStanding {
  nickname: string;
  score: number;
  rank: number;
}

export interface SessionReport {
  session: {
    id: string;
    quizId: string;
    state: string;
    startedAt: string | null;
    endedAt: string | null;
    playerCount: number;
  };
  questions: ReportQuestionStat[];
  standings: ReportStanding[];
}

export const sessions = {
  // Host only (auth required). 400 {error:"quiz has no questions"} for empty quizzes.
  create: (quizId: string, language?: string) =>
    request<{ id: string; pin: string }>("/api/sessions", {
      method: "POST",
      body: language ? { quizId, language } : { quizId },
    }),
  // PUBLIC — players resolve a PIN to a session (no auth).
  byPin: (pin: string) => request<SessionByPin>(`/api/sessions/by-pin/${encodeURIComponent(pin)}`),
  // Host only — full snapshot.
  get: (id: string) => request<SessionDetail>(`/api/sessions/${id}`),
  // Host only — durable post-game report (works after Redis teardown).
  report: (id: string) => request<SessionReport>(`/api/sessions/${id}/report`),
};

// ---- Admin: groups (issue #4) ----
export interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  member_count: number;
}

export interface GroupMember {
  id: string;
  email: string;
  display_name: string | null;
  role_in_group: string | null;
  added_at: string;
}

// ---- Admin users ----
export const admin = {
  listUsers: () => request<{ users: AdminUser[] }>("/api/admin/users"),
  createUser: (body: { email: string; display_name?: string; role?: Role; password?: string }) =>
    request<{ user: AdminUser }>("/api/admin/users", { method: "POST", body }),
  updateUser: (id: string, body: { role?: Role; status?: Status; display_name?: string }) =>
    request<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", body }),

  // Groups (admin only).
  groups: {
    list: () => request<{ groups: Group[] }>("/api/admin/groups"),
    create: (body: { name: string; description?: string; color?: string }) =>
      request<{ group: Group }>("/api/admin/groups", { method: "POST", body }),
    remove: (id: string) =>
      request<{ ok: true }>(`/api/admin/groups/${id}`, { method: "DELETE" }),
    members: (id: string) =>
      request<{ members: GroupMember[] }>(`/api/admin/groups/${id}/members`),
    addMember: (id: string, body: { userId: string; roleInGroup?: string }) =>
      request<{ member: GroupMember }>(`/api/admin/groups/${id}/members`, { method: "POST", body }),
    removeMember: (id: string, userId: string) =>
      request<{ ok: true }>(`/api/admin/groups/${id}/members/${userId}`, { method: "DELETE" }),
  },
};

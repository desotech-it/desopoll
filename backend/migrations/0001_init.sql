-- desopoll initial schema (PostgreSQL 16)
-- Volatile live-game state lives in Redis; this is the durable model.

-- ── Users, roles, groups ────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'deleted')),
  ui_language   TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Case-insensitive unique email (a CITEXT extension could replace this later).
CREATE UNIQUE INDEX idx_users_email_lower ON users (lower(email));

CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  color       TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_group TEXT NOT NULL DEFAULT 'member' CHECK (role_in_group IN ('member', 'manager')),
  added_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- ── Quizzes & questions (polymorphic by type) ───────────────────────────────
CREATE TABLE quizzes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title              TEXT NOT NULL,
  description        TEXT,
  cover_image        JSONB,
  base_language      TEXT NOT NULL DEFAULT 'it',
  available_languages TEXT[] NOT NULL DEFAULT ARRAY['it'],
  is_public          BOOLEAN NOT NULL DEFAULT false,
  settings           JSONB NOT NULL DEFAULT '{}'::jsonb,
  transferred_from   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quizzes_owner ON quizzes(owner_id);

CREATE TABLE questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN (
                  'single_choice','multiple_choice','true_false','open_text',
                  'numeric','slider','ordering','poll','word_cloud')),
  prompt        TEXT NOT NULL,
  image         JSONB,
  time_limit_sec INTEGER NOT NULL DEFAULT 20,
  points_mode   TEXT NOT NULL DEFAULT 'standard' CHECK (points_mode IN ('standard','double','none')),
  speed_bonus   BOOLEAN NOT NULL DEFAULT true,
  -- type-specific config (options, correct answers, tolerances, accepted answers, ...)
  answer_spec   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, position)
);

-- ── Sharing (users or groups, increasing permission levels) ──────────────────
CREATE TABLE poll_shares (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('user','group')),
  subject_id   UUID NOT NULL,
  permission   TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view','play','edit','manage')),
  granted_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, subject_type, subject_id)
);
CREATE INDEX idx_poll_shares_subject ON poll_shares(subject_type, subject_id);

-- ── Content translations (EAV: add a language = INSERT rows, never ALTER) ─────
CREATE TABLE content_translations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('quiz','question','option')),
  entity_id   UUID NOT NULL,
  lang        TEXT NOT NULL,
  field       TEXT NOT NULL,
  value       TEXT NOT NULL,
  UNIQUE (entity_type, entity_id, lang, field)
);
CREATE INDEX idx_translations_entity ON content_translations(entity_type, entity_id, lang);

-- ── Live game sessions ───────────────────────────────────────────────────────
CREATE TABLE game_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE RESTRICT,
  host_id     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  pin         TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'it',
  state       TEXT NOT NULL DEFAULT 'lobby' CHECK (state IN (
                'lobby','question_intro','question_active','question_locked',
                'question_results','scoreboard','podium','ended','aborted')),
  current_question INTEGER,
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_sessions_active_pin ON game_sessions(pin) WHERE state NOT IN ('ended','aborted');

CREATE TABLE session_players (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  nickname   TEXT NOT NULL,
  language   TEXT,
  score      INTEGER NOT NULL DEFAULT 0,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, nickname)
);

CREATE TABLE answers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id      UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  player_id        UUID NOT NULL REFERENCES session_players(id) ON DELETE CASCADE,
  payload          JSONB NOT NULL,
  response_time_ms INTEGER,
  is_correct       BOOLEAN,
  partial_score    REAL,
  points_awarded   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id, player_id)
);

-- ── Audit log ────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

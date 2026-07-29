-- ============================================================
-- IncidentFlow — Database Initialization Script
-- This script runs automatically when the PostgreSQL Docker
-- container starts for the first time.
-- It is idempotent (safe to run multiple times).
-- ============================================================

-- ── 1. USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255)        NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT                NOT NULL,
  role          VARCHAR(50)         NOT NULL DEFAULT 'User',
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ── 2. TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(255)  NOT NULL,
  description      TEXT          NOT NULL DEFAULT '',
  severity         VARCHAR(50)   NOT NULL,
  category         VARCHAR(100)  NOT NULL,
  priority         INTEGER       NOT NULL DEFAULT 3,
  status           VARCHAR(50)   NOT NULL DEFAULT 'Open',
  created_by       INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  assigned_to      INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  sla_deadline     TIMESTAMPTZ,
  escalation_level INTEGER       NOT NULL DEFAULT 1,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 3. TICKET LOGS (Audit Trail) ────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_logs (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER      NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  action       VARCHAR(100) NOT NULL,
  performed_by INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 4. TICKET COMMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_comments (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment    TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id  INTEGER      REFERENCES tickets(id) ON DELETE CASCADE,
  type       VARCHAR(50)  NOT NULL,
  message    TEXT         NOT NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 6. PERFORMANCE INDEXES ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_status        ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to   ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by    ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at    ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket    ON ticket_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments       ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);

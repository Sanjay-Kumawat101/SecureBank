-- SecureBank Phase 1 schema
-- Run this against an empty database, e.g.:
--   psql "$DATABASE_URL" -f backend/db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  phone           TEXT,
  address         TEXT,
  session_version INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_number  VARCHAR(20) NOT NULL UNIQUE,
  account_type    TEXT NOT NULL DEFAULT 'Savings',
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- ---------------------------------------------------------------------
-- transactions
--
-- One row per transfer. sender_account_id / receiver_account_id are both
-- populated for an internal transfer between two SecureBank accounts.
-- `type` is recorded from the perspective of... nobody in particular --
-- the API derives credit/debit per-account at query time by comparing
-- the account id against sender_account_id / receiver_account_id, so the
-- same row is naturally a "debit" for the sender and a "credit" for the
-- receiver. The `type` column here is kept as a convenience label for the
-- canonical/initiating side (always 'debit', i.e. from the sender's point
-- of view) and is not otherwise relied upon by the API.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                  SERIAL PRIMARY KEY,
  sender_account_id   INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  receiver_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  amount              NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description         TEXT,
  type                TEXT NOT NULL DEFAULT 'debit' CHECK (type IN ('credit', 'debit')),
  status              TEXT NOT NULL DEFAULT 'completed',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ---------------------------------------------------------------------
-- session table for connect-pg-simple
--
-- This is the standard DDL documented by connect-pg-simple
-- (https://github.com/voxpelli/node-connect-pg-simple#table-schema).
-- connect-pg-simple can also auto-create this table at runtime if you
-- pass `createTableIfMissing: true`, but we create it explicitly here so
-- schema.sql is the single source of truth for the whole database.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    VARCHAR NOT NULL COLLATE "default",
  "sess"   JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
)
WITH (OIDS=FALSE);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- ---------------------------------------------------------------------
-- security_settings (Phase 2+)
--
-- Per-control ON/OFF state for the Security Center's "Secure Mode" vs
-- "Vulnerable Lab Mode" toggles (e.g. sqlInjection). Every control
-- defaults to TRUE (secure) the first time the server starts and inserts
-- a missing row -- see backend/security/securityConfig.js.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_settings (
  key         TEXT PRIMARY KEY,
  value       BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- security_logs (Phase 2+)
--
-- Security events raised by the vulnerability-demo lab (e.g. a detected
-- SQL injection attempt against /api/auth/login), shown on the Security
-- Dashboard's Attack Logs. See backend/security/securityLogger.js.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_logs (
  id          SERIAL PRIMARY KEY,
  type        TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'MEDIUM',
  endpoint    TEXT,
  status      TEXT NOT NULL,
  mode        TEXT,
  detail      TEXT,
  ip_address  TEXT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(type);

-- ---------------------------------------------------------------------
-- Demo / seed data
-- ---------------------------------------------------------------------
-- No fake users are hardcoded here on purpose (Phase 1 is meant to be
-- exercised through the real /api/auth/register flow so passwords are
-- always bcrypt-hashed by the application, never inserted in plaintext).
-- To try the app locally: register a user through the UI or via
--   curl -X POST http://localhost:4000/api/auth/register \
--     -H 'Content-Type: application/json' \
--     -d '{"name":"Demo User","email":"demo@example.com","password":"Password123!"}'
-- which will also auto-create their Savings account with a starting
-- balance of 10000.00 INR.

-- schema.sql — identity tables & columns, applied idempotently on every boot.
-- Safe to re-run: every statement is IF NOT EXISTS / NULL-only.

-- ── User directory ───────────────────────────────────────────────────────────
-- Single source of truth for who exists, what team they are on and what they
-- may see. Rows are created by scripts/sync-users.js (from Cognito) and, as a
-- safety net, auto-provisioned on first login by middleware/auth.js.
CREATE TABLE IF NOT EXISTS users (
  email       text PRIMARY KEY,
  name        text NOT NULL,
  role        text NOT NULL DEFAULT 'user',      -- super_admin | manager | user
  team        text NOT NULL DEFAULT 'Content',   -- Content | Creative | Admin
  color       text,                              -- avatar colour, optional
  is_business_owner boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Deliberately NOT unique: two people sharing a display name must not make one
-- of them unable to log in. Duplicates are reported by scripts/backfill-identity.js
-- so they can be renamed, and getUserByName() resolves them deterministically.
CREATE INDEX IF NOT EXISTS users_name_lower_idx ON users (lower(btrim(name)));

-- ── Tasks keyed to an identity, not a display string ─────────────────────────
-- `owner` / `business_owner` stay as display names so existing rows, grouping
-- and CSV export keep working. The *_email columns are the authoritative link.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_email          text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS business_owner_email text;

CREATE INDEX IF NOT EXISTS tasks_owner_email_idx ON tasks (owner_email);
CREATE INDEX IF NOT EXISTS tasks_team_idx        ON tasks (team);

-- ── Properties ───────────────────────────────────────────────────────────────
-- The brands/programmes work is tracked against. Previously a hardcoded array
-- in src/constants/index.js, with "custom" additions kept in each manager's
-- browser localStorage — so a property one manager added was invisible to
-- everyone else. Now shared, in one place, like everything else.
CREATE TABLE IF NOT EXISTS properties (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  team        text NOT NULL,                    -- Content | Creative
  color       text,
  sort_order  int  NOT NULL DEFAULT 1000,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- One property name per team (the same brand can exist for both teams).
CREATE UNIQUE INDEX IF NOT EXISTS properties_team_name_idx
  ON properties (team, lower(btrim(name)));

-- Migration number: 0006 	 2026-09-15T09:00:00.000Z

-- Rebuilds call_audits from 0005: its call_at CHECK used one 84-character
-- GLOB, and D1 refuses any GLOB pattern over 50 characters at query time
-- ("LIKE or GLOB pattern too complex"), so every INSERT failed. SQLite cannot
-- alter a CHECK, and the table never held a row, so drop and recreate.
DROP INDEX IF EXISTS idx_call_audits_user_call_at;
DROP INDEX IF EXISTS idx_call_audits_team_call_at;
DROP INDEX IF EXISTS idx_call_audits_period;
DROP TABLE IF EXISTS call_audits;

CREATE TABLE call_audits (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id integer NOT NULL REFERENCES users(id),
  team_id integer NOT NULL REFERENCES teams(id),
  audited_by integer NOT NULL REFERENCES users(id),
  -- 'YYYY-MM-DD HH:MM', local wall-clock time the call started.
  call_at text NOT NULL,
  duration_seconds integer NOT NULL,
  phone text NOT NULL,
  application_id text,
  period_start text NOT NULL,
  period_end text NOT NULL,
  rating_a text NOT NULL,
  rating_b text NOT NULL,
  rating_c text NOT NULL,
  rating_d text NOT NULL,
  rating_e text NOT NULL,
  rating_f text NOT NULL,
  rating_g text NOT NULL,
  rating_h text NOT NULL,
  reason_a text,
  reason_b text,
  reason_c text,
  reason_d text,
  reason_e text,
  reason_f text,
  reason_g text,
  reason_h text,
  overall_rating text NOT NULL DEFAULT 'meets_expectations',
  feedback text NOT NULL DEFAULT '',
  created_at text NOT NULL DEFAULT (datetime('now')),
  updated_at text NOT NULL DEFAULT (datetime('now')),
  -- Two short GLOBs rather than one: D1 rejects a GLOB pattern longer than
  -- 50 characters ("LIKE or GLOB pattern too complex").
  CONSTRAINT chk_call_audits_call_at_format CHECK (
    length(call_at) = 16
    AND substr(call_at, 1, 10) GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND substr(call_at, 11, 6) GLOB ' [0-9][0-9]:[0-9][0-9]'
  ),
  CONSTRAINT chk_call_audits_period_start_format
    CHECK (period_start GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT chk_call_audits_period_end_format
    CHECK (period_end GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CONSTRAINT chk_call_audits_period_order CHECK (period_start <= period_end),
  CONSTRAINT chk_call_audits_call_in_period
    CHECK (substr(call_at, 1, 10) BETWEEN period_start AND period_end),
  CONSTRAINT chk_call_audits_duration_non_negative CHECK (duration_seconds >= 0),
  CONSTRAINT chk_call_audits_rating_a CHECK (rating_a IN ('pass', 'fail', 'na')),
  CONSTRAINT chk_call_audits_rating_b CHECK (rating_b IN ('pass', 'fail', 'na')),
  CONSTRAINT chk_call_audits_rating_c CHECK (rating_c IN ('pass', 'fail', 'na')),
  CONSTRAINT chk_call_audits_rating_d CHECK (rating_d IN ('pass', 'fail', 'na')),
  CONSTRAINT chk_call_audits_rating_e CHECK (rating_e IN ('pass', 'fail', 'na')),
  CONSTRAINT chk_call_audits_rating_f CHECK (rating_f IN ('pass', 'fail', 'na')),
  CONSTRAINT chk_call_audits_rating_g CHECK (rating_g IN ('pass', 'fail', 'na')),
  CONSTRAINT chk_call_audits_rating_h CHECK (rating_h IN ('pass', 'fail', 'na')),
  CONSTRAINT chk_call_audits_overall_rating CHECK (
    overall_rating IN ('outstanding', 'exceeded_expectations', 'meets_expectations', 'needs_improvement')
  )
);
CREATE INDEX idx_call_audits_user_call_at ON call_audits (user_id, call_at);
CREATE INDEX idx_call_audits_team_call_at ON call_audits (team_id, call_at);
CREATE INDEX idx_call_audits_period ON call_audits (period_start, period_end);

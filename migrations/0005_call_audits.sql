-- Migration number: 0005 	 2026-09-14T18:00:00.000Z

-- Quality analysts (role 5, seeded in 0001) audit calls, nothing else: no
-- monthly/daily entries, no dashboards. Permissions: src/lib/auth/permissions.ts.

-- One row per AUDITED CALL. A quality analyst picks one of a counsellor's
-- calls every few days and scores it on eight fixed parameters (A-H, labels
-- in src/schemas/call-audit.ts). `period_start`/`period_end` is the date
-- window the call was picked from; windows may overlap freely and nothing is
-- unique -- the only rule is that the call falls inside its window.
--
-- AQS (%) is NOT stored: it is (pass + na) / 8 over the eight ratings and is
-- recomputed at read time (`computeAqs`), same as pending/%achieved on the
-- monthly table. `overall_rating` is the analyst's own judgement, not derived.
--
-- `team_id` snapshots the counsellor's team at audit time, like `admissions`.
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
  CONSTRAINT chk_call_audits_call_at_format
    CHECK (call_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]'),
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

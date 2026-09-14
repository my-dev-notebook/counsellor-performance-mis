-- Migration number: 0004 	 2026-09-14T12:00:00.000Z

-- Sheet imports (src/app/(app)/upload/actions.ts) write a month's `achieved`
-- straight into counsellor_perf_monthly from the workbook's own total, which
-- may legitimately disagree with COUNT(*) over `admissions`. The sheet total
-- wins for that month, so the row has to remember where its `achieved` came
-- from: finalize (src/db/queries/finalize.ts) only overwrites rows whose
-- source is still 'admissions', and the discrepancies screen lists every row
-- whose stored value differs from the live daily count.
--
--   'admissions' -- written by finalize from COUNT(*) (or NULL = live)
--   'import'     -- written by a workbook import; `import_id` says which
--   'manual'     -- typed in on the discrepancies screen
ALTER TABLE counsellor_perf_monthly
  ADD COLUMN achieved_source TEXT NOT NULL DEFAULT 'admissions'
  CHECK (achieved_source IN ('admissions', 'import', 'manual'));

-- One row per committed workbook import, so a number on the discrepancies
-- screen can be traced back to the file and the person who uploaded it.
CREATE TABLE imports (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  date text NOT NULL,
  source_file_name text NOT NULL,
  imported_by integer NOT NULL REFERENCES users(id),
  imported_at text NOT NULL DEFAULT (datetime('now')),
  rows_inserted integer NOT NULL DEFAULT 0,
  rows_updated integer NOT NULL DEFAULT 0,
  rows_skipped integer NOT NULL DEFAULT 0,
  users_created integer NOT NULL DEFAULT 0,
  -- JSON array of human-readable notes the operator saw and accepted
  -- (name/email differences, team snapshot rewrites, roster updates).
  notes text NOT NULL DEFAULT '[]',
  CONSTRAINT chk_imports_date_format CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]')
);
CREATE INDEX idx_imports_date ON imports (date);

ALTER TABLE counsellor_perf_monthly
  ADD COLUMN import_id integer REFERENCES imports(id);
CREATE INDEX idx_counsellor_perf_monthly_import ON counsellor_perf_monthly (import_id);

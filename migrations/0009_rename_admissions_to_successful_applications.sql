-- Migration number: 0009 	 2026-09-24T12:00:00.000Z

-- Terminology fix: what the app has been calling "admissions" are successful
-- applications -- the student paid for the application form, the first step
-- towards admission. Rename the table and the `achieved_source` value to match.
--
-- SQLite can neither rename a CHECK constraint nor change a CHECK's allowed
-- values, so both tables are rebuilt (create new, copy, drop old) rather than
-- ALTERed. Ids are copied as-is. No table has a foreign key pointing at either
-- one, but defer FK checks anyway so the copy/drop order can't trip them.
PRAGMA defer_foreign_keys = true;

-- admissions -> successful_applications ------------------------------------

CREATE TABLE `successful_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`agency_id` integer,
	`date` text NOT NULL,
	`application_number` text NOT NULL,
	`applicant_user_id` integer NOT NULL,
	`applicant_name` text NOT NULL,
	`form_id` integer NOT NULL,
	`form_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_successful_applications_date_format" CHECK("successful_applications"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "chk_successful_applications_applicant_user_id_positive" CHECK("successful_applications"."applicant_user_id" > 0),
	CONSTRAINT "chk_successful_applications_form_id_positive" CHECK("successful_applications"."form_id" > 0)
);

INSERT INTO successful_applications
  (id, user_id, team_id, agency_id, date, application_number, applicant_user_id, applicant_name, form_id, form_name, created_at, updated_at)
SELECT
   id, user_id, team_id, agency_id, date, application_number, applicant_user_id, applicant_name, form_id, form_name, created_at, updated_at
FROM admissions;

DROP TABLE admissions;

CREATE UNIQUE INDEX `successful_applications_application_number_unique` ON `successful_applications` (`application_number`);
CREATE INDEX `idx_successful_applications_user_date` ON `successful_applications` (`user_id`,`date`);
CREATE INDEX `idx_successful_applications_date` ON `successful_applications` (`date`);
CREATE INDEX `idx_successful_applications_team_date` ON `successful_applications` (`team_id`,`date`);
CREATE INDEX `idx_successful_applications_agency_date` ON `successful_applications` (`agency_id`,`date`);

-- counsellor_perf_monthly.achieved_source: 'admissions' -> 'successful_applications'

CREATE TABLE `counsellor_perf_monthly_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`agency_id` integer,
	`date` text NOT NULL,
	`overall` integer,
	`non_negotiable` integer,
	`achieved` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`achieved_source` text DEFAULT 'successful_applications' NOT NULL,
	`import_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_id`) REFERENCES `imports`(`id`) ON UPDATE no action ON DELETE no action,
	-- Unqualified column names: the table is renamed below.
	CONSTRAINT "chk_overall_non_negative" CHECK("overall" IS NULL OR "overall" >= 0),
	CONSTRAINT "chk_non_negotiable_non_negative" CHECK("non_negotiable" IS NULL OR "non_negotiable" >= 0),
	CONSTRAINT "chk_achieved_non_negative" CHECK("achieved" IS NULL OR "achieved" >= 0),
	CONSTRAINT "chk_achieved_source" CHECK("achieved_source" IN ('successful_applications', 'import', 'manual'))
);

INSERT INTO counsellor_perf_monthly_new
  (id, user_id, team_id, agency_id, date, overall, non_negotiable, achieved, created_at, updated_at, achieved_source, import_id)
SELECT
   id, user_id, team_id, agency_id, date, overall, non_negotiable, achieved, created_at, updated_at,
   CASE achieved_source WHEN 'admissions' THEN 'successful_applications' ELSE achieved_source END,
   import_id
FROM counsellor_perf_monthly;

DROP TABLE counsellor_perf_monthly;
ALTER TABLE counsellor_perf_monthly_new RENAME TO counsellor_perf_monthly;

CREATE UNIQUE INDEX `idx_counsellor_perf_monthly_user_date` ON `counsellor_perf_monthly` (`user_id`,`date`);
CREATE INDEX `idx_counsellor_perf_monthly_team_date` ON `counsellor_perf_monthly` (`team_id`,`date`);
CREATE INDEX `idx_counsellor_perf_monthly_import` ON `counsellor_perf_monthly` (`import_id`);

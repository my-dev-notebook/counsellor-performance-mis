CREATE TABLE `admissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` text NOT NULL,
	`application_number` text NOT NULL,
	`applicant_user_id` integer NOT NULL,
	`applicant_name` text NOT NULL,
	`form_id` integer NOT NULL,
	`form_name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_admissions_date_format" CHECK("admissions"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "chk_admissions_applicant_user_id_positive" CHECK("admissions"."applicant_user_id" > 0),
	CONSTRAINT "chk_admissions_form_id_positive" CHECK("admissions"."form_id" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admissions_application_number_unique` ON `admissions` (`application_number`);--> statement-breakpoint
CREATE INDEX `idx_admissions_user_date` ON `admissions` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `agencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_name_unique` ON `agencies` (`name`);--> statement-breakpoint
CREATE TABLE `counsellor_perf_monthly` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` text NOT NULL,
	`overall` integer,
	`non_negotiable` integer,
	`achieved` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_overall_non_negative" CHECK("counsellor_perf_monthly"."overall" IS NULL OR "counsellor_perf_monthly"."overall" >= 0),
	CONSTRAINT "chk_non_negotiable_non_negative" CHECK("counsellor_perf_monthly"."non_negotiable" IS NULL OR "counsellor_perf_monthly"."non_negotiable" >= 0),
	CONSTRAINT "chk_achieved_non_negative" CHECK("counsellor_perf_monthly"."achieved" IS NULL OR "counsellor_perf_monthly"."achieved" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_counsellor_perf_monthly_user_date` ON `counsellor_perf_monthly` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`meritto_user_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`agency_id` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	`person_id` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_one_active_per_person` ON `users` (`person_id`) WHERE "users"."is_active" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_one_active_per_meritto_id` ON `users` (`meritto_user_id`) WHERE "users"."is_active" = 1;
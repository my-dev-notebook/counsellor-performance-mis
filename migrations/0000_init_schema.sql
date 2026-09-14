CREATE TABLE `admissions` (
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
	CONSTRAINT "chk_admissions_date_format" CHECK("admissions"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "chk_admissions_applicant_user_id_positive" CHECK("admissions"."applicant_user_id" > 0),
	CONSTRAINT "chk_admissions_form_id_positive" CHECK("admissions"."form_id" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admissions_application_number_unique` ON `admissions` (`application_number`);--> statement-breakpoint
CREATE INDEX `idx_admissions_user_date` ON `admissions` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_admissions_date` ON `admissions` (`date`);--> statement-breakpoint
CREATE INDEX `idx_admissions_team_date` ON `admissions` (`team_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_admissions_agency_date` ON `admissions` (`agency_id`,`date`);--> statement-breakpoint
CREATE TABLE `agencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_name_unique` ON `agencies` (`name`);--> statement-breakpoint
CREATE TABLE `counsellor_perf_monthly` (
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_overall_non_negative" CHECK("counsellor_perf_monthly"."overall" IS NULL OR "counsellor_perf_monthly"."overall" >= 0),
	CONSTRAINT "chk_non_negotiable_non_negative" CHECK("counsellor_perf_monthly"."non_negotiable" IS NULL OR "counsellor_perf_monthly"."non_negotiable" >= 0),
	CONSTRAINT "chk_achieved_non_negative" CHECK("counsellor_perf_monthly"."achieved" IS NULL OR "counsellor_perf_monthly"."achieved" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_counsellor_perf_monthly_user_date` ON `counsellor_perf_monthly` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_counsellor_perf_monthly_team_date` ON `counsellor_perf_monthly` (`team_id`,`date`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE TABLE `user_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`field` text NOT NULL,
	`old_value` integer,
	`new_value` integer,
	`changed_by` integer,
	`changed_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_user_changes_field" CHECK("user_changes"."field" IN ('team_id', 'role_id', 'agency_id', 'is_active'))
);
--> statement-breakpoint
CREATE INDEX `idx_user_changes_user` ON `user_changes` (`user_id`,`changed_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`meritto_user_id` integer,
	`role_id` integer NOT NULL,
	`team_id` integer,
	`agency_id` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	`password_hash` text NOT NULL,
	`password_changed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_meritto_user_id_unique` ON `users` (`meritto_user_id`);--> statement-breakpoint
CREATE INDEX `idx_users_team` ON `users` (`team_id`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role_id`);
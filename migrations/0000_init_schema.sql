CREATE TABLE `agencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agencies_name_unique` ON `agencies` (`name`);--> statement-breakpoint
CREATE TABLE `counsellor_performance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`overall` integer,
	`non_negotiable` integer,
	`achieved` integer,
	`achieved_flagged` integer DEFAULT 0 NOT NULL,
	`acknowledgment` integer,
	`feedback` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_month_range" CHECK("counsellor_performance"."month" BETWEEN 1 AND 12),
	CONSTRAINT "chk_overall_non_negative" CHECK("counsellor_performance"."overall" IS NULL OR "counsellor_performance"."overall" >= 0),
	CONSTRAINT "chk_non_negotiable_non_negative" CHECK("counsellor_performance"."non_negotiable" IS NULL OR "counsellor_performance"."non_negotiable" >= 0),
	CONSTRAINT "chk_achieved_non_negative" CHECK("counsellor_performance"."achieved" IS NULL OR "counsellor_performance"."achieved" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_counsellor_performance_user_year_month` ON `counsellor_performance` (`user_id`,`year`,`month`);--> statement-breakpoint
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
	`doj` text,
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
CREATE UNIQUE INDEX `idx_users_one_active_per_person` ON `users` (`person_id`) WHERE "users"."is_active" = 1;
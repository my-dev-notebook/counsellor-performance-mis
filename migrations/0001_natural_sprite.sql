CREATE TABLE `counsellor_perf_daily` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_daily_count_non_negative" CHECK("counsellor_perf_daily"."count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_counsellor_perf_daily_user_date` ON `counsellor_perf_daily` (`user_id`,`date`);--> statement-breakpoint
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
DROP TABLE `counsellor_performance`;
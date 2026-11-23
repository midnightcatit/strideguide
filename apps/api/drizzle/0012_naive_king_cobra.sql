CREATE TABLE `health_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`date` text NOT NULL,
	`resting_hr` integer,
	`hrv_ms` real,
	`sleep_min` integer,
	`steps` integer,
	`raw` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `health_daily_user_provider_date_idx` ON `health_daily` (`user_id`,`provider`,`date`);--> statement-breakpoint
ALTER TABLE `connections` ADD `sync_requested_at` integer;
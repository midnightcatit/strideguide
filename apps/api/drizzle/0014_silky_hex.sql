CREATE TABLE `health_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`date` text NOT NULL,
	`metric` text NOT NULL,
	`value` real NOT NULL,
	`unit` text,
	`raw` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `health_metrics_user_provider_date_metric_idx` ON `health_metrics` (`user_id`,`provider`,`date`,`metric`);--> statement-breakpoint
CREATE INDEX `health_metrics_user_metric_date_idx` ON `health_metrics` (`user_id`,`metric`,`date`);--> statement-breakpoint
CREATE TABLE `health_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`metric` text NOT NULL,
	`sample_time` integer NOT NULL,
	`value` real NOT NULL,
	`unit` text,
	`raw` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `health_samples_user_provider_metric_time_idx` ON `health_samples` (`user_id`,`provider`,`metric`,`sample_time`);
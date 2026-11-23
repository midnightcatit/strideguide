CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`modality` text NOT NULL,
	`type` text,
	`started_at` integer NOT NULL,
	`duration_sec` integer,
	`distance_m` real,
	`avg_pace_sec_per_km` real,
	`avg_hr` integer,
	`max_hr` integer,
	`calories` integer,
	`source` text,
	`route` text,
	`raw` text,
	`session_id` text,
	`match_confidence` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions_plan`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_provider_external_idx` ON `activities` (`provider`,`external_id`);--> statement-breakpoint
CREATE INDEX `activities_user_started_idx` ON `activities` (`user_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text,
	`access_token_enc` text,
	`refresh_token_enc` text,
	`scopes` text,
	`token_expires_at` integer,
	`status` text DEFAULT 'connected' NOT NULL,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connections_user_provider_idx` ON `connections` (`user_id`,`provider`);
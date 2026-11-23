CREATE TABLE `client_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`kind` text NOT NULL,
	`message` text,
	`detail` text,
	`url` text,
	`user_agent` text,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `client_errors_created_idx` ON `client_errors` (`created_at`);
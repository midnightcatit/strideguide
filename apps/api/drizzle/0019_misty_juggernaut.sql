CREATE TABLE `admin_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`detail` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_actions_actor_idx` ON `admin_actions` (`actor_id`);--> statement-breakpoint
CREATE INDEX `admin_actions_created_idx` ON `admin_actions` (`created_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `invited_by` text;--> statement-breakpoint
ALTER TABLE `users` ADD `invited_at` integer;
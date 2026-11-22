CREATE TABLE `app_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`name` text,
	`message` text,
	`path` text,
	`method` text,
	`user_id` text,
	`request_id` text
);

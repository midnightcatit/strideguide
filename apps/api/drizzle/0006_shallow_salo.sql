CREATE TABLE `session_states` (
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`state` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`user_id`, `session_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

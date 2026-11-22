CREATE TABLE `ai_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`response` text,
	`model` text,
	`ttl` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`model_used` text,
	`tokens_in` integer,
	`tokens_out` integer,
	`latency_ms` integer,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_jobs_type_idx` ON `ai_jobs` (`type`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_idx` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`modality` text NOT NULL,
	`machine` text,
	`muscle_groups` text,
	`form_notes` text,
	`purpose` text,
	`why_full` text,
	`research_refs` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercises_name_idx` ON `exercises` (`name`);--> statement-breakpoint
CREATE TABLE `explanations` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`ref_id` text,
	`summary` text,
	`full` text,
	`citation_ids` text,
	`model` text,
	`kb_version` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `explanations_scope_ref_idx` ON `explanations` (`scope`,`ref_id`);--> statement-breakpoint
CREATE TABLE `goal_profiles` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`modality_mix` text,
	`progression_rules` text,
	`success_metrics` text,
	`required_inputs` text,
	`session_types` text,
	`built_in` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `knowledge_base_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`tier` text NOT NULL,
	`generated_at` integer,
	`refreshed_by` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`started_at` integer,
	`ended_at` integer,
	`run_stats` text,
	`strength_sets` text,
	`rpe` real,
	`notes` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `logs_user_idx` ON `logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `logs_session_idx` ON `logs` (`session_id`);--> statement-breakpoint
CREATE TABLE `nutrition_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`data` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `nutrition_logs_user_date_idx` ON `nutrition_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `plan_weeks` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`week_number` integer NOT NULL,
	`focus` text,
	`summary_text` text,
	`start_date` text,
	`end_date` text,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_weeks_plan_idx` ON `plan_weeks` (`plan_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_goal_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`generated_at` integer,
	`model` text,
	`params` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_goal_id`) REFERENCES `user_goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plans_user_goal_idx` ON `plans` (`user_goal_id`);--> statement-breakpoint
CREATE TABLE `recovery_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`data` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recovery_logs_user_date_idx` ON `recovery_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `research_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`authors` text,
	`year` integer,
	`venue` text,
	`type` text,
	`doi_url` text,
	`retrieved_at` integer
);
--> statement-breakpoint
CREATE INDEX `research_sources_doi_idx` ON `research_sources` (`doi_url`);--> statement-breakpoint
CREATE TABLE `sessions_plan` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_week_id` text NOT NULL,
	`day` integer NOT NULL,
	`slot` text,
	`modality` text NOT NULL,
	`type` text NOT NULL,
	`title` text,
	`prescription` text,
	`duration_min` integer,
	`explanation_id` text,
	FOREIGN KEY (`plan_week_id`) REFERENCES `plan_weeks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_plan_week_idx` ON `sessions_plan` (`plan_week_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`prefs` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`viewer_user_id` text NOT NULL,
	`scope` text DEFAULT 'all' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`viewer_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shares_owner_idx` ON `shares` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `shares_viewer_idx` ON `shares` (`viewer_user_id`);--> statement-breakpoint
CREATE TABLE `sleep_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`data` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sleep_logs_user_date_idx` ON `sleep_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `user_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`goal_profile_slug` text NOT NULL,
	`target_date` text,
	`baseline` text,
	`available_days` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_goals_user_idx` ON `user_goals` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`google_sub` text,
	`name` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_sub_idx` ON `users` (`google_sub`);
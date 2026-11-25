CREATE INDEX `health_metrics_user_date_idx` ON `health_metrics` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `health_samples_user_time_idx` ON `health_samples` (`user_id`,`sample_time`);
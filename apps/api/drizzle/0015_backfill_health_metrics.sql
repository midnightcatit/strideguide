-- Backfill the generic metrics store from the legacy daily table, once, so a
-- runner whose history was written before health_metrics existed still sees it
-- in the unified store. Additive and idempotent: the legacy table is left in
-- place and an existing metric row is never overwritten, so re-running copies
-- nothing twice.
INSERT INTO `health_metrics` (`id`, `user_id`, `provider`, `date`, `metric`, `value`, `unit`, `raw`, `created_at`)
SELECT lower(hex(randomblob(16))), `user_id`, `provider`, `date`, 'resting_hr', `resting_hr`, NULL, NULL, unixepoch()
FROM `health_daily`
WHERE `resting_hr` IS NOT NULL
ON CONFLICT (`user_id`, `provider`, `date`, `metric`) DO NOTHING;--> statement-breakpoint
INSERT INTO `health_metrics` (`id`, `user_id`, `provider`, `date`, `metric`, `value`, `unit`, `raw`, `created_at`)
SELECT lower(hex(randomblob(16))), `user_id`, `provider`, `date`, 'hrv_ms', `hrv_ms`, NULL, NULL, unixepoch()
FROM `health_daily`
WHERE `hrv_ms` IS NOT NULL
ON CONFLICT (`user_id`, `provider`, `date`, `metric`) DO NOTHING;--> statement-breakpoint
INSERT INTO `health_metrics` (`id`, `user_id`, `provider`, `date`, `metric`, `value`, `unit`, `raw`, `created_at`)
SELECT lower(hex(randomblob(16))), `user_id`, `provider`, `date`, 'sleep_min', `sleep_min`, NULL, NULL, unixepoch()
FROM `health_daily`
WHERE `sleep_min` IS NOT NULL
ON CONFLICT (`user_id`, `provider`, `date`, `metric`) DO NOTHING;--> statement-breakpoint
INSERT INTO `health_metrics` (`id`, `user_id`, `provider`, `date`, `metric`, `value`, `unit`, `raw`, `created_at`)
SELECT lower(hex(randomblob(16))), `user_id`, `provider`, `date`, 'steps', `steps`, NULL, NULL, unixepoch()
FROM `health_daily`
WHERE `steps` IS NOT NULL
ON CONFLICT (`user_id`, `provider`, `date`, `metric`) DO NOTHING;

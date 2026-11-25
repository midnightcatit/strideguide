-- Backfill the long-form store from the legacy daily table, once.
--
-- The connected-health sync wrote only `health_daily` before the generic store
-- existed, so that history never reached `health_metrics` and the dashboard read
-- nothing while recovery (which falls back to `health_daily`) still showed it.
-- This copies the four legacy columns across, one metric row per day, so the
-- store becomes the single source for every surface. It is additive and
-- idempotent: `health_daily` is left in place, and a row the store already has
-- (from a sync) wins, so a re-run changes nothing.
INSERT INTO `health_metrics` (`id`, `user_id`, `provider`, `date`, `metric`, `value`, `unit`, `raw`)
SELECT 'hdb:' || `user_id` || ':' || `date` || ':resting_hr', `user_id`, `provider`, `date`, 'resting_hr', `resting_hr`, NULL, NULL
FROM `health_daily`
WHERE `resting_hr` IS NOT NULL
ON CONFLICT (`user_id`, `provider`, `date`, `metric`) DO NOTHING;--> statement-breakpoint
INSERT INTO `health_metrics` (`id`, `user_id`, `provider`, `date`, `metric`, `value`, `unit`, `raw`)
SELECT 'hdb:' || `user_id` || ':' || `date` || ':hrv_ms', `user_id`, `provider`, `date`, 'hrv_ms', `hrv_ms`, NULL, NULL
FROM `health_daily`
WHERE `hrv_ms` IS NOT NULL
ON CONFLICT (`user_id`, `provider`, `date`, `metric`) DO NOTHING;--> statement-breakpoint
INSERT INTO `health_metrics` (`id`, `user_id`, `provider`, `date`, `metric`, `value`, `unit`, `raw`)
SELECT 'hdb:' || `user_id` || ':' || `date` || ':sleep_min', `user_id`, `provider`, `date`, 'sleep_min', `sleep_min`, NULL, NULL
FROM `health_daily`
WHERE `sleep_min` IS NOT NULL
ON CONFLICT (`user_id`, `provider`, `date`, `metric`) DO NOTHING;--> statement-breakpoint
INSERT INTO `health_metrics` (`id`, `user_id`, `provider`, `date`, `metric`, `value`, `unit`, `raw`)
SELECT 'hdb:' || `user_id` || ':' || `date` || ':steps', `user_id`, `provider`, `date`, 'steps', `steps`, NULL, NULL
FROM `health_daily`
WHERE `steps` IS NOT NULL
ON CONFLICT (`user_id`, `provider`, `date`, `metric`) DO NOTHING;

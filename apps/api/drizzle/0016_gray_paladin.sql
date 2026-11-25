CREATE INDEX `logs_user_started_idx` ON `logs` (`user_id`,`started_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `plan_weeks_plan_week_idx` ON `plan_weeks` (`plan_id`,`week_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `shares_owner_viewer_idx` ON `shares` (`owner_user_id`,`viewer_user_id`);--> statement-breakpoint
CREATE TRIGGER `user_goals_profile_exists_insert`
BEFORE INSERT ON `user_goals`
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM `goal_profiles` WHERE `slug` = NEW.`goal_profile_slug`)
BEGIN
	SELECT RAISE(ABORT, 'unknown goal profile');
END;--> statement-breakpoint
CREATE TRIGGER `user_goals_profile_exists_update`
BEFORE UPDATE OF `goal_profile_slug` ON `user_goals`
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM `goal_profiles` WHERE `slug` = NEW.`goal_profile_slug`)
BEGIN
	SELECT RAISE(ABORT, 'unknown goal profile');
END;

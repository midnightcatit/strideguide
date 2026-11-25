import { GOAL_PROFILES } from '@strideguide/shared';
import { schema } from '../db';
import type { Db } from '../db';

/**
 * The built-in goal profiles as rows for the `goal_profiles` reference table.
 * The profiles are code data, so this mapping is the one place that mirrors the
 * catalogue into the table the `user_goals` guard checks against.
 */
export function goalProfileRows() {
	return GOAL_PROFILES.map((profile) => ({
		slug: profile.slug,
		name: profile.name,
		description: profile.description,
		modalityMix: profile.modalityMix,
		progressionRules: profile.progressionRules,
		successMetrics: profile.successMetrics,
		requiredInputs: profile.requiredInputs,
		sessionTypes: profile.sessionTypes,
		builtIn: true,
	}));
}

/**
 * Keep the `goal_profiles` reference table in step with the code catalogue.
 *
 * Migration 0016 guards `user_goals.goal_profile_slug` with a trigger that
 * aborts the insert when the slug is not in `goal_profiles`. That table holds no
 * user data and nothing else seeds it, so after a wipe it is empty and every
 * goal insert fails, which blocks plan generation. Re-seeding it here, from the
 * same catalogue the engine builds from, means the guard can never reject a
 * profile the app actually offers, and a new profile needs no migration.
 * Idempotent: an existing row is left alone.
 */
export async function syncGoalProfiles(db: Db): Promise<void> {
	await db.insert(schema.goalProfiles).values(goalProfileRows()).onConflictDoNothing();
}

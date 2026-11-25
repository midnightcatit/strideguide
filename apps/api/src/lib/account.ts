import { eq, inArray, like, or, sql } from 'drizzle-orm';
import { schema } from '../db';
import type { Db } from '../db';

/** A delete for one table, always scoped to a single user id. */
export type AccountDeleteRunner = (db: Db, userId: string) => Promise<unknown>;

/**
 * Every table that holds rows owned by a user, children before parents, so an
 * account delete leaves nothing behind even when foreign keys are not enforced.
 * Keys are table names, and insertion order is the delete order, with the users
 * row last. Shares count on either side: the user owns the row as owner or viewer.
 */
export const ACCOUNT_DELETES: Record<string, AccountDeleteRunner> = {
	// The plan tree, deepest first: sessions_plan, plan_weeks, plans, user_goals.
	sessions_plan: (db, userId) =>
		db.delete(schema.sessionsPlan).where(
			inArray(
				schema.sessionsPlan.planWeekId,
				db
					.select({ id: schema.planWeeks.id })
					.from(schema.planWeeks)
					.where(
						inArray(
							schema.planWeeks.planId,
							db
								.select({ id: schema.plans.id })
								.from(schema.plans)
								.where(
									inArray(
										schema.plans.userGoalId,
										db
											.select({ id: schema.userGoals.id })
											.from(schema.userGoals)
											.where(eq(schema.userGoals.userId, userId)),
									),
								),
						),
					),
			),
		),
	plan_weeks: (db, userId) =>
		db.delete(schema.planWeeks).where(
			inArray(
				schema.planWeeks.planId,
				db
					.select({ id: schema.plans.id })
					.from(schema.plans)
					.where(
						inArray(
							schema.plans.userGoalId,
							db
								.select({ id: schema.userGoals.id })
								.from(schema.userGoals)
								.where(eq(schema.userGoals.userId, userId)),
						),
					),
			),
		),
	plans: (db, userId) =>
		db.delete(schema.plans).where(
			inArray(
				schema.plans.userGoalId,
				db
					.select({ id: schema.userGoals.id })
					.from(schema.userGoals)
					.where(eq(schema.userGoals.userId, userId)),
			),
		),
	user_goals: (db, userId) =>
		db.delete(schema.userGoals).where(eq(schema.userGoals.userId, userId)),

	// Everything else the user owns.
	activities: (db, userId) =>
		db.delete(schema.activities).where(eq(schema.activities.userId, userId)),
	logs: (db, userId) => db.delete(schema.logs).where(eq(schema.logs.userId, userId)),
	summaries: (db, userId) => db.delete(schema.summaries).where(eq(schema.summaries.userId, userId)),
	settings: (db, userId) => db.delete(schema.settings).where(eq(schema.settings.userId, userId)),
	shares: (db, userId) =>
		db
			.delete(schema.shares)
			.where(or(eq(schema.shares.ownerUserId, userId), eq(schema.shares.viewerUserId, userId))),
	nutrition_logs: (db, userId) =>
		db.delete(schema.nutritionLogs).where(eq(schema.nutritionLogs.userId, userId)),
	sleep_logs: (db, userId) => db.delete(schema.sleepLogs).where(eq(schema.sleepLogs.userId, userId)),
	recovery_logs: (db, userId) =>
		db.delete(schema.recoveryLogs).where(eq(schema.recoveryLogs.userId, userId)),
	health_metrics: (db, userId) =>
		db.delete(schema.healthMetrics).where(eq(schema.healthMetrics.userId, userId)),
	health_samples: (db, userId) =>
		db.delete(schema.healthSamples).where(eq(schema.healthSamples.userId, userId)),
	health_daily: (db, userId) =>
		db.delete(schema.healthDaily).where(eq(schema.healthDaily.userId, userId)),
	session_states: (db, userId) =>
		db.delete(schema.sessionStates).where(eq(schema.sessionStates.userId, userId)),
	// Cached manual-sync results are keyed by connection id, which is not a user
	// column. Clear them here, before the connections rows go away and their ids
	// are no longer discoverable.
	ai_cache: (db, userId) =>
		db.delete(schema.aiCache).where(
			inArray(
				schema.aiCache.cacheKey,
				db
					.select({ cacheKey: sql<string>`'connection-sync:' || ${schema.connections.id}` })
					.from(schema.connections)
					.where(eq(schema.connections.userId, userId)),
			),
		),
	connections: (db, userId) =>
		db.delete(schema.connections).where(eq(schema.connections.userId, userId)),
	auth_sessions: (db, userId) =>
		db.delete(schema.authSessions).where(eq(schema.authSessions.userId, userId)),
	app_errors: (db, userId) => db.delete(schema.appErrors).where(eq(schema.appErrors.userId, userId)),
	client_errors: (db, userId) =>
		db.delete(schema.clientErrors).where(eq(schema.clientErrors.userId, userId)),
	// Rate-limit rows are keyed `<prefix>:<id>`, and the user-scoped prefixes embed
	// the user id at the end. IP-keyed rows (auth, clienterr) do not match and stay.
	rate_limits: (db, userId) =>
		db.delete(schema.rateLimits).where(like(schema.rateLimits.key, `%:${userId}`)),

	// The account itself, always last.
	users: (db, userId) => db.delete(schema.users).where(eq(schema.users.id, userId)),
};

/**
 * Delete every row the user owns, then the users row, one table at a time. Each
 * step is best effort so one failing table cannot 500 the request; the names of
 * the tables that failed are returned for logging.
 */
export async function deleteUserAccount(db: Db, userId: string): Promise<{ failed: string[] }> {
	const failed: string[] = [];
	for (const [table, run] of Object.entries(ACCOUNT_DELETES)) {
		try {
			await run(db, userId);
		} catch {
			failed.push(table);
			console.error('account_delete_step_failed', { table });
		}
	}
	return { failed };
}

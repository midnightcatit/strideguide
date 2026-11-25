import { and, eq, inArray } from 'drizzle-orm';
import { activityToRunStats } from '@strideguide/shared/plan';
import { schema } from '../db';
import type { Db } from '../db';

type ActivityRow = typeof schema.activities.$inferSelect;
type LogRow = typeof schema.logs.$inferSelect;

/** The deterministic log id for an imported activity, so a re-read never doubles it. */
function logIdFor(activityId: string): string {
	return `import-${activityId}`;
}

/**
 * Write the standalone import log for each imported activity that does not
 * already have one. The log has no session, so the activity counts in Progress
 * and the streak like any logged workout without ever touching a planned
 * session, and its date is the activity's own start, so it falls on the right
 * day. The log id is derived from the activity id, so a later read is a no-op.
 * An activity the old matcher already tied to a session is left alone.
 *
 * Returns the logs for these activities, existing and new, so the caller can
 * hand them to the client without a second full plan read.
 */
export async function ensureActivityLogs(
	db: Db,
	userId: string,
	activities: ActivityRow[],
): Promise<LogRow[]> {
	const standalone = activities.filter((a) => !a.sessionId);
	if (!standalone.length) return [];

	const ids = standalone.map((a) => logIdFor(a.id));
	const existing = await db
		.select({ id: schema.logs.id })
		.from(schema.logs)
		.where(and(eq(schema.logs.userId, userId), inArray(schema.logs.id, ids)));
	const have = new Set(existing.map((row) => row.id));

	const missing = standalone.filter((a) => !have.has(logIdFor(a.id)));
	if (missing.length) {
		await db
			.insert(schema.logs)
			.values(
				missing.map((activity) => {
					const stats = activityToRunStats({
						modality: activity.modality,
						startedAt: activity.startedAt.toISOString(),
						durationSec: activity.durationSec,
						distanceM: activity.distanceM,
						avgPaceSecPerKm: activity.avgPaceSecPerKm,
						avgHr: activity.avgHr,
					});
					const endedAt =
						activity.durationSec != null
							? new Date(activity.startedAt.getTime() + activity.durationSec * 1000)
							: null;
					return {
						id: logIdFor(activity.id),
						userId,
						sessionId: null,
						startedAt: activity.startedAt,
						endedAt,
						createdAt: activity.startedAt,
						runStats: Object.keys(stats).length ? stats : null,
						strengthSets: null,
						source: 'import' as const,
					};
				}),
			)
			.onConflictDoNothing();
	}

	// The logs for these activities, existing and new, so the caller can hand the
	// new ones to the client and they count in Progress and the streak right away.
	// One bound parameter per id, and the activities list is already capped, so
	// this stays inside D1's cap.
	return db
		.select()
		.from(schema.logs)
		.where(and(eq(schema.logs.userId, userId), inArray(schema.logs.id, ids)));
}

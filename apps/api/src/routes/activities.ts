import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { schema } from '../db';
import type { AppBindings } from '../types';
import { ensureActivityLogs } from '../lib/activities';

/**
 * Imported activities from a connected health provider.
 *
 * Each activity is a completed workout in its own right. Listing writes a
 * standalone import log for any activity that does not already have one, so the
 * work counts in Progress and the streak exactly like a logged session. An
 * activity is never matched to, or applied against, a planned session: the plan
 * stays as written.
 */
const activities = new Hono<AppBindings>();

type ActivityRow = typeof schema.activities.$inferSelect;

function rowOut(row: ActivityRow) {
	return {
		id: row.id,
		provider: row.provider,
		modality: row.modality,
		type: row.type,
		startedAt: row.startedAt,
		durationSec: row.durationSec,
		distanceM: row.distanceM,
		avgPaceSecPerKm: row.avgPaceSecPerKm,
		avgHr: row.avgHr,
	};
}

activities.get('/', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');

	const rows = await db
		.select()
		.from(schema.activities)
		.where(eq(schema.activities.userId, user.id))
		.orderBy(desc(schema.activities.startedAt))
		.limit(60);

	await ensureActivityLogs(db, user.id, rows);

	return c.json({ activities: rows.map(rowOut) });
});

export default activities;

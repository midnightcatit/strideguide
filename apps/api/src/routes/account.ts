import { Hono } from 'hono';
import { eq, or } from 'drizzle-orm';
import { schema } from '../db';
import type { AppBindings } from '../types';

const account = new Hono<AppBindings>();

/**
 * Clear all of the user's data (plans, logs, settings, shares). The account and
 * session are kept, so the app returns to onboarding rather than logging out.
 */
account.delete('/data', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');

	await db.delete(schema.logs).where(eq(schema.logs.userId, user.id));
	await db.delete(schema.summaries).where(eq(schema.summaries.userId, user.id));
	await db.delete(schema.settings).where(eq(schema.settings.userId, user.id));
	await db
		.delete(schema.shares)
		.where(or(eq(schema.shares.ownerUserId, user.id), eq(schema.shares.viewerUserId, user.id)));
	await db.delete(schema.nutritionLogs).where(eq(schema.nutritionLogs.userId, user.id));
	await db.delete(schema.sleepLogs).where(eq(schema.sleepLogs.userId, user.id));
	await db.delete(schema.recoveryLogs).where(eq(schema.recoveryLogs.userId, user.id));
	// user_goals cascades to plans -> plan_weeks -> sessions_plan
	await db.delete(schema.userGoals).where(eq(schema.userGoals.userId, user.id));

	return c.json({ ok: true });
});

export default account;

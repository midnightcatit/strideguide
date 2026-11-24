import { Hono } from 'hono';
import { eq, or } from 'drizzle-orm';
import { schema } from '../db';
import type { AppBindings } from '../types';

const account = new Hono<AppBindings>();

/**
 * Clear all of the user's data (plans, logs, settings, shares). The account and
 * session are kept, so the app returns to onboarding rather than logging out.
 * Each step is best-effort so one failing table cannot 500 the whole request.
 */
account.delete('/data', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');

	const steps: [string, () => Promise<unknown>][] = [
		['logs', () => db.delete(schema.logs).where(eq(schema.logs.userId, user.id))],
		['summaries', () => db.delete(schema.summaries).where(eq(schema.summaries.userId, user.id))],
		['settings', () => db.delete(schema.settings).where(eq(schema.settings.userId, user.id))],
		[
			'shares',
			() =>
				db
					.delete(schema.shares)
					.where(or(eq(schema.shares.ownerUserId, user.id), eq(schema.shares.viewerUserId, user.id))),
		],
		['nutrition_logs', () => db.delete(schema.nutritionLogs).where(eq(schema.nutritionLogs.userId, user.id))],
		['sleep_logs', () => db.delete(schema.sleepLogs).where(eq(schema.sleepLogs.userId, user.id))],
		['recovery_logs', () => db.delete(schema.recoveryLogs).where(eq(schema.recoveryLogs.userId, user.id))],
		['health_metrics', () => db.delete(schema.healthMetrics).where(eq(schema.healthMetrics.userId, user.id))],
		['health_samples', () => db.delete(schema.healthSamples).where(eq(schema.healthSamples.userId, user.id))],
		// user_goals cascades to plans -> plan_weeks -> sessions_plan
		['goals', () => db.delete(schema.userGoals).where(eq(schema.userGoals.userId, user.id))],
	];

	for (const [name, run] of steps) {
		try {
			await run();
		} catch {
			console.error('clear_data_step_failed', { step: name });
		}
	}

	return c.json({ ok: true });
});

export default account;

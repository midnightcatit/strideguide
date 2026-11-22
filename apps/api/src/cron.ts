import { eq } from 'drizzle-orm';
import { getDb, schema } from './db';
import type { Env } from './env';

/**
 * Cron handlers (PLAN.md section 6.3).
 *  0 7 * * *  — nightly: narrative summaries + adaptive evaluation
 *  0 8 * * 1  — weekly: plan review / regenerate what changed
 * Actual generation lands in M4; this is the wired skeleton.
 */
export async function handleScheduled(
	event: ScheduledController,
	env: Env,
	ctx: ExecutionContext,
): Promise<void> {
	const db = getDb(env);
	ctx.waitUntil(
		(async () => {
			const jobType = event.cron === '0 8 * * 1' ? 'weekly_review' : 'nightly_summary';
			await db.insert(schema.aiJobs).values({
				id: crypto.randomUUID(),
				type: jobType,
				status: 'pending',
			});
			// TODO(M4): generate summaries / adjustments and mark the job ok/error.
		})(),
	);
}

/** Manual "refresh now" hook reused by an admin route in M4. */
export async function triggerRefresh(env: Env, tier: string): Promise<void> {
	const db = getDb(env);
	await db
		.insert(schema.knowledgeBaseVersions)
		.values({ id: crypto.randomUUID(), tier, refreshedBy: 'manual', generatedAt: new Date() });
	await db
		.select()
		.from(schema.knowledgeBaseVersions)
		.where(eq(schema.knowledgeBaseVersions.tier, tier))
		.limit(1);
}

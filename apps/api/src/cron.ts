import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from './db';
import type { Env } from './env';
import { runAi } from './lib/ai';

/**
 * Cron handlers (PLAN.md §6.3).
 *  0 7 * * *  nightly note
 *  0 8 * * 1  weekly review
 * Best-effort AI text with a deterministic fallback; always stored so it can be shown.
 */
export async function handleScheduled(
	event: ScheduledController,
	env: Env,
	ctx: ExecutionContext,
): Promise<void> {
	const kind = event.cron === '0 8 * * 1' ? 'weekly' : 'nightly';
	ctx.waitUntil(runSummary(env, kind));
}

async function runSummary(env: Env, kind: 'nightly' | 'weekly'): Promise<void> {
	const db = getDb(env);

	const users = await db
		.selectDistinct({ userId: schema.userGoals.userId })
		.from(schema.userGoals)
		.where(eq(schema.userGoals.status, 'active'));

	for (const { userId } of users) {
		try {
			const logs = await db
				.select()
				.from(schema.logs)
				.where(eq(schema.logs.userId, userId))
				.orderBy(desc(schema.logs.createdAt))
				.limit(7);
			const done = logs.length;
			const km =
				Math.round(
					logs.reduce((sum, l) => sum + ((l.runStats as { distanceKm?: number } | null)?.distanceKm ?? 0), 0) * 10,
				) / 10;

			let body =
				kind === 'weekly'
					? `You logged ${done} session${done === 1 ? '' : 's'} this week. Keep the easy days easy and the quality sessions honest.`
					: done
						? `${done} session${done === 1 ? '' : 's'} logged recently. Check tomorrow's plan and keep the routine.`
						: 'Nothing logged yet. Start with today\u2019s session.';

			try {
				const res = await runAi(
					env,
					[
						{
							role: 'system',
							content:
								'You are Stride Guide, a concise running coach. Write one or two plain sentences. No em dashes, no markdown, no distances or units. Avoid hype and hedging; be specific.',
						},
						{
							role: 'user',
							content: `Write a short ${kind} note for a runner with ${done} sessions logged in the last week.`,
						},
					],
					{ maxTokens: 140 },
				);
				if (res.text.trim()) body = res.text.trim();
			} catch {
				// keep the deterministic fallback
			}

			await db.insert(schema.summaries).values({
				id: crypto.randomUUID(),
				userId,
				kind,
				body,
			});
			await db.insert(schema.aiJobs).values({
				id: crypto.randomUUID(),
				type: `${kind}_summary`,
				status: 'ok',
				latencyMs: 0,
			});
		} catch {
			// skip this user; a later run will retry
		}
	}
}

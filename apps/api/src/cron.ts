import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from './db';
import type { Env } from './env';
import { runAi } from './lib/ai';
import { sanitizeText, WRITING_RULES } from '@strideguide/shared/writing';

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
	ctx.waitUntil(enqueueConnectionSyncs(env));
}

/**
 * Health connector sync fan-out. A scheduled job only enqueues work; it never
 * calls a provider inline. This is a deliberate no-op for now so the foundation
 * ships without live provider fetching. When the fetchers land, the loop body
 * enqueues one sync per connected row (a queue message or a job row).
 */
async function enqueueConnectionSyncs(env: Env): Promise<void> {
	const db = getDb(env);
	const rows = await db
		.select({ id: schema.connections.id })
		.from(schema.connections)
		.where(eq(schema.connections.status, 'connected'));
	for (const _row of rows) {
		// TODO(connectors): enqueue a sync job for this connection.
	}
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
							content: `${WRITING_RULES}

You are Stride Guide. Write one or two plain sentences as a short training note. Do not mention distances or units.`,
						},
						{
							role: 'user',
							content: `Write a short ${kind} note for a runner with ${done} sessions logged in the last week.`,
						},
					],
					{ maxTokens: 140 },
				);
				if (res.text.trim()) body = sanitizeText(res.text);
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

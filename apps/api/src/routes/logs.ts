import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { desc, and, eq, inArray } from 'drizzle-orm';
import { importLogsSupersededByManual } from '@strideguide/shared/plan';
import { schema } from '../db';
import type { AppBindings } from '../types';

const logs = new Hono<AppBindings>();

logs.get('/', async (c) => {
	const user = c.get('user')!;
	const rows = await c
		.get('db')
		.select()
		.from(schema.logs)
		.where(eq(schema.logs.userId, user.id))
		.orderBy(desc(schema.logs.createdAt))
		.limit(100);
	return c.json({ logs: rows });
});

logs.post(
	'/',
	zValidator(
		'json',
		z.object({
			sessionId: z.string().optional(),
			startedAt: z.string().optional(),
			endedAt: z.string().optional(),
			runStats: z
				.object({
					distanceKm: z.number().nonnegative().optional(),
					durationSec: z.number().nonnegative().optional(),
					avgHr: z.number().nonnegative().optional(),
					avgPaceSecPerKm: z.number().nonnegative().optional(),
				})
				.optional(),
			strengthSets: z
				.array(
					z.object({
						machine: z.string(),
						sets: z.array(
							z.object({ reps: z.number().nonnegative(), weightKg: z.number().nonnegative() }),
						),
					}),
				)
				.optional(),
			rpe: z.number().min(1).max(10).nullable().optional(),
			feedback: z.enum(['up', 'down']).nullable().optional(),
			notes: z.string().max(2000).optional(),
			source: z.enum(['manual', 'device', 'import']).default('manual'),
		}),
		(result, c) => {
			if (!result.success) {
				return c.json(
					{ error: 'invalid_input', message: 'Some of the details did not look right. Check the form and try again.' },
					400,
				);
			}
		},
	),
	async (c) => {
		const user = c.get('user')!;
		const body = c.req.valid('json');

		// A log may only be attached to the caller's own session.
		if (body.sessionId) {
			const owned = await c
				.get('db')
				.select({ id: schema.sessionsPlan.id })
				.from(schema.sessionsPlan)
				.innerJoin(schema.planWeeks, eq(schema.sessionsPlan.planWeekId, schema.planWeeks.id))
				.innerJoin(schema.plans, eq(schema.planWeeks.planId, schema.plans.id))
				.innerJoin(schema.userGoals, eq(schema.plans.userGoalId, schema.userGoals.id))
				.where(and(eq(schema.sessionsPlan.id, body.sessionId), eq(schema.userGoals.userId, user.id)))
				.limit(1);
			if (!owned[0]) return c.json({ error: 'unknown_session' }, 400);

			// One log per session: a manual entry replaces any import that had
			// already closed the session, so the same work is never counted twice.
			if (body.source !== 'import') {
				const existing = await c
					.get('db')
					.select({ id: schema.logs.id, source: schema.logs.source })
					.from(schema.logs)
					.where(and(eq(schema.logs.userId, user.id), eq(schema.logs.sessionId, body.sessionId)));
				const superseded = importLogsSupersededByManual(existing);
				if (superseded.length) {
					await c.get('db').delete(schema.logs).where(inArray(schema.logs.id, superseded));
				}
			}
		}

		const inserted = await c
			.get('db')
			.insert(schema.logs)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				sessionId: body.sessionId ?? null,
				startedAt: body.startedAt ? new Date(body.startedAt) : null,
				endedAt: body.endedAt ? new Date(body.endedAt) : null,
				runStats: body.runStats ?? null,
				strengthSets: body.strengthSets ?? null,
				rpe: body.rpe ?? null,
				feedback: body.feedback ?? null,
				notes: body.notes ?? null,
				source: body.source,
			})
			.returning();
		return c.json({ log: inserted[0] }, 201);
	},
);

export default logs;

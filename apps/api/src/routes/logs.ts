import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
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
			rpe: z.number().min(1).max(10).optional(),
			notes: z.string().max(2000).optional(),
			source: z.enum(['manual', 'device', 'import']).default('manual'),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const body = c.req.valid('json');
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
				notes: body.notes ?? null,
				source: body.source,
			})
			.returning();
		return c.json({ log: inserted[0] }, 201);
	},
);

export default logs;

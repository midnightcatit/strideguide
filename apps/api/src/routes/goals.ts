import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { availableDaysSchema, goalSlugSchema, targetDateSchema } from '../lib/goal-schema';
import { schema } from '../db';
import type { AppBindings } from '../types';

const goals = new Hono<AppBindings>();

goals.get('/', async (c) => {
	const user = c.get('user')!;
	const rows = await c
		.get('db')
		.select()
		.from(schema.userGoals)
		.where(eq(schema.userGoals.userId, user.id))
		.orderBy(desc(schema.userGoals.createdAt));
	return c.json({ goals: rows });
});

goals.post(
	'/',
	zValidator(
		'json',
		z.object({
			goalProfileSlug: goalSlugSchema,
			targetDate: targetDateSchema.optional(),
			baseline: z.record(z.string(), z.unknown()).optional(),
			availableDays: availableDaysSchema.optional(),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const body = c.req.valid('json');
		const inserted = await c
			.get('db')
			.insert(schema.userGoals)
			.values({
				id: crypto.randomUUID(),
				userId: user.id,
				goalProfileSlug: body.goalProfileSlug,
				targetDate: body.targetDate ?? null,
				baseline: body.baseline ?? null,
				availableDays: body.availableDays ?? null,
			})
			.returning();
		return c.json({ goal: inserted[0] }, 201);
	},
);

export default goals;

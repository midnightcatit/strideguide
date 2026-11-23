import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { DEFAULT_PREFS, type Prefs } from '@strideguide/shared/units';
import { schema } from '../db';
import type { AppBindings } from '../types';

const settings = new Hono<AppBindings>();

settings.get('/', async (c) => {
	const user = c.get('user')!;
	const rows = await c
		.get('db')
		.select()
		.from(schema.settings)
		.where(eq(schema.settings.userId, user.id))
		.limit(1);
	const prefs: Prefs = { ...DEFAULT_PREFS, ...((rows[0]?.prefs as Partial<Prefs>) ?? {}) };
	return c.json({ prefs });
});

settings.put(
	'/',
	zValidator(
		'json',
		z.object({
			units: z.enum(['metric', 'imperial']).optional(),
			weekStart: z.union([z.literal(0), z.literal(1)]).optional(),
			name: z.string().trim().max(40).optional(),
			birthYear: z
				.number()
				.int()
				.min(1900)
				.max(new Date().getUTCFullYear() - 10)
				.optional(),
			eventName: z.string().trim().max(80).optional(),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const body = c.req.valid('json');
		const rows = await db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.userId, user.id))
			.limit(1);
		const prefs: Prefs = {
			...DEFAULT_PREFS,
			...((rows[0]?.prefs as Partial<Prefs>) ?? {}),
			...body,
		};
		await db
			.insert(schema.settings)
			.values({ userId: user.id, prefs })
			.onConflictDoUpdate({ target: schema.settings.userId, set: { prefs } });
		return c.json({ prefs });
	},
);

export default settings;

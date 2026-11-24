import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { DEFAULT_PREFS, type Prefs } from '@strideguide/shared/units';
import { birthYearSchema } from '../lib/birth-year';
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
			birthYear: birthYearSchema.optional(),
			eventName: z.string().trim().max(80).optional(),
			heightCm: z.number().min(90).max(250).nullable().optional(),
			weightKg: z.number().min(25).max(250).nullable().optional(),
			restingHr: z.number().int().min(30).max(120).nullable().optional(),
			autoAdvance: z.boolean().optional(),
			countdownSec: z.number().int().min(0).max(15).optional(),
			equipment: z
				.enum([
					'machines',
					'bodyweight',
					'bodyweight-dumbbells',
					'dumbbells',
					'barbell',
					'kettlebell',
					'bands',
					'both',
					'full-gym',
				])
				.optional(),
			equipmentItems: z
				.array(z.enum(['machines', 'dumbbells', 'barbell', 'kettlebell', 'bands']))
				.optional(),
			gymPreset: z.string().max(40).optional(),
			machineItems: z.array(z.string().max(60)).max(60).optional(),
			favoriteMachines: z.array(z.string().max(60)).max(60).optional(),
			favoriteWorkouts: z.array(z.string().max(60)).max(60).optional(),
			connectNudgeDismissed: z.boolean().optional(),
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
		// Nulls mean "clear this value", so they are dropped rather than stored.
		const clean = Object.fromEntries(
			Object.entries({ ...body }).filter(([, v]) => v !== null && v !== undefined),
		);
		const prefs: Prefs = {
			...DEFAULT_PREFS,
			...((rows[0]?.prefs as Partial<Prefs>) ?? {}),
			...clean,
		};
		await db
			.insert(schema.settings)
			.values({ userId: user.id, prefs })
			.onConflictDoUpdate({ target: schema.settings.userId, set: { prefs } });
		return c.json({ prefs });
	},
);

export default settings;

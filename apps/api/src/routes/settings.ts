import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { DEFAULT_PREFS, type Prefs } from '@strideguide/shared/units';
import { birthYearSchema } from '../lib/birth-year';
import {
	equipmentItemsSchema,
	equipmentPreferenceSchema,
	gymPresetSchema,
	loadModelSchema,
	machineItemsSchema,
	scheduleSchema,
} from '../lib/prefs-schema';
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
	const prefs: Prefs = { ...DEFAULT_PREFS, ...(rows[0]?.prefs ?? {}) };
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
			stepGoal: z.number().int().min(500).max(100000).nullable().optional(),
			activeEnergyGoalKcal: z.number().int().min(50).max(5000).nullable().optional(),
			activeZoneGoalMin: z.number().int().min(5).max(300).nullable().optional(),
			autoAdvance: z.boolean().optional(),
			countdownEnabled: z.boolean().optional(),
			countdownSec: z.number().int().min(3).max(10).optional(),
			equipment: equipmentPreferenceSchema.optional(),
			equipmentItems: equipmentItemsSchema.optional(),
			gymPreset: gymPresetSchema.optional(),
			machineItems: machineItemsSchema.optional(),
			favoriteMachines: z.array(z.string().max(60)).max(60).optional(),
			favoriteWorkouts: z.array(z.string().max(60)).max(60).optional(),
			connectNudgeDismissed: z.boolean().optional(),
			schedule: scheduleSchema.optional(),
			loadModel: loadModelSchema.optional(),
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
			...(rows[0]?.prefs ?? {}),
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

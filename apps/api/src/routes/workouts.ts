import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { validateCustomWorkout } from '@strideguide/shared';
import { DEFAULT_PREFS, type Prefs } from '@strideguide/shared/units';
import {
	createCustomWorkout,
	customWorkoutDraftSchema,
	deleteCustomWorkout,
	readCustomWorkouts,
	updateCustomWorkout,
} from '../lib/custom-workouts';
import { schema } from '../db';
import type { AppBindings } from '../types';

/**
 * The runner's own workouts, stored in settings.prefs next to the favorites.
 * List, create, update and delete for the signed-in user; the workout shape and
 * its reference checks live in the shared package.
 */
const workouts = new Hono<AppBindings>();

/** The runner's settings row, or null when they have none yet. */
async function loadSettings(db: AppBindings['Variables']['db'], userId: string) {
	const rows = await db
		.select()
		.from(schema.settings)
		.where(eq(schema.settings.userId, userId))
		.limit(1);
	return rows[0] ?? null;
}

async function saveSettings(db: AppBindings['Variables']['db'], userId: string, prefs: Prefs) {
	await db
		.insert(schema.settings)
		.values({ userId, prefs })
		.onConflictDoUpdate({ target: schema.settings.userId, set: { prefs } });
}

workouts.get('/', async (c) => {
	const user = c.get('user')!;
	const row = await loadSettings(c.get('db'), user.id);
	return c.json({ workouts: readCustomWorkouts(row?.prefs) });
});

workouts.post(
	'/',
	zValidator('json', customWorkoutDraftSchema),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const draft = c.req.valid('json');
		const problems = validateCustomWorkout(draft);
		if (problems.length) return c.json({ error: problems[0], problems }, 400);
		const row = await loadSettings(db, user.id);
		const base: Prefs = { ...DEFAULT_PREFS, ...(row?.prefs ?? {}) };
		const result = createCustomWorkout(
			base,
			draft,
			crypto.randomUUID(),
			new Date().toISOString(),
		);
		if (!result.ok) return c.json({ error: result.error }, 400);
		await saveSettings(db, user.id, result.prefs);
		return c.json({ workout: result.workout }, 201);
	},
);

workouts.put(
	'/:id',
	zValidator('json', customWorkoutDraftSchema),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const id = c.req.param('id');
		const draft = c.req.valid('json');
		const problems = validateCustomWorkout(draft);
		if (problems.length) return c.json({ error: problems[0], problems }, 400);
		const row = await loadSettings(db, user.id);
		const base: Prefs = { ...DEFAULT_PREFS, ...(row?.prefs ?? {}) };
		const result = updateCustomWorkout(base, id, draft, new Date().toISOString());
		if (!result.ok) return c.json({ error: result.error }, 404);
		await saveSettings(db, user.id, result.prefs);
		return c.json({ workout: result.workout });
	},
);

workouts.delete('/:id', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');
	const id = c.req.param('id');
	const row = await loadSettings(db, user.id);
	const base: Prefs = { ...DEFAULT_PREFS, ...(row?.prefs ?? {}) };
	const result = deleteCustomWorkout(base, id);
	if (!result.ok) return c.json({ error: result.error }, 404);
	await saveSettings(db, user.id, result.prefs);
	return c.json({ ok: true });
});

export default workouts;

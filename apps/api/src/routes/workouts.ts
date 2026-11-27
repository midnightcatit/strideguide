import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { validateCustomWorkout, type CustomWorkout } from '@strideguide/shared';
import {
	createCustomWorkout,
	customWorkoutDraftSchema,
	deleteCustomWorkout,
	readCustomWorkouts,
	updateCustomWorkout,
} from '../lib/custom-workouts';
import { changeStoredPrefs, d1PrefsStore } from '../lib/prefs-store';
import { schema } from '../db';
import type { AppBindings } from '../types';

/**
 * The runner's own workouts, stored in settings.prefs next to the favorites.
 * List, create, update and delete for the signed-in user; the workout shape and
 * its reference checks live in the shared package, and every mutation goes
 * through a guarded read-modify-write so two requests cannot lose each other.
 */
const workouts = new Hono<AppBindings>();

const INVALID_BODY = {
	error: 'invalid_input',
	message: 'Some of the workout details did not look right. Check the name, sections and items, then try again.',
};

const CONFLICT = { error: 'A change to your workouts was saving at the same time. Try again.' };

workouts.get('/', async (c) => {
	const user = c.get('user')!;
	const rows = await c
		.get('db')
		.select()
		.from(schema.settings)
		.where(eq(schema.settings.userId, user.id))
		.limit(1);
	return c.json({ workouts: readCustomWorkouts(rows[0]?.prefs) });
});

workouts.post(
	'/',
	zValidator('json', customWorkoutDraftSchema, (result, c) => {
		if (!result.success) return c.json(INVALID_BODY, 400);
	}),
	async (c) => {
		const user = c.get('user')!;
		const draft = c.req.valid('json');
		const problems = validateCustomWorkout(draft);
		if (problems.length) return c.json({ error: problems[0], problems }, 400);
		// One id and time for the whole attempt, so a retry after a lost write
		// stores the same workout rather than a new one.
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		let saved: CustomWorkout | undefined;
		const outcome = await changeStoredPrefs(d1PrefsStore(c.env.DB), user.id, (prefs) => {
			const result = createCustomWorkout(prefs, draft, id, now);
			saved = result.ok ? result.workout : undefined;
			return result;
		});
		if (outcome.kind === 'refused') return c.json({ error: outcome.error }, 400);
		if (outcome.kind === 'conflict') return c.json(CONFLICT, 409);
		return c.json({ workout: saved }, 201);
	},
);

workouts.put(
	'/:id',
	zValidator('json', customWorkoutDraftSchema, (result, c) => {
		if (!result.success) return c.json(INVALID_BODY, 400);
	}),
	async (c) => {
		const user = c.get('user')!;
		const id = c.req.param('id');
		const draft = c.req.valid('json');
		const problems = validateCustomWorkout(draft);
		if (problems.length) return c.json({ error: problems[0], problems }, 400);
		const now = new Date().toISOString();
		let saved: CustomWorkout | undefined;
		const outcome = await changeStoredPrefs(d1PrefsStore(c.env.DB), user.id, (prefs) => {
			const result = updateCustomWorkout(prefs, id, draft, now);
			saved = result.ok ? result.workout : undefined;
			return result;
		});
		if (outcome.kind === 'refused') return c.json({ error: outcome.error }, 404);
		if (outcome.kind === 'conflict') return c.json(CONFLICT, 409);
		return c.json({ workout: saved });
	},
);

workouts.delete('/:id', async (c) => {
	const user = c.get('user')!;
	const id = c.req.param('id');
	const outcome = await changeStoredPrefs(d1PrefsStore(c.env.DB), user.id, (prefs) =>
		deleteCustomWorkout(prefs, id),
	);
	if (outcome.kind === 'refused') return c.json({ error: outcome.error }, 404);
	if (outcome.kind === 'conflict') return c.json(CONFLICT, 409);
	return c.json({ ok: true });
});

export default workouts;

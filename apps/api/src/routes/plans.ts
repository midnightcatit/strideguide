import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asc, and, desc, eq, inArray } from 'drizzle-orm';
import { GOAL_PROFILES, generatePlan } from '@strideguide/shared';
import { WORKOUT_LIBRARY } from '@strideguide/shared/plan';
import type { Baseline, QualityKind, SessionArchetype } from '@strideguide/shared';
import { schema } from '../db';
import { narrateAndStore, templateWeekSummary } from '../lib/narration';
import { shapePlan } from '../lib/plan-shape';
import { checkRateLimit } from '../lib/rate-limit';
import type { AppBindings } from '../types';

const plans = new Hono<AppBindings>();

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

/** GET current active plan for the user's most recent goal (weeks + sessions). */
plans.get('/current', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');

	const goalRows = await db
		.select()
		.from(schema.userGoals)
		.where(eq(schema.userGoals.userId, user.id))
		.orderBy(desc(schema.userGoals.createdAt))
		.limit(1);
	const goal = goalRows[0];
	if (!goal) return c.json({ plan: null });

	const planRows = await db
		.select()
		.from(schema.plans)
		.where(eq(schema.plans.userGoalId, goal.id))
		.orderBy(desc(schema.plans.version))
		.limit(1);
	const plan = planRows[0];
	if (!plan) return c.json({ goal, plan: null });

	const weeks = await db
		.select()
		.from(schema.planWeeks)
		.where(eq(schema.planWeeks.planId, plan.id))
		.orderBy(asc(schema.planWeeks.weekNumber));

	const weekIds = weeks.map((w) => w.id);
	// Chunk IN(...) queries: D1 caps bound parameters per statement (100).
	const sessions = (
		await Promise.all(
			chunk(weekIds, 90).map((part) =>
				db
					.select()
					.from(schema.sessionsPlan)
					.where(inArray(schema.sessionsPlan.planWeekId, part)),
			),
		)
	).flat();

	const sessionIds = sessions.map((s) => s.id);
	const logs = (
		await Promise.all(
			chunk(sessionIds, 90).map((part) =>
				db
					.select()
					.from(schema.logs)
					.where(and(eq(schema.logs.userId, user.id), inArray(schema.logs.sessionId, part))),
			),
		)
	).flat();

	const states = await db
		.select()
		.from(schema.sessionStates)
		.where(eq(schema.sessionStates.userId, user.id));

	return c.json({
		goal,
		plan,
		sessionStates: states.map((s) => ({
			sessionId: s.sessionId,
			state: s.state,
			progress: s.progress ?? null,
		})),
		weeks: weeks.map((w) => ({
			...w,
			sessions: sessions
				.filter((s) => s.planWeekId === w.id)
				.sort((a, b) => a.day - b.day || (a.slot ?? '').localeCompare(b.slot ?? '')),
		})),
		logs,
	});
});


/** Day index (0 = Monday) for an ISO date inside a week starting on weekStart. */
function dayIndex(weekStart: string, iso: string): number {
	const days = Math.round(
		(Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 86400000,
	);
	return ((days % 7) + 7) % 7;
}

/** The user's current plan plus its weeks, or null. */
async function currentPlanWithWeeks(db: AppBindings['Variables']['db'], userId: string) {
	const goal = (
		await db
			.select()
			.from(schema.userGoals)
			.where(eq(schema.userGoals.userId, userId))
			.orderBy(desc(schema.userGoals.createdAt))
			.limit(1)
	)[0];
	if (!goal) return null;
	const plan = (
		await db
			.select()
			.from(schema.plans)
			.where(eq(schema.plans.userGoalId, goal.id))
			.orderBy(desc(schema.plans.version))
			.limit(1)
	)[0];
	if (!plan) return null;
	const weeks = await db
		.select()
		.from(schema.planWeeks)
		.where(eq(schema.planWeeks.planId, plan.id))
		.orderBy(asc(schema.planWeeks.weekNumber));
	return { goal, plan, weeks };
}

/** POST /sessions: add a library workout to a day in the user's current plan. */
plans.post(
	'/sessions',
	zValidator(
		'json',
		z.object({
			date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
			workoutId: z.string().min(1).max(60),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const { date, workoutId } = c.req.valid('json');

		const workout = WORKOUT_LIBRARY.find((w) => w.id === workoutId);
		if (!workout) return c.json({ error: 'Unknown workout.' }, 400);

		const current = await currentPlanWithWeeks(db, user.id);
		if (!current) return c.json({ error: 'You need a plan first.' }, 400);

		const week = current.weeks.find(
			(w) => w.startDate && w.endDate && date >= w.startDate && date <= w.endDate,
		);
		if (!week || !week.startDate) {
			return c.json({ error: 'That day is outside your plan.' }, 400);
		}

		const session = {
			id: crypto.randomUUID(),
			planWeekId: week.id,
			day: dayIndex(week.startDate, date),
			slot: 'AM',
			modality: workout.modality,
			type: workout.type,
			title: workout.title,
			purpose: workout.purpose,
			prescription: {
				summary: workout.summary,
				intensity: workout.intensity,
				targetRpe: workout.targetRpe,
				workout: workout.workout,
				added: true,
				libraryId: workout.id,
			},
			durationMin: workout.durationMin,
		};
		await db.insert(schema.sessionsPlan).values(session);
		return c.json({ session }, 201);
	},
);

/** True when the session belongs to a plan owned by this user. */
async function sessionOwnedBy(
	db: AppBindings['Variables']['db'],
	userId: string,
	sessionId: string,
): Promise<boolean> {
	const session = (
		await db.select().from(schema.sessionsPlan).where(eq(schema.sessionsPlan.id, sessionId)).limit(1)
	)[0];
	if (!session) return false;
	const week = (
		await db.select().from(schema.planWeeks).where(eq(schema.planWeeks.id, session.planWeekId)).limit(1)
	)[0];
	if (!week) return false;
	const plan = (
		await db.select().from(schema.plans).where(eq(schema.plans.id, week.planId)).limit(1)
	)[0];
	if (!plan) return false;
	const goal = (
		await db
			.select()
			.from(schema.userGoals)
			.where(and(eq(schema.userGoals.id, plan.userGoalId), eq(schema.userGoals.userId, userId)))
			.limit(1)
	)[0];
	return !!goal;
}

/** POST /sessions/:id/state: set or clear a session's started or skipped state. */
plans.post(
	'/sessions/:id/state',
	zValidator(
		'json',
		z.object({
			state: z.union([z.literal('started'), z.literal('skipped'), z.null()]),
			progress: z.string().max(200).nullable().optional(),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const id = c.req.param('id');
		const { state, progress } = c.req.valid('json');

		if (!(await sessionOwnedBy(db, user.id, id))) return c.json({ error: 'Not found.' }, 404);

		if (state === null) {
			await db
				.delete(schema.sessionStates)
				.where(
					and(eq(schema.sessionStates.userId, user.id), eq(schema.sessionStates.sessionId, id)),
				);
		} else {
			await db
				.insert(schema.sessionStates)
				.values({ userId: user.id, sessionId: id, state, progress: progress ?? null })
				.onConflictDoUpdate({
					target: [schema.sessionStates.userId, schema.sessionStates.sessionId],
					set: progress === undefined ? { state } : { state, progress },
				});
		}
		return c.json({ ok: true, state });
	},
);

/** DELETE /sessions/:id: remove a workout the user added (never a planned one). */
plans.delete('/sessions/:id', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');
	const id = c.req.param('id');

	const session = (
		await db.select().from(schema.sessionsPlan).where(eq(schema.sessionsPlan.id, id)).limit(1)
	)[0];
	if (!session) return c.json({ error: 'Not found.' }, 404);

	const week = (
		await db
			.select()
			.from(schema.planWeeks)
			.where(eq(schema.planWeeks.id, session.planWeekId))
			.limit(1)
	)[0];
	const plan = week
		? (
				await db.select().from(schema.plans).where(eq(schema.plans.id, week.planId)).limit(1)
			)[0]
		: undefined;
	const owned = plan
		? (
				await db
					.select()
					.from(schema.userGoals)
					.where(and(eq(schema.userGoals.id, plan.userGoalId), eq(schema.userGoals.userId, user.id)))
					.limit(1)
			)[0]
		: undefined;
	if (!owned) return c.json({ error: 'Not found.' }, 404);

	const added = (session.prescription as { added?: boolean } | null)?.added === true;
	if (!added) return c.json({ error: 'Only workouts you added can be removed.' }, 403);

	await db.delete(schema.sessionsPlan).where(eq(schema.sessionsPlan.id, id));
	return c.json({ ok: true });
});

/** POST generate: create a goal plus a generated, narrated plan. */
plans.post(
	'/generate',
	zValidator(
		'json',
		z.object({
			goalProfileSlug: z.string(),
			targetDate: z.string().optional(),
			startDate: z.string().optional(),
			baseline: z.record(z.string(), z.unknown()).optional(),
			availableDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
		}),
	),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const body = c.req.valid('json');

		// Generation costs AI; keep it bounded.
		const rl = await checkRateLimit(c.env.DB, `generate:${user.id}`, 20, 3600);
		if (!rl.ok) return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });

		const profile = GOAL_PROFILES.find((p) => p.slug === body.goalProfileSlug);
		if (!profile) return c.json({ error: 'unknown_profile' }, 400);

		const startDate = body.startDate ?? new Date().toISOString().slice(0, 10);
		const availableDays = body.availableDays?.length ? body.availableDays : [0, 2, 4];

		const baseline = (body.baseline ?? {}) as Baseline;
		const planInput = { profile, baseline, availableDays, startDate, targetDate: body.targetDate };
		const baseDraft = generatePlan(planInput);

		// The engine lays the plan out instantly. Then the model shapes each week
		// (quality kind and emphasis) within the profile's rules. Bounded and
		// best-effort, so a slow or invalid answer leaves the engine's plan standing.
		const allowed = (['tempo', 'hills', 'interval', 'race-pace'] as QualityKind[]).filter((k) =>
			profile.sessionTypes.includes(k as SessionArchetype),
		);
		const shapes = await shapePlan(c.env, {
			goalName: profile.name,
			allowed,
			prefs: baseline as Record<string, unknown>,
			weeks: baseDraft.weeks.map((w) => ({
				weekNumber: w.weekNumber,
				phase: w.phase,
				volumeKm: w.targetVolumeKm,
			})),
		});
		const draft = shapes ? generatePlan({ ...planInput, weekShapes: shapes }) : baseDraft;
		const usedAi = !!shapes;

		const goalId = crypto.randomUUID();
		await db.insert(schema.userGoals).values({
			id: goalId,
			userId: user.id,
			goalProfileSlug: profile.slug,
			targetDate: body.targetDate ?? null,
			baseline: (body.baseline ?? null) as Record<string, unknown> | null,
			availableDays,
		});

		const planId = crypto.randomUUID();
		await db.insert(schema.plans).values({
			id: planId,
			userGoalId: goalId,
			version: 1,
			generatedAt: new Date(),
			model: usedAi ? 'engine+ai' : 'engine',
			params: {
				vdot: draft.meta.vdot ?? null,
				baseWeeklyKm: draft.meta.baseWeeklyKm,
				totalWeeks: draft.meta.totalWeeks,
			},
			status: 'active',
		});

		const weekRows = draft.weeks.map((w, i) => {
			const weekId = crypto.randomUUID();
			return {
				id: weekId,
				planId,
				weekNumber: w.weekNumber,
				focus: w.focus,
				// The model's week line if it shaped this week; otherwise a template.
				summaryText:
					shapes?.[i]?.emphasis ?? templateWeekSummary(w.weekNumber, w.phase, w.targetVolumeKm),
				startDate: w.startDate,
				endDate: w.endDate,
				phase: w.phase,
				targetVolumeKm: w.targetVolumeKm,
				sessionRows: w.sessions.map((s) => ({
					id: crypto.randomUUID(),
					planWeekId: weekId,
					day: s.day,
					slot: s.slot,
					modality: s.modality,
					type: s.type,
					title: s.title,
					purpose: s.purpose,
					prescription: s.prescription,
					durationMin: s.durationMin,
				})),
			};
		});

		// D1 caps bound parameters per statement (100). Keep chunks well under it.
		const weekValues = weekRows.map(({ sessionRows: _s, phase: _p, targetVolumeKm: _t, ...rest }) => rest);
		for (const part of chunk(weekValues, 10)) {
			await db.insert(schema.planWeeks).values(part);
		}

		const sessionRows = weekRows.flatMap((w) => w.sessionRows);
		for (const part of chunk(sessionRows, 8)) {
			await db.insert(schema.sessionsPlan).values(part);
		}

		// Narrate after responding, so the user never waits on the model.
		c.executionCtx.waitUntil(
			narrateAndStore(
				c.env,
				db,
				weekRows.map((w) => ({
					id: w.id,
					weekNumber: w.weekNumber,
					phase: w.phase,
					targetVolumeKm: w.targetVolumeKm,
				})),
			),
		);

		return c.json({ planId, goalId, weeks: draft.weeks.length, usedAi }, 201);
	},
);

export default plans;

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asc, and, desc, eq, gte, inArray } from 'drizzle-orm';
import { GOAL_PROFILES, generatePlan } from '@strideguide/shared';
import {
	WORKOUT_LIBRARY,
	adaptPlan,
	fitnessState,
	machinesForPreset,
} from '@strideguide/shared/plan';
import type {
	Baseline,
	EquipmentItem,
	EquipmentPreference,
	QualityKind,
	SessionArchetype,
} from '@strideguide/shared';
import { DEFAULT_PREFS, ageFromBirthYear, type Prefs } from '@strideguide/shared/units';
import { schema } from '../db';
import type { Db } from '../db';
import { narrateAndStore, reviewPlan, templateWeekSummary } from '../lib/narration';
import { shapePlan } from '../lib/plan-shape';
import { checkRateLimit } from '../lib/rate-limit';
import type { AppBindings } from '../types';

const plans = new Hono<AppBindings>();

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

/** The runner's app preferences, with defaults merged. */
async function loadPrefs(db: Db, userId: string): Promise<Prefs> {
	const rows = await db
		.select()
		.from(schema.settings)
		.where(eq(schema.settings.userId, userId))
		.limit(1);
	return { ...DEFAULT_PREFS, ...((rows[0]?.prefs as Partial<Prefs>) ?? {}) };
}

/** Merge a partial prefs patch into the runner's settings. */
async function upsertPrefs(db: Db, userId: string, patch: Partial<Prefs>): Promise<void> {
	const rows = await db
		.select()
		.from(schema.settings)
		.where(eq(schema.settings.userId, userId))
		.limit(1);
	const merged = { ...DEFAULT_PREFS, ...((rows[0]?.prefs as Partial<Prefs>) ?? {}), ...patch };
	if (rows[0]) {
		await db
			.update(schema.settings)
			.set({ prefs: merged })
			.where(eq(schema.settings.userId, userId));
	} else {
		await db.insert(schema.settings).values({ userId, prefs: merged });
	}
}

/** The machines to build a circuit from: an explicit override, else the gym preset. */
function resolveMachines(prefs: Prefs): string[] | undefined {
	if (prefs.machineItems?.length) return prefs.machineItems;
	return machinesForPreset(prefs.gymPreset);
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
				db.select().from(schema.sessionsPlan).where(inArray(schema.sessionsPlan.planWeekId, part)),
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
		await db
			.select()
			.from(schema.sessionsPlan)
			.where(eq(schema.sessionsPlan.id, sessionId))
			.limit(1)
	)[0];
	if (!session) return false;
	const week = (
		await db
			.select()
			.from(schema.planWeeks)
			.where(eq(schema.planWeeks.id, session.planWeekId))
			.limit(1)
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
		? (await db.select().from(schema.plans).where(eq(schema.plans.id, week.planId)).limit(1))[0]
		: undefined;
	const owned = plan
		? (
				await db
					.select()
					.from(schema.userGoals)
					.where(
						and(eq(schema.userGoals.id, plan.userGoalId), eq(schema.userGoals.userId, user.id)),
					)
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

		// Sports logged in the last seven days, with how long and how hard. A heavy
		// sport week already carries load, so the plan trims the strength and quality
		// work to match.
		const since = Date.now() - 7 * 86400000;
		const userLogs = await c
			.get('db')
			.select()
			.from(schema.logs)
			.where(eq(schema.logs.userId, user.id));
		const recentLogs = userLogs.filter((l) => {
			const raw = l.createdAt as unknown;
			const t = raw instanceof Date ? raw.getTime() : Number(raw) * 1000;
			return t >= since && !!l.sessionId;
		});
		const recentIds = recentLogs.map((l) => l.sessionId as string);
		const recentSessions = recentIds.length
			? (
					await Promise.all(
						chunk(recentIds, 90).map((part) =>
							c
								.get('db')
								.select()
								.from(schema.sessionsPlan)
								.where(inArray(schema.sessionsPlan.id, part)),
						),
					)
				).flat()
			: [];
		const crossIds = new Set(
			recentSessions.filter((row) => row.type === 'cross-train').map((row) => row.id),
		);
		const crossLogs = recentLogs.filter((l) => l.sessionId && crossIds.has(l.sessionId));
		const crossLoad = {
			sessions: crossLogs.length,
			minutes: Math.round(
				crossLogs.reduce((m, l) => {
					const stats = (l.runStats ?? {}) as { durationSec?: number };
					return m + (stats.durationSec ?? 0);
				}, 0) / 60,
			),
			highEffort: crossLogs.filter((l) => (l.rpe ?? 0) >= 7).length,
		};

		// A read of what the runner has actually been doing, from their own logs,
		// joined to the plan so each one knows its session type. Seeds paces from a
		// recent hard effort and volume from real recent weeks, when the runner has
		// not given a race time or a weekly distance.
		const fitSince = Date.now() - 28 * 86400000;
		const fitLogs = userLogs.filter((l) => {
			const t = l.startedAt instanceof Date ? l.startedAt.getTime() : null;
			return t != null && t >= fitSince;
		});
		const fitSessionIds = [
			...new Set(fitLogs.map((l) => l.sessionId).filter((x): x is string => !!x)),
		];
		const fitSessions = fitSessionIds.length
			? (
					await Promise.all(
						chunk(fitSessionIds, 90).map((part) =>
							c
								.get('db')
								.select()
								.from(schema.sessionsPlan)
								.where(inArray(schema.sessionsPlan.id, part)),
						),
					)
				).flat()
			: [];
		const typeById = new Map(fitSessions.map((s) => [s.id, s.type]));
		const fitness = fitnessState(
			fitLogs.map((l) => {
				const stats = (l.runStats ?? {}) as { distanceKm?: number; durationSec?: number };
				return {
					sessionId: l.sessionId,
					type: l.sessionId ? (typeById.get(l.sessionId) ?? null) : null,
					date: l.startedAt instanceof Date ? l.startedAt.toISOString() : null,
					distanceKm: stats.distanceKm ?? null,
					durationSec: stats.durationSec ?? null,
					rpe: l.rpe ?? null,
					feedback: (l.feedback as 'up' | 'down' | null) ?? null,
				};
			}),
			{ raceTimes: baseline.recentTimes },
		);
		const prefs = await loadPrefs(db, user.id);
		// Age is stored as a birth year in settings, so it stays right over time.
		// Seed it onto the baseline (unless the body already carried one), where the
		// engine tunes the plan by age band and the stored goal keeps it for rebuilds.
		const age = ageFromBirthYear(prefs.birthYear);
		const seededBaseline: Baseline = {
			...baseline,
			...(baseline.age == null && age != null ? { age } : {}),
			...(prefs.equipment ? { equipment: prefs.equipment } : {}),
			...(prefs.equipmentItems ? { equipmentItems: prefs.equipmentItems } : {}),
			...(baseline.effectiveVdot == null && fitness.effectiveVdot != null
				? { effectiveVdot: fitness.effectiveVdot }
				: {}),
			...(baseline.weeklyKm == null && fitness.recentWeeklyKm > 0
				? { weeklyKm: fitness.recentWeeklyKm }
				: {}),
			...(fitness.likedTypes.length ? { likedTypes: fitness.likedTypes } : {}),
			...(fitness.dislikedTypes.length ? { dislikedTypes: fitness.dislikedTypes } : {}),
		};

		const planInput = {
			profile,
			baseline: seededBaseline,
			availableDays,
			startDate,
			targetDate: body.targetDate,
			crossLoad,
			equipment: seededBaseline.equipmentItems,
			machines: resolveMachines(prefs),
		};
		const baseDraft = generatePlan(planInput);

		// The engine lays the plan out instantly. Then, in parallel, the model shapes
		// each week (quality kind and emphasis) within the profile's rules, and writes
		// a short plan review. Both are bounded and best-effort, so a slow or invalid
		// answer leaves the engine's plan and a deterministic review standing.
		const allowed = (['tempo', 'hills', 'interval', 'race-pace'] as QualityKind[]).filter((k) =>
			profile.sessionTypes.includes(k as SessionArchetype),
		);
		const firstWeekSessions = baseDraft.weeks[0]?.sessions ?? [];
		const [shapes, review] = await Promise.all([
			shapePlan(c.env, {
				goalName: profile.name,
				allowed,
				prefs: baseline as Record<string, unknown>,
				fitness: {
					recentWeeklyKm: fitness.recentWeeklyKm,
					rpeTrend: fitness.rpeTrend,
					likedTypes: fitness.likedTypes,
					dislikedTypes: fitness.dislikedTypes,
					samples: fitness.samples,
				},
				weeks: baseDraft.weeks.map((w) => ({
					weekNumber: w.weekNumber,
					phase: w.phase,
					volumeKm: w.targetVolumeKm,
				})),
			}),
			reviewPlan(c.env, {
				goalName: profile.name,
				totalWeeks: baseDraft.meta.totalWeeks,
				age: seededBaseline.age,
				phases: baseDraft.weeks.map((w) => w.phase),
				strengthPerWeek: firstWeekSessions.filter((s) => s.modality === 'strength').length,
				firstWeek: firstWeekSessions.map((s) => s.title),
			}),
		]);
		const draft = shapes ? generatePlan({ ...planInput, weekShapes: shapes }) : baseDraft;
		const usedAi = !!shapes || review.usedAi;

		const goalId = crypto.randomUUID();
		await db.insert(schema.userGoals).values({
			id: goalId,
			userId: user.id,
			goalProfileSlug: profile.slug,
			targetDate: body.targetDate ?? null,
			baseline: seededBaseline as Record<string, unknown>,
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
				// The plan review shown in the review step. Unit-free, so it reads the
				// same whatever units the runner later picks.
				review: review.text,
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
		const weekValues = weekRows.map(
			({ sessionRows: _s, phase: _p, targetVolumeKm: _t, ...rest }) => rest,
		);
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

/**
 * POST /adapt: rebuild the weeks that have not started yet, from the runner's
 * own logs and feedback. Deterministic and instant, no AI in the path. Past
 * weeks are never touched.
 */
plans.post('/adapt', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');

	// An equipment change arrives here: store it, then rebuild the weeks ahead.
	const body = (await c.req.json().catch(() => ({}))) as {
		equipment?: EquipmentPreference;
		equipmentItems?: EquipmentItem[];
		gymPreset?: string;
		machineItems?: string[];
	};
	const patch: Partial<Prefs> = {};
	if (typeof body.equipment === 'string') patch.equipment = body.equipment;
	if (Array.isArray(body.equipmentItems)) patch.equipmentItems = body.equipmentItems;
	if (typeof body.gymPreset === 'string') patch.gymPreset = body.gymPreset;
	if (Array.isArray(body.machineItems)) patch.machineItems = body.machineItems;
	if (Object.keys(patch).length) await upsertPrefs(db, user.id, patch);
	const prefs = await loadPrefs(db, user.id);

	const rl = await checkRateLimit(c.env.DB, `adapt:${user.id}`, 30, 3600);
	if (!rl.ok) return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });

	const found = await currentPlanWithWeeks(db, user.id);
	if (!found) return c.json({ error: 'no_plan' }, 404);
	const { goal, plan, weeks } = found;

	const profile = GOAL_PROFILES.find((p) => p.slug === goal.goalProfileSlug);
	if (!profile) return c.json({ error: 'unknown_profile' }, 400);

	const weekIds = weeks.map((w) => w.id);
	const sessions = weekIds.length
		? (
				await Promise.all(
					chunk(weekIds, 90).map((part) =>
						db
							.select()
							.from(schema.sessionsPlan)
							.where(inArray(schema.sessionsPlan.planWeekId, part)),
					),
				)
			).flat()
		: [];

	const existingWeeks = weeks.map((w) => ({
		weekNumber: w.weekNumber,
		phase: w.phase ?? 'base',
		focus: w.focus ?? '',
		startDate: w.startDate ?? '',
		endDate: w.endDate ?? '',
		targetVolumeKm: 0,
		sessions: sessions
			.filter((s) => s.planWeekId === w.id)
			.sort((a, b) => a.day - b.day || (a.slot ?? '').localeCompare(b.slot ?? ''))
			.map((s) => ({
				day: s.day,
				slot: s.slot ?? 'AM',
				modality: s.modality,
				type: s.type,
				title: s.title ?? '',
				purpose: s.purpose ?? '',
				prescription: (s.prescription ?? {}) as Record<string, unknown>,
				durationMin: s.durationMin ?? 0,
			})),
	}));

	// Keep age current on a rebuild: the stored goal carries it from onboarding, and
	// the birth year in settings is the fallback for a goal created before that.
	const storedBaseline = (goal.baseline ?? {}) as Baseline;
	const age = storedBaseline.age ?? ageFromBirthYear(prefs.birthYear);
	const baseline: Baseline = {
		...storedBaseline,
		...(age != null ? { age } : {}),
		...(prefs.equipment ? { equipment: prefs.equipment } : {}),
		...(prefs.equipmentItems ? { equipmentItems: prefs.equipmentItems } : {}),
	};
	const userLogs = await db.select().from(schema.logs).where(eq(schema.logs.userId, user.id));
	const typeById = new Map(sessions.map((s) => [s.id, s.type]));
	const fitSince = Date.now() - 28 * 86400000;
	const fitness = fitnessState(
		userLogs
			.filter((l) => l.startedAt instanceof Date && l.startedAt.getTime() >= fitSince)
			.map((l) => {
				const stats = (l.runStats ?? {}) as { distanceKm?: number; durationSec?: number };
				return {
					sessionId: l.sessionId,
					type: l.sessionId ? (typeById.get(l.sessionId) ?? null) : null,
					date: l.startedAt instanceof Date ? l.startedAt.toISOString() : null,
					distanceKm: stats.distanceKm ?? null,
					durationSec: stats.durationSec ?? null,
					rpe: l.rpe ?? null,
					feedback: (l.feedback as 'up' | 'down' | null) ?? null,
				};
			}),
		{ raceTimes: baseline.recentTimes },
	);

	const todayIso = new Date().toISOString().slice(0, 10);
	const allowed = (['tempo', 'hills', 'interval', 'race-pace'] as QualityKind[]).filter((k) =>
		profile.sessionTypes.includes(k as SessionArchetype),
	);

	const result = adaptPlan({
		profile,
		baseline,
		availableDays: (goal.availableDays as number[] | null)?.length
			? (goal.availableDays as number[])
			: [0, 2, 4],
		startDate: existingWeeks[0]?.startDate || todayIso,
		targetDate: goal.targetDate ?? undefined,
		existingWeeks,
		today: todayIso,
		fitness,
		allowedQuality: allowed,
		equipment: baseline.equipmentItems,
		machines: resolveMachines(prefs),
	} as unknown as Parameters<typeof adaptPlan>[0]);

	if (result.changedFromWeek == null) {
		return c.json({ changed: false, changedFromWeek: null, swapped: [] });
	}

	// Replace the weeks ahead, leaving past weeks and their logs untouched.
	const changed = result.weeks.filter((w) => w.weekNumber >= result.changedFromWeek!);
	await db
		.delete(schema.planWeeks)
		.where(
			and(
				eq(schema.planWeeks.planId, plan.id),
				gte(schema.planWeeks.weekNumber, result.changedFromWeek!),
			),
		);

	const weekRows = changed.map((w) => {
		const weekId = crypto.randomUUID();
		return {
			id: weekId,
			planId: plan.id,
			weekNumber: w.weekNumber,
			focus: w.focus,
			summaryText: templateWeekSummary(w.weekNumber, w.phase, w.targetVolumeKm),
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
	// Match the generate path: only the stored week columns are inserted.
	const weekValues = weekRows.map(
		({ sessionRows: _s, phase: _p, targetVolumeKm: _t, ...rest }) => rest,
	);
	for (const part of chunk(weekValues, 10)) {
		await db.insert(schema.planWeeks).values(part);
	}
	const sessionRows = weekRows.flatMap((w) => w.sessionRows);
	for (const part of chunk(sessionRows, 8)) {
		await db.insert(schema.sessionsPlan).values(part);
	}

	await db
		.update(schema.plans)
		.set({
			generatedAt: new Date(),
			params: { ...(plan.params as Record<string, unknown>), adaptedAt: new Date().toISOString() },
		})
		.where(eq(schema.plans.id, plan.id));

	return c.json({
		changed: true,
		changedFromWeek: result.changedFromWeek,
		swapped: result.swapped,
		weeks: changed.length,
	});
});

export default plans;

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { GOAL_PROFILES, generatePlan } from '@strideguide/shared';
import type { Baseline } from '@strideguide/shared';
import { schema } from '../db';
import { narrateWeeks } from '../lib/narration';
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
	const sessions = weekIds.length
		? await db
				.select()
				.from(schema.sessionsPlan)
				.where(inArray(schema.sessionsPlan.planWeekId, weekIds))
		: [];

	const sessionIds = sessions.map((s) => s.id);
	const logs = sessionIds.length
		? await db
				.select()
				.from(schema.logs)
				.where(inArray(schema.logs.sessionId, sessionIds))
		: [];

	return c.json({
		goal,
		plan,
		weeks: weeks.map((w) => ({
			...w,
			sessions: sessions
				.filter((s) => s.planWeekId === w.id)
				.sort((a, b) => a.day - b.day || (a.slot ?? '').localeCompare(b.slot ?? '')),
		})),
		logs,
	});
});

/** POST generate — create a goal + a generated, narrated plan. */
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

		const profile = GOAL_PROFILES.find((p) => p.slug === body.goalProfileSlug);
		if (!profile) return c.json({ error: 'unknown_profile' }, 400);

		const startDate = body.startDate ?? new Date().toISOString().slice(0, 10);
		const availableDays = body.availableDays?.length ? body.availableDays : [0, 2, 4];

		const draft = generatePlan({
			profile,
			baseline: (body.baseline ?? {}) as Baseline,
			availableDays,
			startDate,
			targetDate: body.targetDate,
		});

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
			model: 'engine',
			params: {
				vdot: draft.meta.vdot ?? null,
				baseWeeklyKm: draft.meta.baseWeeklyKm,
				totalWeeks: draft.meta.totalWeeks,
			},
			status: 'active',
		});

		const narration = await narrateWeeks(
			c.env,
			draft.weeks.map((w) => ({
				weekNumber: w.weekNumber,
				phase: w.phase,
				targetVolumeKm: w.targetVolumeKm,
			})),
		);

		const weekRows = draft.weeks.map((w, i) => {
			const weekId = crypto.randomUUID();
			return {
				id: weekId,
				planId,
				weekNumber: w.weekNumber,
				focus: w.focus,
				summaryText: narration.summaries[i] ?? '',
				startDate: w.startDate,
				endDate: w.endDate,
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
		const weekValues = weekRows.map(({ sessionRows: _s, ...rest }) => rest);
		for (const part of chunk(weekValues, 10)) {
			await db.insert(schema.planWeeks).values(part);
		}

		const sessionRows = weekRows.flatMap((w) => w.sessionRows);
		for (const part of chunk(sessionRows, 8)) {
			await db.insert(schema.sessionsPlan).values(part);
		}

		await db.insert(schema.aiJobs).values({
			id: crypto.randomUUID(),
			type: 'plan_narration',
			status: narration.usedAi ? 'ok' : 'error',
			modelUsed: narration.model ?? 'template',
			latencyMs: 0,
		});

		return c.json({ planId, goalId, weeks: draft.weeks.length, usedAi: narration.usedAi }, 201);
	},
);

export default plans;

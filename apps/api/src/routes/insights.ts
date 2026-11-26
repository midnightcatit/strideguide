import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { GOAL_PROFILES } from '@strideguide/shared';
import { schema } from '../db';
import type { AppBindings } from '../types';
import { compareDaySessions } from '../lib/session-order';
import { loadPrefs, currentPlanWithWeeks } from './plans';
import { checkRateLimit } from '../lib/rate-limit';
import {
	buildDayInsight,
	generateDayInsight,
	type DayInsightInput,
	type InsightAheadInput,
	type InsightWorkoutInput,
} from '../lib/insights';

/**
 * One day's insight: a short, grounded read on the day's logged training. GET
 * returns what is stored for the date, if anything, and whether it is stale
 * against the day's current logs. POST writes one on request, once per day: a
 * second request with the same logs returns the stored text rather than calling
 * the model again.
 *
 * Only the day's planned sessions are in scope. A planned session's date is its
 * plan week's start plus its day offset, so the day is exact without a timezone.
 * An imported activity is dated by its own UTC start time, which the server
 * cannot place on the runner's civil day, so it is left out of the facts rather
 * than risk it landing on the wrong day.
 */
const insights = new Hono<AppBindings>();

const dateSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict();

/** The plan-week day offset (0 = Monday) of an ISO date inside a week. */
function dayIndexInWeek(weekStart: string, iso: string): number {
	const days = Math.round(
		(Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 86400000,
	);
	return ((days % 7) + 7) % 7;
}

/** Keep IN(...) statements under D1's bound-parameter cap. */
function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

/**
 * Assemble a day's inputs: its planned sessions, each with the runner's log or
 * skipped state, and the sessions later in the same week. Returns null when the
 * date is outside every plan week, so there is nothing to read.
 */
async function loadDay(
	db: AppBindings['Variables']['db'],
	userId: string,
	date: string,
): Promise<{ input: DayInsightInput; ready: boolean } | null> {
	const found = await currentPlanWithWeeks(db, userId);
	if (!found) return null;
	const { goal, weeks } = found;
	const week = weeks.find((w) => w.startDate && w.endDate && date >= w.startDate && date <= w.endDate);
	if (!week || !week.startDate) return null;

	const sessions = await db
		.select()
		.from(schema.sessionsPlan)
		.where(eq(schema.sessionsPlan.planWeekId, week.id));
	const sessionIds = sessions.map((s) => s.id);
	const logs = sessionIds.length
		? (
				await Promise.all(
					chunk(sessionIds, 90).map((part) =>
						db
							.select()
							.from(schema.logs)
							.where(and(eq(schema.logs.userId, userId), inArray(schema.logs.sessionId, part))),
					),
				)
			).flat()
		: [];
	const states = sessionIds.length
		? await db
				.select()
				.from(schema.sessionStates)
				.where(
					and(
						eq(schema.sessionStates.userId, userId),
						inArray(schema.sessionStates.sessionId, sessionIds),
					),
				)
		: [];

	// The latest log per session, so a redone log is the one that counts.
	const logBySession = new Map<string, (typeof logs)[number]>();
	for (const l of logs) {
		if (!l.sessionId) continue;
		const prev = logBySession.get(l.sessionId);
		const at = l.createdAt instanceof Date ? l.createdAt.getTime() : 0;
		const prevAt = prev?.createdAt instanceof Date ? prev.createdAt.getTime() : 0;
		if (!prev || at >= prevAt) logBySession.set(l.sessionId, l);
	}
	const skipped = new Set(
		states.filter((s) => s.state === 'skipped').map((s) => s.sessionId),
	);

	const dayOffset = dayIndexInWeek(week.startDate, date);
	const daySessions = sessions.filter((s) => s.day === dayOffset).sort(compareDaySessions);

	const workouts: InsightWorkoutInput[] = daySessions.map((s) => {
		const log = logBySession.get(s.id);
		const stats = log?.runStats ?? undefined;
		return {
			title: s.title ?? s.type,
			modality: s.modality,
			type: s.type,
			state: log ? 'logged' : skipped.has(s.id) ? 'skipped' : 'pending',
			plannedDistanceKm: s.prescription?.targetDistanceKm ?? null,
			plannedPaceSecPerKm: s.prescription?.targetPaceSecPerKm ?? null,
			plannedDurationMin: s.durationMin ?? null,
			actualDistanceKm: stats?.distanceKm ?? null,
			actualDurationSec: stats?.durationSec ?? null,
			actualPaceSecPerKm: stats?.avgPaceSecPerKm ?? null,
			rpe: log?.rpe ?? null,
			feedback: log?.feedback ?? null,
			notes: log?.notes ?? null,
			loggedAt:
				log?.startedAt instanceof Date
					? log.startedAt.toISOString()
					: typeof log?.startedAt === 'string'
						? log.startedAt
						: null,
		};
	});

	// The day is ready to read once every planned session is logged or skipped.
	const ready =
		daySessions.length > 0 &&
		daySessions.every((s) => logBySession.has(s.id) || skipped.has(s.id));

	const weekAhead: InsightAheadInput[] = sessions
		.filter((s) => s.day > dayOffset)
		.sort(compareDaySessions)
		.map((s) => {
			const aheadDate = new Date(
				Date.parse(`${week.startDate}T00:00:00Z`) + s.day * 86400000,
			)
				.toISOString()
				.slice(0, 10);
			return {
				date: aheadDate,
				title: s.title ?? s.type,
				plannedDistanceKm: s.prescription?.targetDistanceKm ?? null,
			};
		});

	return {
		input: {
			date,
			goalName: GOAL_PROFILES.find((p) => p.slug === goal.goalProfileSlug)?.name ?? goal.goalProfileSlug,
			weekNumber: week.weekNumber,
			phase: week.phase,
			workouts,
			weekAhead,
		},
		ready,
	};
}

/** GET /insights?date=YYYY-MM-DD: the stored read for the date, and whether it is stale. */
insights.get('/', zValidator('query', dateSchema), async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');
	const { date } = c.req.valid('query');

	const day = await loadDay(db, user.id, date);
	const prefs = await loadPrefs(db, user.id);
	const fingerprint = day ? buildDayInsight(day.input, prefs).fingerprint : null;

	const row = (
		await db
			.select()
			.from(schema.dayInsights)
			.where(and(eq(schema.dayInsights.userId, user.id), eq(schema.dayInsights.date, date)))
			.limit(1)
	)[0];

	return c.json({
		insight: row
			? {
					body: row.body,
					createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
					stale: fingerprint != null && row.fingerprint !== fingerprint,
				}
			: null,
	});
});

/** POST /insights: write the day's read on request, once per day. */
insights.post('/', zValidator('json', dateSchema), async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');
	const { date } = c.req.valid('json');

	const day = await loadDay(db, user.id, date);
	if (!day || !day.input.workouts.length) {
		return c.json({ error: 'no_workouts', message: 'There is nothing logged to read on this day.' }, 400);
	}
	if (!day.ready) {
		return c.json(
			{
				error: 'not_ready',
				message: 'Log or skip every workout on this day to get an insight.',
			},
			409,
		);
	}

	const prefs = await loadPrefs(db, user.id);
	const { facts, fingerprint } = buildDayInsight(day.input, prefs);

	const existing = (
		await db
			.select()
			.from(schema.dayInsights)
			.where(and(eq(schema.dayInsights.userId, user.id), eq(schema.dayInsights.date, date)))
			.limit(1)
	)[0];

	// One generation per day's logged set: unchanged logs return the stored text.
	if (existing && existing.fingerprint === fingerprint) {
		return c.json({
			insight: {
				body: existing.body,
				createdAt:
					existing.createdAt instanceof Date ? existing.createdAt.toISOString() : existing.createdAt,
				stale: false,
			},
		});
	}

	const rl = await checkRateLimit(c.env.DB, `insight:${user.id}`, 20, 3600);
	if (!rl.ok) return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });

	const body = await generateDayInsight(c.env, facts);
	if (!body) {
		return c.json(
			{ error: 'unavailable', message: 'Could not write an insight just now. Try again.' },
			502,
		);
	}

	const now = new Date();
	await db
		.insert(schema.dayInsights)
		.values({ id: crypto.randomUUID(), userId: user.id, date, body, fingerprint, createdAt: now })
		.onConflictDoUpdate({
			target: [schema.dayInsights.userId, schema.dayInsights.date],
			set: { body, fingerprint, createdAt: now },
		});

	return c.json({ insight: { body, createdAt: now.toISOString(), stale: false } });
});

export default insights;

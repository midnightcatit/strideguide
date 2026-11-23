import { and, desc, eq, inArray } from 'drizzle-orm';
import {
	activityToRunStats,
	matchActivity,
	shouldAttachImportLog,
	type MatchCandidate,
	type MatchSessionLike,
} from '@strideguide/shared/plan';
import { schema } from '../db';
import type { Db } from '../db';

/** A planned session with the calendar date it falls on already resolved. */
export interface PlannedSessionInfo extends MatchSessionLike {
	weekNumber: number;
	title: string | null;
}

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

/** The calendar date for a session, from its week start and day index. */
export function sessionDate(weekStart: string | null, day: number): string | null {
	if (!weekStart) return null;
	const d = new Date(`${weekStart}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return null;
	d.setUTCDate(d.getUTCDate() + day);
	return d.toISOString().slice(0, 10);
}

/** Every session in the runner's current plan, dated, so the matcher can use it. */
export async function loadPlannedSessions(db: Db, userId: string): Promise<PlannedSessionInfo[]> {
	const goal = (
		await db
			.select()
			.from(schema.userGoals)
			.where(eq(schema.userGoals.userId, userId))
			.orderBy(desc(schema.userGoals.createdAt))
			.limit(1)
	)[0];
	if (!goal) return [];
	const plan = (
		await db
			.select()
			.from(schema.plans)
			.where(eq(schema.plans.userGoalId, goal.id))
			.orderBy(desc(schema.plans.version))
			.limit(1)
	)[0];
	if (!plan) return [];
	const weeks = await db
		.select()
		.from(schema.planWeeks)
		.where(eq(schema.planWeeks.planId, plan.id));
	if (!weeks.length) return [];
	const weekById = new Map(weeks.map((w) => [w.id, w]));
	const sessions = (
		await Promise.all(
			chunk(weeks.map((w) => w.id), 90).map((part) =>
				db.select().from(schema.sessionsPlan).where(inArray(schema.sessionsPlan.planWeekId, part)),
			),
		)
	).flat();

	const out: PlannedSessionInfo[] = [];
	for (const s of sessions) {
		const week = weekById.get(s.planWeekId);
		const date = sessionDate(week?.startDate ?? null, s.day);
		if (!date) continue;
		const rx = (s.prescription ?? {}) as { targetDistanceKm?: number };
		out.push({
			id: s.id,
			date,
			modality: s.modality,
			type: s.type,
			title: s.title,
			targetDistanceKm: typeof rx.targetDistanceKm === 'number' ? rx.targetDistanceKm : null,
			durationMin: s.durationMin,
			weekNumber: week?.weekNumber ?? 0,
		});
	}
	return out;
}

/** True when the session belongs to a plan owned by this user. */
export async function sessionOwnedBy(db: Db, userId: string, sessionId: string): Promise<boolean> {
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
			.select({ id: schema.userGoals.id })
			.from(schema.userGoals)
			.where(and(eq(schema.userGoals.id, plan.userGoalId), eq(schema.userGoals.userId, userId)))
			.limit(1)
	)[0];
	return !!goal;
}

type ActivityRow = typeof schema.activities.$inferSelect;

/**
 * Attach an imported activity's log to its session, so the existing analytics
 * (adherence, weekly volume, pace, heart rate) pick it up with no new logic.
 * Skipped when the runner has already logged the session by hand, so the same
 * session never counts twice. Returns whether a log was written.
 */
export async function attachImportLog(
	db: Db,
	userId: string,
	activity: ActivityRow,
	sessionId: string,
): Promise<boolean> {
	const existing = await db
		.select({ id: schema.logs.id, source: schema.logs.source })
		.from(schema.logs)
		.where(and(eq(schema.logs.userId, userId), eq(schema.logs.sessionId, sessionId)));
	if (!shouldAttachImportLog(existing)) return false;

	const stats = activityToRunStats({
		modality: activity.modality,
		startedAt: activity.startedAt.toISOString(),
		durationSec: activity.durationSec,
		distanceM: activity.distanceM,
		avgPaceSecPerKm: activity.avgPaceSecPerKm,
		avgHr: activity.avgHr,
	});
	const startedAt = activity.startedAt;
	const endedAt =
		activity.durationSec != null ? new Date(startedAt.getTime() + activity.durationSec * 1000) : null;

	await db.insert(schema.logs).values({
		id: crypto.randomUUID(),
		userId,
		sessionId,
		startedAt,
		endedAt,
		runStats: Object.keys(stats).length ? stats : null,
		strengthSets: null,
		source: 'import',
	});
	return true;
}

/** The matcher's read of an activity row against the plan. */
export function proposeMatch(
	activity: ActivityRow,
	sessions: PlannedSessionInfo[],
): { best: MatchCandidate | null; candidates: MatchCandidate[] } {
	return matchActivity(
		{
			modality: activity.modality,
			startedAt: activity.startedAt.toISOString(),
			durationSec: activity.durationSec,
			distanceM: activity.distanceM,
		},
		sessions,
	);
}

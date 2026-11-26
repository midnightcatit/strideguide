import { Hono } from 'hono';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { GOAL_PROFILES } from '@strideguide/shared';
import type {
	Baseline,
	PlanInput,
	PlannedWeek,
	SessionArchetype,
	SessionPrescription,
} from '@strideguide/shared';
import { rebuildFromWeekOne, type WeekOneSession } from '@strideguide/shared/plan';
import { ageFromBirthYear } from '@strideguide/shared/units';
import { schema } from '../db';
import { requireAdmin } from '../middleware/auth';
import { compareDaySessions } from '../lib/session-order';
import { templateWeekSummary } from '../lib/narration';
import { manualSyncConnection } from '../lib/sync';
import {
	buildAdminAction,
	clampAdminLimit,
	disableRefusal,
	floorAdminOffset,
	isRootAdminEmail,
	normalizeAdminSearch,
	parseAdminEmails,
	projectAdminUser,
	projectAdminUserDetail,
	resolveAdminState,
	toIsoTimestamp,
	type AdminUserAggregate,
	type AdminUserDetailAggregate,
} from '../lib/admin';
import {
	chunk,
	currentPlanWithWeeks,
	loadPrefs,
	replaceWeeks,
	resolveMachines,
	type DesiredWeek,
	type StoredWeek,
} from './plans';
import type { AppBindings } from '../types';

const admin = new Hono<AppBindings>();

/** How far back the ops summary counts errors, and how many it lists per source. */
const RECENT_WINDOW_SECONDS = 24 * 60 * 60;
const RECENT_ITEMS = 10;

/** The signed-in user's own admin state, so the web can show or hide the entry.
 * Open to any signed-in user: it reports false rather than 403 for a non-admin. */
admin.get('/me', async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ error: 'unauthorized' }, 401);
	const state = await resolveAdminState(c.env, c.get('db'), user);
	return c.json(state);
});

/**
 * Metadata-only user list, with paging and an email search. The projection
 * deliberately selects counts, dates and identifiers and never a runner's health
 * metric values, health samples, log contents, notes, RPE, run stats, routes or
 * any other private content. Each column is named explicitly, and each aggregate
 * reads only a count or a max, so a new column on any table can never ride along
 * by accident.
 */
admin.get('/users', requireAdmin, async (c) => {
	const limit = clampAdminLimit(c.req.query('limit'));
	const offset = floorAdminOffset(c.req.query('offset'));
	const q = normalizeAdminSearch(c.req.query('q'));
	// A case-insensitive substring match on the email. lower() on both sides so
	// the match does not depend on SQLite's ASCII-only LIKE folding.
	const filter = q ? sql`lower(${schema.users.email}) like ${`%${q.toLowerCase()}%`}` : undefined;
	const db = c.get('db');

	const rows = await db
		.select({
			id: schema.users.id,
			email: schema.users.email,
			createdAt: schema.users.createdAt,
			role: schema.users.role,
			disabledAt: schema.users.disabledAt,
			goalProfileSlug: sql<string | null>`(
				select ug.goal_profile_slug from user_goals ug
				where ug.user_id = users.id and ug.status = 'active'
				order by ug.created_at desc limit 1
			)`,
			planCount: sql<number>`(
				select count(*) from plans p
				join user_goals ug on p.user_goal_id = ug.id
				where ug.user_id = users.id
			)`,
			lastLogAt: sql<number | null>`(
				select max(l.started_at) from logs l where l.user_id = users.id
			)`,
			connectionCount: sql<number>`(
				select count(*) from connections c where c.user_id = users.id
			)`,
			errorConnectionCount: sql<number>`(
				select count(*) from connections c
				where c.user_id = users.id and c.status = 'error'
			)`,
		})
		.from(schema.users)
		.where(filter)
		.orderBy(desc(schema.users.createdAt))
		.limit(limit)
		.offset(offset);

	const totalRows = await db
		.select({ n: sql<number>`count(*)` })
		.from(schema.users)
		.where(filter);

	const rootEmails = parseAdminEmails(c.env.ADMIN_EMAILS);
	const users = rows.map((row) =>
		projectAdminUser(row as AdminUserAggregate, rootEmails.has(row.email.toLowerCase())),
	);
	return c.json({ users, total: totalRows[0]?.n ?? 0, limit, offset });
});

/**
 * Operational metadata for the admin view: recent API and client error counts,
 * the latest handful of each, and a rate-limiter summary. Error rows carry only
 * the fields an operator needs to triage (name, message, path, method, time) and
 * no user id or other user content.
 */
admin.get('/ops', requireAdmin, async (c) => {
	const db = c.get('db');
	const since = new Date(Date.now() - RECENT_WINDOW_SECONDS * 1000);

	const [appErrorCount, clientErrorCount, appErrorItems, clientErrorItems, rateLimits] =
		await Promise.all([
			db
				.select({ n: sql<number>`count(*)` })
				.from(schema.appErrors)
				.where(gt(schema.appErrors.createdAt, since)),
			db
				.select({ n: sql<number>`count(*)` })
				.from(schema.clientErrors)
				.where(gt(schema.clientErrors.createdAt, since)),
			db
				.select({
					createdAt: schema.appErrors.createdAt,
					name: schema.appErrors.name,
					message: schema.appErrors.message,
					path: schema.appErrors.path,
					method: schema.appErrors.method,
				})
				.from(schema.appErrors)
				.orderBy(desc(schema.appErrors.createdAt))
				.limit(RECENT_ITEMS),
			db
				.select({
					createdAt: schema.clientErrors.createdAt,
					kind: schema.clientErrors.kind,
					message: schema.clientErrors.message,
					url: schema.clientErrors.url,
				})
				.from(schema.clientErrors)
				.orderBy(desc(schema.clientErrors.createdAt))
				.limit(RECENT_ITEMS),
			db
				.select({
					keys: sql<number>`count(*)`,
					totalCount: sql<number>`coalesce(sum(${schema.rateLimits.count}), 0)`,
					newestWindowStart: sql<number | null>`max(${schema.rateLimits.windowStart})`,
				})
				.from(schema.rateLimits),
		]);

	const summary = rateLimits[0];
	return c.json({
		appErrors: {
			recentCount: appErrorCount[0]?.n ?? 0,
			items: appErrorItems.map((row) => ({
				at: toIsoTimestamp(row.createdAt),
				name: row.name,
				message: row.message,
				path: row.path,
				method: row.method,
			})),
		},
		clientErrors: {
			recentCount: clientErrorCount[0]?.n ?? 0,
			// A client error has a kind, not a name, and a url, not a path, and no
			// method. Mapped so both lists render the same way.
			items: clientErrorItems.map((row) => ({
				at: toIsoTimestamp(row.createdAt),
				name: row.kind,
				message: row.message,
				path: row.url,
				method: null,
			})),
		},
		rateLimits: {
			keys: summary?.keys ?? 0,
			totalCount: summary?.totalCount ?? 0,
			newestWindowStart: toIsoTimestamp(summary?.newestWindowStart ?? null),
		},
	});
});

/** The identity fields the detail and the disable rule need for one account. */
async function findAdminUserById(db: AppBindings['Variables']['db'], id: string) {
	const rows = await db
		.select({
			id: schema.users.id,
			email: schema.users.email,
			createdAt: schema.users.createdAt,
			role: schema.users.role,
			disabledAt: schema.users.disabledAt,
		})
		.from(schema.users)
		.where(eq(schema.users.id, id))
		.limit(1);
	return rows[0] ?? null;
}

/**
 * One user's admin detail, metadata only. Identity and role, the goals, the plans
 * with a week count, logs as a count and a date range, the connections, health
 * metric coverage as a count and a first and last date, and the recent audit rows
 * that target this user. No health value, log content, note, RPE, run stat or
 * route is read or returned. Returns null for an unknown id, so the route can 404.
 */
async function adminUserDetailPayload(
	env: AppBindings['Bindings'],
	db: AppBindings['Variables']['db'],
	id: string,
) {
	const user = await findAdminUserById(db, id);
	if (!user) return null;

	const goals = await db
		.select({
			slug: schema.userGoals.goalProfileSlug,
			targetDate: schema.userGoals.targetDate,
			status: schema.userGoals.status,
			createdAt: schema.userGoals.createdAt,
		})
		.from(schema.userGoals)
		.where(eq(schema.userGoals.userId, id))
		.orderBy(desc(schema.userGoals.createdAt));

	const plans = await db
		.select({
			version: schema.plans.version,
			generatedAt: schema.plans.generatedAt,
			status: schema.plans.status,
			weekCount: sql<number>`(
				select count(*) from plan_weeks pw where pw.plan_id = ${schema.plans.id}
			)`,
		})
		.from(schema.plans)
		.innerJoin(schema.userGoals, eq(schema.plans.userGoalId, schema.userGoals.id))
		.where(eq(schema.userGoals.userId, id))
		.orderBy(desc(schema.plans.version));

	const logRows = await db
		.select({
			count: sql<number>`count(*)`,
			earliest: sql<number | null>`min(${schema.logs.startedAt})`,
			latest: sql<number | null>`max(${schema.logs.startedAt})`,
		})
		.from(schema.logs)
		.where(eq(schema.logs.userId, id));

	const connections = await db
		.select({
			provider: schema.connections.provider,
			status: schema.connections.status,
			lastSyncedAt: schema.connections.lastSyncedAt,
			lastError: schema.connections.lastSyncFailedTypes,
		})
		.from(schema.connections)
		.where(eq(schema.connections.userId, id));

	// Coverage only: how many rows a metric has and the span it covers, never a
	// value. Grouped by the metric key so the shape does not change with the data.
	const healthCoverage = await db
		.select({
			metric: schema.healthMetrics.metric,
			rows: sql<number>`count(*)`,
			firstDate: sql<string | null>`min(${schema.healthMetrics.date})`,
			lastDate: sql<string | null>`max(${schema.healthMetrics.date})`,
		})
		.from(schema.healthMetrics)
		.where(eq(schema.healthMetrics.userId, id))
		.groupBy(schema.healthMetrics.metric)
		.orderBy(schema.healthMetrics.metric);

	const actions = await db
		.select({
			id: schema.adminActions.id,
			actorId: schema.adminActions.actorId,
			action: schema.adminActions.action,
			targetType: schema.adminActions.targetType,
			targetId: schema.adminActions.targetId,
			detail: schema.adminActions.detail,
			createdAt: schema.adminActions.createdAt,
		})
		.from(schema.adminActions)
		.where(and(eq(schema.adminActions.targetType, 'user'), eq(schema.adminActions.targetId, id)))
		.orderBy(desc(schema.adminActions.createdAt))
		.limit(RECENT_ITEMS);

	const aggregate: AdminUserDetailAggregate = {
		id: user.id,
		email: user.email,
		createdAt: user.createdAt,
		role: user.role,
		disabledAt: user.disabledAt,
		goals,
		plans,
		logs: logRows[0] ?? { count: 0, earliest: null, latest: null },
		connections,
		healthCoverage,
		actions,
	};
	return projectAdminUserDetail(aggregate, isRootAdminEmail(env.ADMIN_EMAILS, user.email));
}

/**
 * Rebuild a user's plan around their stored week one, the same rebuild the runner
 * triggers when they approve an edited week one. Weeks two onward are laid out
 * again; week one is never touched. Reuses rebuildFromWeekOne and replaceWeeks, so
 * no plan logic is duplicated. Deterministic: the best-effort model shaping pass
 * is skipped, so an admin rebuild always produces the engine's plan.
 */
async function rebuildUserPlanFromWeekOne(
	db: AppBindings['Variables']['db'],
	userId: string,
): Promise<{ ok: true; planId: string; weeks: number } | { ok: false; message: string }> {
	const found = await currentPlanWithWeeks(db, userId);
	if (!found) return { ok: false, message: 'This user has no plan to rebuild.' };
	const { goal, plan, weeks } = found;
	const firstWeek = weeks[0];
	if (!firstWeek) return { ok: false, message: 'This user has no plan to rebuild.' };

	const profile = GOAL_PROFILES.find((p) => p.slug === goal.goalProfileSlug);
	if (!profile) return { ok: false, message: "This user's goal profile is unknown." };

	const prefs = await loadPrefs(db, userId);
	const storedBaseline = (goal.baseline ?? {}) as Baseline;
	const age = storedBaseline.age ?? ageFromBirthYear(prefs.birthYear);
	const baseline: Baseline = {
		...storedBaseline,
		...(age != null ? { age } : {}),
		...(prefs.equipment ? { equipment: prefs.equipment } : {}),
		...(prefs.equipmentItems ? { equipmentItems: prefs.equipmentItems } : {}),
	};

	const weekIds = weeks.map((w) => w.id);
	const storedSessions = weekIds.length
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

	const toPlannedSession = (s: (typeof storedSessions)[number]) => ({
		day: s.day,
		slot: s.slot ?? 'AM',
		modality: s.modality,
		type: s.type as SessionArchetype,
		title: s.title ?? '',
		purpose: s.purpose ?? '',
		prescription: (s.prescription ?? {}) as SessionPrescription,
		durationMin: s.durationMin ?? 0,
	});

	const existingWeeks: PlannedWeek[] = weeks.map((w) => ({
		weekNumber: w.weekNumber,
		phase: w.phase ?? 'base',
		focus: w.focus ?? '',
		startDate: w.startDate ?? '',
		endDate: w.endDate ?? '',
		targetVolumeKm: 0,
		sessions: storedSessions
			.filter((s) => s.planWeekId === w.id)
			.sort(compareDaySessions)
			.map(toPlannedSession),
	}));

	// The stored week one is the approved week one: the rebuild lays out the rest
	// from it, exactly as the runner's own preview does.
	const weekOne: WeekOneSession[] = storedSessions
		.filter((s) => s.planWeekId === firstWeek.id)
		.sort(compareDaySessions)
		.map((s) => ({
			day: s.day,
			slot: s.slot ?? 'AM',
			modality: s.modality,
			type: s.type,
			title: s.title ?? undefined,
			purpose: s.purpose ?? undefined,
			prescription: s.prescription ?? {},
			durationMin: s.durationMin ?? undefined,
		}));

	const planInput: PlanInput = {
		profile,
		baseline,
		availableDays: (goal.availableDays as number[] | null)?.length
			? (goal.availableDays as number[])
			: [0, 2, 4],
		startDate: firstWeek.startDate ?? new Date().toISOString().slice(0, 10),
		targetDate: goal.targetDate ?? undefined,
		equipment: baseline.equipmentItems,
		machines: resolveMachines(prefs),
		favoriteMachines: prefs.favoriteMachines,
		favoriteWorkouts: prefs.favoriteWorkouts,
	};

	const { weeks: rebuilt } = rebuildFromWeekOne({ existingWeeks, weekOne, plan: planInput });

	const laterWeeks = rebuilt.filter((w) => w.weekNumber > firstWeek.weekNumber);
	const stored: StoredWeek[] = weeks.map((w) => ({
		id: w.id,
		weekNumber: w.weekNumber,
		sessions: storedSessions
			.filter((s) => s.planWeekId === w.id)
			.map((s) => ({ id: s.id, day: s.day, slot: s.slot, type: s.type })),
	}));
	const laterDesired: DesiredWeek[] = laterWeeks.map((w) => ({
		weekNumber: w.weekNumber,
		phase: w.phase,
		focus: w.focus,
		summaryText: templateWeekSummary(w.weekNumber, w.phase, w.targetVolumeKm),
		startDate: w.startDate,
		endDate: w.endDate,
		sessions: w.sessions.map((s) => ({
			day: s.day,
			slot: s.slot,
			modality: s.modality,
			type: s.type,
			title: s.title,
			purpose: s.purpose,
			prescription: s.prescription,
			durationMin: s.durationMin,
		})),
	}));
	await replaceWeeks(db, plan.id, stored, laterDesired);

	await db
		.update(schema.plans)
		.set({
			generatedAt: new Date(),
			model: 'engine',
			params: { ...(plan.params ?? {}), rebuiltAt: new Date().toISOString() },
		})
		.where(eq(schema.plans.id, plan.id));

	return { ok: true, planId: plan.id, weeks: rebuilt.length };
}

/** One user's metadata-only detail. 404 for an unknown id. */
admin.get('/users/:id', requireAdmin, async (c) => {
	const detail = await adminUserDetailPayload(c.env, c.get('db'), c.req.param('id'));
	if (!detail) return c.json({ error: 'not_found', message: 'No user with that id.' }, 404);
	return c.json(detail);
});

/**
 * Rebuild the target user's plan from week one and return the refreshed detail.
 * Writes one audit row so the change is traceable to the acting admin.
 */
admin.post('/users/:id/rebuild-plan', requireAdmin, async (c) => {
	const actor = c.get('user')!;
	const id = c.req.param('id');
	const db = c.get('db');
	if (!(await findAdminUserById(db, id))) {
		return c.json({ error: 'not_found', message: 'No user with that id.' }, 404);
	}

	const result = await rebuildUserPlanFromWeekOne(db, id);
	if (!result.ok) return c.json({ error: 'no_plan', message: result.message }, 400);

	await db.insert(schema.adminActions).values(
		buildAdminAction({
			actorId: actor.id,
			action: 'rebuild_plan',
			targetType: 'user',
			targetId: id,
			detail: { planId: result.planId, weeks: result.weeks },
		}),
	);
	return c.json(await adminUserDetailPayload(c.env, db, id));
});

/**
 * Sync the target user's connections, reusing the app's own manual sync path, and
 * return the refreshed detail. Writes one audit row with the per-provider result.
 */
admin.post('/users/:id/sync', requireAdmin, async (c) => {
	const actor = c.get('user')!;
	const id = c.req.param('id');
	const db = c.get('db');
	if (!(await findAdminUserById(db, id))) {
		return c.json({ error: 'not_found', message: 'No user with that id.' }, 404);
	}

	const rows = await db
		.select()
		.from(schema.connections)
		.where(eq(schema.connections.userId, id));
	if (rows.length === 0) {
		return c.json(
			{ error: 'no_connections', message: 'This user has no connections to sync.' },
			400,
		);
	}

	const results: {
		provider: string;
		synced: number;
		cached: boolean;
		lastSyncedAt: string;
	}[] = [];
	for (const row of rows) {
		const outcome = await manualSyncConnection(c.env, db, row);
		results.push({
			provider: row.provider,
			synced: outcome.synced,
			cached: outcome.cached,
			lastSyncedAt: outcome.lastSyncedAt,
		});
	}

	await db.insert(schema.adminActions).values(
		buildAdminAction({
			actorId: actor.id,
			action: 'sync_user',
			targetType: 'user',
			targetId: id,
			detail: { connections: results },
		}),
	);
	return c.json(await adminUserDetailPayload(c.env, db, id));
});

/**
 * Soft-disable the target user: mark the account disabled and drop its sessions,
 * so it can no longer sign in or use the API. A root admin, another admin, or the
 * acting admin themselves is refused with a 400 and a plain message. Never
 * deletes anything. Writes one audit row.
 */
admin.post('/users/:id/disable', requireAdmin, async (c) => {
	const actor = c.get('user')!;
	const id = c.req.param('id');
	const db = c.get('db');
	const user = await findAdminUserById(db, id);
	if (!user) return c.json({ error: 'not_found', message: 'No user with that id.' }, 404);

	const refusal = disableRefusal(
		{ id: user.id, role: user.role, isRoot: isRootAdminEmail(c.env.ADMIN_EMAILS, user.email) },
		actor.id,
	);
	if (refusal) return c.json({ error: 'cannot_disable', message: refusal }, 400);

	await db
		.update(schema.users)
		.set({ disabledAt: new Date() })
		.where(eq(schema.users.id, id));
	// Kill the user's existing sessions so disabling takes effect on every device.
	await db.delete(schema.authSessions).where(eq(schema.authSessions.userId, id));

	await db.insert(schema.adminActions).values(
		buildAdminAction({
			actorId: actor.id,
			action: 'disable_user',
			targetType: 'user',
			targetId: id,
			detail: null,
		}),
	);
	return c.json(await adminUserDetailPayload(c.env, db, id));
});

/**
 * Re-enable a disabled account. Always allowed, for any target, including a root
 * admin. Writes one audit row and returns the refreshed detail.
 */
admin.post('/users/:id/enable', requireAdmin, async (c) => {
	const actor = c.get('user')!;
	const id = c.req.param('id');
	const db = c.get('db');
	if (!(await findAdminUserById(db, id))) {
		return c.json({ error: 'not_found', message: 'No user with that id.' }, 404);
	}

	await db.update(schema.users).set({ disabledAt: null }).where(eq(schema.users.id, id));

	await db.insert(schema.adminActions).values(
		buildAdminAction({
			actorId: actor.id,
			action: 'enable_user',
			targetType: 'user',
			targetId: id,
			detail: null,
		}),
	);
	return c.json(await adminUserDetailPayload(c.env, db, id));
});

export default admin;
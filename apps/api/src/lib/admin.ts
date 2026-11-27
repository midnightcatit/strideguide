import { eq } from 'drizzle-orm';
import { schema } from '../db';
import type { Db } from '../db';
import type { Env } from '../env';

export type AdminRole = 'user' | 'admin';

/** Where a user's admin state comes from. Root admins are config, never stored. */
export interface AdminState {
	isAdmin: boolean;
	isRoot: boolean;
}

/**
 * Parse the ADMIN_EMAILS var into a lowercase set, dropping blanks, so a value
 * like `"A@x.com, b@y.com,"` matches regardless of case or spacing. An unset or
 * empty value yields an empty set, so no one is a root admin and the surface
 * fails closed.
 */
export function parseAdminEmails(raw: string | null | undefined): Set<string> {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((email) => email.trim().toLowerCase())
			.filter((email) => email.length > 0),
	);
}

/** True when the email is a configured root admin. Matched case-insensitively. */
export function isRootAdminEmail(
	raw: string | null | undefined,
	email: string | null | undefined,
): boolean {
	if (!email) return false;
	return parseAdminEmails(raw).has(email.trim().toLowerCase());
}

/**
 * Resolve whether the signed-in user is an admin. A root admin email is always
 * admin; otherwise the stored users.role decides. Returns false for anyone else,
 * so callers treat a missing row as not an admin.
 */
export async function resolveAdminState(
	env: Env,
	db: Db,
	user: { id: string; email: string },
): Promise<AdminState> {
	if (isRootAdminEmail(env.ADMIN_EMAILS, user.email)) {
		return { isAdmin: true, isRoot: true };
	}
	const rows = await db
		.select({ role: schema.users.role })
		.from(schema.users)
		.where(eq(schema.users.id, user.id))
		.limit(1);
	return { isAdmin: rows[0]?.role === 'admin', isRoot: false };
}

/** The raw aggregate a users query returns for one account, before projection. */
export interface AdminUserAggregate {
	id: string;
	email: string;
	createdAt: Date | number | null;
	role: AdminRole;
	disabledAt: Date | number | null;
	deletedAt: Date | number | null;
	goalProfileSlug: string | null;
	planCount: number | null;
	lastLogAt: number | null;
	connectionCount: number | null;
	errorConnectionCount: number | null;
}

/**
 * One row of the admin user list. Metadata only: identity, the role, and counts
 * and dates that describe use. It deliberately has no health metric values,
 * health samples, log contents, notes, RPE, run stats, routes or any other
 * content a runner would consider private.
 */
export interface AdminUserRow {
	id: string;
	email: string;
	createdAt: string | null;
	role: AdminRole;
	isRoot: boolean;
	disabled: boolean;
	deleted: boolean;
	goalProfileSlug: string | null;
	planCount: number;
	lastLogAt: string | null;
	connectionCount: number;
	connectionStatus: 'connected' | 'error' | null;
}

/** Seconds or a Date or null to an ISO string, or null when there is no value. */
export function toIsoTimestamp(value: Date | number | null | undefined): string | null {
	if (value === null || value === undefined) return null;
	const date = value instanceof Date ? value : new Date(value * 1000);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * The fixed-window limit and window length for each rate-limit key prefix. The
 * call sites in routes/ pass these same numbers to checkRateLimit, and a key is
 * shaped `<prefix>:<id>`. The rate_limits table keeps only the window start and
 * the count, so this is where the limit and the window length come from when the
 * admin view renders how full each window is. A prefix not listed here still
 * shows its count, with no limit or window end, so a new limiter degrades
 * visibly rather than silently reading as unlimited.
 */
export const RATE_LIMIT_POLICIES: Record<string, { limit: number; windowSec: number }> = {
	'auth-start:': { limit: 30, windowSec: 600 },
	'auth-logout:': { limit: 30, windowSec: 60 },
	'auth-me:': { limit: 120, windowSec: 60 },
	'auth:': { limit: 30, windowSec: 600 },
	'generate:': { limit: 20, windowSec: 3600 },
	'adapt:': { limit: 30, windowSec: 3600 },
	'preview:': { limit: 30, windowSec: 3600 },
	'insight:': { limit: 20, windowSec: 3600 },
	'clienterr:': { limit: 60, windowSec: 3600 },
	'ai:': { limit: 40, windowSec: 3600 },
	'jev:': { limit: 40, windowSec: 3600 },
};

/** The limit and window length for a key, by its longest matching prefix. */
export function rateLimitPolicyForKey(key: string): { limit: number; windowSec: number } | null {
	let match: { limit: number; windowSec: number } | null = null;
	let matchLen = 0;
	for (const [prefix, policy] of Object.entries(RATE_LIMIT_POLICIES)) {
		if (key.startsWith(prefix) && prefix.length > matchLen) {
			match = policy;
			matchLen = prefix.length;
		}
	}
	return match;
}

/** One rate_limits row as the admin summary reads it. */
export interface RateLimitAggregate {
	key: string;
	windowStart: number;
	count: number;
}

/** One rate-limit window as the admin view shows it. */
export interface AdminRateLimitEntry {
	key: string;
	used: number;
	limit: number | null;
	windowStart: string | null;
	windowEnd: string | null;
}

/**
 * Shape one rate_limits row for the admin view: the count used, the configured
 * limit, and the window span, with the end derived from the start plus the
 * window length. A key whose prefix has no configured policy keeps its count and
 * start, with a null limit and end.
 */
export function projectRateLimit(row: RateLimitAggregate): AdminRateLimitEntry {
	const policy = rateLimitPolicyForKey(row.key);
	return {
		key: row.key,
		used: row.count,
		limit: policy?.limit ?? null,
		windowStart: toIsoTimestamp(row.windowStart),
		windowEnd: policy ? toIsoTimestamp(row.windowStart + policy.windowSec) : null,
	};
}

/**
 * Shape one aggregate into the metadata-only admin user row. Fields are picked
 * one by one and never spread, so a new column on any source table can never
 * ride along. This is the single place that decides what the admin user list may
 * expose.
 */
export function projectAdminUser(row: AdminUserAggregate, isRoot: boolean): AdminUserRow {
	const connectionCount = row.connectionCount ?? 0;
	return {
		id: row.id,
		email: row.email,
		createdAt: toIsoTimestamp(row.createdAt),
		role: row.role,
		isRoot,
		disabled: row.disabledAt != null,
		deleted: row.deletedAt != null,
		goalProfileSlug: row.goalProfileSlug,
		planCount: row.planCount ?? 0,
		lastLogAt: toIsoTimestamp(row.lastLogAt),
		connectionCount,
		connectionStatus:
			connectionCount === 0 ? null : (row.errorConnectionCount ?? 0) > 0 ? 'error' : 'connected',
	};
}

/** Paging bounds for the admin user list. */
export const ADMIN_USERS_DEFAULT_LIMIT = 25;
export const ADMIN_USERS_MAX_LIMIT = 100;

/**
 * The page size for the admin user list: the requested value, else the default,
 * clamped to 1..100. A missing, blank or non-numeric value falls back to the
 * default rather than reading as zero, so a bad query never returns nothing.
 */
export function clampAdminLimit(raw: string | number | null | undefined): number {
	const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
	if (!Number.isFinite(n)) return ADMIN_USERS_DEFAULT_LIMIT;
	return Math.min(ADMIN_USERS_MAX_LIMIT, Math.max(1, Math.floor(n)));
}

/** The row offset for the admin user list: the requested value floored at zero. */
export function floorAdminOffset(raw: string | number | null | undefined): number {
	const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
	if (!Number.isFinite(n) || n < 0) return 0;
	return Math.floor(n);
}

/** A trimmed email search term, or an empty string when none was given. */
export function normalizeAdminSearch(raw: string | null | undefined): string {
	return (raw ?? '').trim();
}

/** The fields one admin mutation writes to the audit trail. */
export interface AdminActionInput {
	actorId: string;
	action: string;
	targetType: string;
	targetId: string | null;
	detail?: unknown;
}

/** One audit row, ready to insert: the input plus a fresh id and timestamp. */
export interface AdminActionRow {
	id: string;
	actorId: string;
	action: string;
	targetType: string;
	targetId: string | null;
	detail: unknown;
	createdAt: Date;
}

/**
 * Shape one admin action for the audit table. Kept pure so every mutation writes
 * the same fields through one place, and the shape is cheap to test.
 */
export function buildAdminAction(input: AdminActionInput): AdminActionRow {
	return {
		id: crypto.randomUUID(),
		actorId: input.actorId,
		action: input.action,
		targetType: input.targetType,
		targetId: input.targetId ?? null,
		detail: input.detail ?? null,
		createdAt: new Date(),
	};
}

/** An email as stored and compared: trimmed and lowercased. */
export function normalizeEmail(raw: string | null | undefined): string {
	return (raw ?? '').trim().toLowerCase();
}

/** The target of a disable, soft delete or permanent delete, as the rule needs it. */
export interface DisableTarget {
	id: string;
	role: AdminRole;
	isRoot: boolean;
}

/** The verb the refusal message reads with, so one rule covers every removal. */
export type RemovalVerb = 'disable' | 'delete' | 'permanently delete';

/**
 * Why a removal is refused, or null when it is allowed. A root admin, another
 * admin, or the acting admin themselves can never be disabled or deleted. Pure so
 * the rule is testable without a route or a database.
 */
export function removalRefusal(
	target: DisableTarget,
	actorId: string,
	verb: RemovalVerb,
): string | null {
	if (target.id === actorId) return `You cannot ${verb} your own account.`;
	if (target.isRoot) return `You cannot ${verb} a root admin.`;
	if (target.role === 'admin') return `You cannot ${verb} another admin.`;
	return null;
}

/** The disable case of the removal rule, kept as its own name for the route. */
export function disableRefusal(target: DisableTarget, actorId: string): string | null {
	return removalRefusal(target, actorId, 'disable');
}

/** A raw goal row for the detail view, before projection. */
export interface AdminGoalAggregate {
	slug: string;
	targetDate: string | null;
	status: string;
	createdAt: Date | number | null;
}

/** A raw plan row for the detail view, before projection. */
export interface AdminPlanAggregate {
	version: number;
	generatedAt: Date | number | null;
	weekCount: number;
	status: string;
}

/** A raw connection row for the detail view, before projection. */
export interface AdminConnectionAggregate {
	provider: string;
	status: string;
	lastSyncedAt: Date | number | null;
	/** The failed data-type list from the last sync, the only error detail the row keeps. */
	lastError: string | null;
}

/** A raw health coverage row for the detail view, before projection. */
export interface AdminMetricCoverageAggregate {
	metric: string;
	rows: number;
	firstDate: string | null;
	lastDate: string | null;
}

/** A raw audit row for the detail view, before projection. */
export interface AdminAuditAggregate {
	id: string;
	actorId: string;
	action: string;
	targetType: string;
	targetId: string | null;
	detail: unknown;
	createdAt: Date | number | null;
}

/** The raw pieces a user detail is built from, before projection. */
export interface AdminUserDetailAggregate {
	id: string;
	email: string;
	createdAt: Date | number | null;
	role: AdminRole;
	disabledAt: Date | number | null;
	deletedAt: Date | number | null;
	goals: AdminGoalAggregate[];
	plans: AdminPlanAggregate[];
	logs: { count: number; earliest: Date | number | null; latest: Date | number | null };
	connections: AdminConnectionAggregate[];
	healthCoverage: AdminMetricCoverageAggregate[];
	actions: AdminAuditAggregate[];
}

/**
 * One user's admin detail. Metadata only, and the same discipline as the list:
 * identity and role, goals, plans, logs as counts and a date range, connections,
 * health metric coverage as count and first/last date, and the audit rows that
 * target this user. It never carries a health value, a log note, RPE, run stats,
 * a route, or any other content. Every field is named one by one and never
 * spread, so a new column on any source table cannot leak.
 */
export interface AdminUserDetail {
	id: string;
	email: string;
	createdAt: string | null;
	role: AdminRole;
	isRoot: boolean;
	disabled: boolean;
	disabledAt: string | null;
	deleted: boolean;
	deletedAt: string | null;
	goals: { slug: string; targetDate: string | null; status: string; createdAt: string | null }[];
	plans: { version: number; generatedAt: string | null; weekCount: number; status: string }[];
	logs: { count: number; earliest: string | null; latest: string | null };
	connections: {
		provider: string;
		status: string;
		lastSyncedAt: string | null;
		lastError: string | null;
	}[];
	healthCoverage: {
		metric: string;
		rows: number;
		firstDate: string | null;
		lastDate: string | null;
	}[];
	actions: {
		id: string;
		actorId: string;
		action: string;
		targetType: string;
		targetId: string | null;
		detail: unknown;
		createdAt: string | null;
	}[];
}

export function projectAdminUserDetail(
	aggregate: AdminUserDetailAggregate,
	isRoot: boolean,
): AdminUserDetail {
	return {
		id: aggregate.id,
		email: aggregate.email,
		createdAt: toIsoTimestamp(aggregate.createdAt),
		role: aggregate.role,
		isRoot,
		disabled: aggregate.disabledAt != null,
		disabledAt: toIsoTimestamp(aggregate.disabledAt),
		deleted: aggregate.deletedAt != null,
		deletedAt: toIsoTimestamp(aggregate.deletedAt),
		goals: aggregate.goals.map((g) => ({
			slug: g.slug,
			targetDate: g.targetDate,
			status: g.status,
			createdAt: toIsoTimestamp(g.createdAt),
		})),
		plans: aggregate.plans.map((p) => ({
			version: p.version,
			generatedAt: toIsoTimestamp(p.generatedAt),
			weekCount: p.weekCount,
			status: p.status,
		})),
		logs: {
			count: aggregate.logs.count,
			earliest: toIsoTimestamp(aggregate.logs.earliest),
			latest: toIsoTimestamp(aggregate.logs.latest),
		},
		connections: aggregate.connections.map((c) => ({
			provider: c.provider,
			status: c.status,
			lastSyncedAt: toIsoTimestamp(c.lastSyncedAt),
			lastError: c.lastError,
		})),
		healthCoverage: aggregate.healthCoverage.map((m) => ({
			metric: m.metric,
			rows: m.rows,
			firstDate: m.firstDate,
			lastDate: m.lastDate,
		})),
		actions: aggregate.actions.map((a) => ({
			id: a.id,
			actorId: a.actorId,
			action: a.action,
			targetType: a.targetType,
			targetId: a.targetId,
			detail: a.detail,
			createdAt: toIsoTimestamp(a.createdAt),
		})),
	};
}

/**
 * One plan row as the load-shadow query returns it, with the load model's read
 * pulled out of `plans.params` by json_extract. The shadow array comes back as a
 * JSON string, so it is parsed below.
 */
export interface LoadShadowPlanRow {
	planId: string;
	email: string;
	mode: string | null;
	fitness: number | null;
	fatigue: number | null;
	form: number | null;
	at: string | null;
	/** The `loadModel.shadow` array, as a JSON string from json_extract. */
	shadow: string | null;
}

/** One ease or hold the model would have made, flattened for the admin table. */
export interface LoadShadowDecision {
	planId: string;
	email: string;
	at: string | null;
	mode: string | null;
	weekNumber: number | null;
	intent: string | null;
	fromVolumeKm: number | null;
	toVolumeKm: number | null;
	reason: string | null;
	fitness: number | null;
	fatigue: number | null;
	form: number | null;
}

/** The cross-user load view: a summary and the recent decisions behind it. */
export interface LoadShadowView {
	summary: {
		plans: number;
		users: number;
		records: number;
		ease: number;
		hold: number;
		byMode: Record<string, number>;
	};
	decisions: LoadShadowDecision[];
}

function parseShadowArray(raw: string | null): unknown[] {
	if (!raw) return [];
	try {
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function num(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Flatten the stored load records into table rows, newest first (the rows arrive
 * ordered by their read time), and count them across accounts. A plan with
 * shadow entries gets one row per entry. A plan whose record has no shadow
 * entries, because the model found nothing to change or ran in a mode that did
 * not record a change, gets one row with no week, so the read is still visible.
 * Metadata only: it names the plan, the week, the intent and the modelled
 * numbers, and never any content from the runner's logs. `limit` caps the rows
 * returned, not the aggregate.
 */
export function projectLoadShadow(rows: LoadShadowPlanRow[], limit: number): LoadShadowView {
	const decisions: LoadShadowDecision[] = [];
	const users = new Set<string>();
	const byMode: Record<string, number> = {};
	let plans = 0;
	let ease = 0;
	let hold = 0;
	for (const row of rows) {
		plans += 1;
		users.add(row.email);
		const mode = row.mode ?? 'unknown';
		byMode[mode] = (byMode[mode] ?? 0) + 1;
		const entries = parseShadowArray(row.shadow);
		if (entries.length === 0) {
			if (decisions.length < limit) {
				decisions.push({
					planId: row.planId,
					email: row.email,
					at: row.at,
					mode: row.mode,
					weekNumber: null,
					intent: null,
					fromVolumeKm: null,
					toVolumeKm: null,
					reason: null,
					fitness: row.fitness,
					fatigue: row.fatigue,
					form: row.form,
				});
			}
			continue;
		}
		for (const entry of entries) {
			if (!entry || typeof entry !== 'object') continue;
			const e = entry as Record<string, unknown>;
			const intent = typeof e.intent === 'string' ? e.intent : null;
			if (intent === 'ease') ease += 1;
			else if (intent === 'hold') hold += 1;
			if (decisions.length >= limit) continue;
			decisions.push({
				planId: row.planId,
				email: row.email,
				at: row.at,
				mode: row.mode,
				weekNumber: typeof e.weekNumber === 'number' ? e.weekNumber : null,
				intent,
				fromVolumeKm: num(e.fromVolumeKm),
				toVolumeKm: num(e.toVolumeKm),
				reason: typeof e.reason === 'string' ? e.reason : null,
				fitness: row.fitness,
				fatigue: row.fatigue,
				form: row.form,
			});
		}
	}
	return {
		summary: { plans, users: users.size, records: ease + hold, ease, hold, byMode },
		decisions,
	};
}

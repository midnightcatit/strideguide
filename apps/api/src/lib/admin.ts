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

/** The target of a disable, as the rule below needs it. */
export interface DisableTarget {
	id: string;
	role: AdminRole;
	isRoot: boolean;
}

/**
 * Why a disable is refused, or null when it is allowed. A root admin, another
 * admin, or the acting admin themselves can never be disabled. Pure so the rule
 * is testable without a route or a database.
 */
export function disableRefusal(target: DisableTarget, actorId: string): string | null {
	if (target.id === actorId) return 'You cannot disable your own account.';
	if (target.isRoot) return 'You cannot disable a root admin.';
	if (target.role === 'admin') return 'You cannot disable another admin.';
	return null;
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

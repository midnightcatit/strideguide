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
		goalProfileSlug: row.goalProfileSlug,
		planCount: row.planCount ?? 0,
		lastLogAt: toIsoTimestamp(row.lastLogAt),
		connectionCount,
		connectionStatus:
			connectionCount === 0 ? null : (row.errorConnectionCount ?? 0) > 0 ? 'error' : 'connected',
	};
}

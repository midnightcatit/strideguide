import { Hono } from 'hono';
import { desc, gt, sql } from 'drizzle-orm';
import { schema } from '../db';
import { requireAdmin } from '../middleware/auth';
import {
	parseAdminEmails,
	projectAdminUser,
	resolveAdminState,
	toIsoTimestamp,
	type AdminUserAggregate,
} from '../lib/admin';
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
 * Metadata-only user list. The projection deliberately selects counts, dates and
 * identifiers and never a runner's health metric values, health samples, log
 * contents, notes, RPE, run stats, routes or any other private content. Each
 * column is named explicitly, and each aggregate reads only a count or a max, so
 * a new column on any table can never ride along by accident.
 */
admin.get('/users', requireAdmin, async (c) => {
	const rows = await c
		.get('db')
		.select({
			id: schema.users.id,
			email: schema.users.email,
			createdAt: schema.users.createdAt,
			role: schema.users.role,
			goalProfileSlug: sql<string | null>`(
				select ug.goal_profile_slug from user_goals ug
				where ug.user_id = ${schema.users.id} and ug.status = 'active'
				order by ug.created_at desc limit 1
			)`,
			planCount: sql<number>`(
				select count(*) from plans p
				join user_goals ug on p.user_goal_id = ug.id
				where ug.user_id = ${schema.users.id}
			)`,
			lastLogAt: sql<number | null>`(
				select max(l.started_at) from logs l where l.user_id = ${schema.users.id}
			)`,
			connectionCount: sql<number>`(
				select count(*) from connections c where c.user_id = ${schema.users.id}
			)`,
			errorConnectionCount: sql<number>`(
				select count(*) from connections c
				where c.user_id = ${schema.users.id} and c.status = 'error'
			)`,
		})
		.from(schema.users)
		.orderBy(desc(schema.users.createdAt));

	const rootEmails = parseAdminEmails(c.env.ADMIN_EMAILS);
	const users = rows.map((row) =>
		projectAdminUser(row as AdminUserAggregate, rootEmails.has(row.email.toLowerCase())),
	);
	return c.json({ users });
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

export default admin;

import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { secureCookies, sessionCookieName, sha256Hex, verifySession } from '../lib/session';
import type { AppBindings } from '../types';

export const attachDb = createMiddleware<AppBindings>(async (c, next) => {
	c.set('db', getDb(c.env));
	await next();
});

/**
 * Verify the session JWT AND the D1 ledger row, so sessions are revocable
 * (M0-SEC-01). Rejects when the JWT is invalid or the row is absent/expired/revoked.
 */
export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
	const token = getCookie(c, sessionCookieName(c.env));
	if (!token) {
		return c.json({ error: 'unauthorized' }, 401);
	}
	const payload = await verifySession(c.env, token);
	if (!payload) {
		return c.json({ error: 'unauthorized' }, 401);
	}

	const db = c.get('db');
	const rows = await db
		.select()
		.from(schema.authSessions)
		.where(eq(schema.authSessions.tokenHash, await sha256Hex(token)))
		.limit(1);
	const session = rows[0];
	if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
		return c.json({ error: 'unauthorized' }, 401);
	}

	c.set('user', { id: payload.uid, email: payload.email, name: null, avatarUrl: null });
	await next();
});

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** CSRF defense: reject state-changing requests whose Origin is not allowlisted (M0-SEC-03). */
export const requireSameOrigin = createMiddleware<AppBindings>(async (c, next) => {
	if (!MUTATING.has(c.req.method)) {
		return next();
	}
	const allowed = new Set([c.env.WEB_ORIGIN, c.env.APP_ORIGIN]);
	if (c.env.ENVIRONMENT !== 'production') {
		allowed.add('http://localhost:5173');
		allowed.add('http://localhost:8787');
	}
	const origin = c.req.header('origin');
	if (!origin || !allowed.has(origin)) {
		return c.json({ error: 'csrf_origin_rejected' }, 403);
	}
	return next();
});

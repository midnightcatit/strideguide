import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { getDb } from '../db';
import { SESSION_COOKIE, verifySession } from '../lib/session';
import type { AppBindings } from '../types';

export const attachDb = createMiddleware<AppBindings>(async (c, next) => {
	c.set('db', getDb(c.env));
	await next();
});

export const requireAuth = createMiddleware<AppBindings>(async (c, next) => {
	const token = getCookie(c, SESSION_COOKIE);
	if (!token) {
		return c.json({ error: 'unauthorized' }, 401);
	}
	const payload = await verifySession(c.env, token);
	if (!payload) {
		return c.json({ error: 'unauthorized' }, 401);
	}
	c.set('user', { id: payload.uid, email: payload.email, name: null, avatarUrl: null });
	await next();
});

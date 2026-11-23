import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { handleScheduled } from './cron';
import { getDb } from './db';
import type { Env } from './env';
import { attachDb, requireSameOrigin } from './middleware/auth';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import connectionRoutes from './routes/connections';
import { schema } from './db';
import type { AppBindings } from './types';

const app = new Hono<AppBindings>();

app.use('*', secureHeaders());
app.use('*', attachDb);

// CORS matters only for direct cross-origin calls in dev. The localhost branch is
// gated on ENVIRONMENT so prod trusts only its own origin (M0-SEC-05).
const corsFor = cors({
	origin: (origin, c) => {
		const env = c.env as Env;
		if (env.ENVIRONMENT !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
			return origin;
		}
		return origin === env.WEB_ORIGIN || origin === env.APP_ORIGIN ? origin : undefined;
	},
	credentials: true,
});

app.use('/api/*', corsFor);
app.use('/auth/*', corsFor);
app.use('/connections/*', corsFor);

// CSRF origin guard on all state-changing routes (M0-SEC-03).
app.use('/api/*', requireSameOrigin);
app.use('/auth/logout', requireSameOrigin);
app.use('/connections/*', requireSameOrigin);

app.route('/auth', authRoutes);
app.route('/api', apiRoutes);
app.route('/connections', connectionRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
	const correlationId = crypto.randomUUID();
	const e = err as Error;
	// First line only: D1 errors append the SQL and its params, which we do not persist.
	const message = (e?.message ?? '').split('\n')[0]!.slice(0, 300);
	let path = '';
	try {
		path = new URL(c.req.url).pathname;
	} catch {
		path = '';
	}
	console.error('api_error', {
		id: correlationId,
		name: e?.name ?? 'Error',
		message,
		path,
		method: c.req.method,
	});

	// Persist recent errors (best-effort) so production issues are inspectable.
	try {
		const db = c.get('db') ?? getDb(c.env as Env);
		c.executionCtx.waitUntil(
			db.insert(schema.appErrors).values({
				id: correlationId,
				name: e?.name ?? 'Error',
				message,
				path,
				method: c.req.method,
				userId: c.get('user')?.id ?? null,
				requestId: c.req.header('cf-ray') ?? null,
			}),
		);
	} catch {
		// never fail the error handler
	}

	return c.json({ error: 'internal_error', id: correlationId }, 500);
});

export default {
	fetch: app.fetch,
	scheduled: handleScheduled,
};

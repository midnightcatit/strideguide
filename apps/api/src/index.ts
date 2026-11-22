import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { handleScheduled } from './cron';
import type { Env } from './env';
import { attachDb, requireSameOrigin } from './middleware/auth';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
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

// CSRF origin guard on all state-changing routes (M0-SEC-03).
app.use('/api/*', requireSameOrigin);
app.use('/auth/logout', requireSameOrigin);

app.route('/auth', authRoutes);
app.route('/api', apiRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
	const correlationId = crypto.randomUUID();
	console.error('api_error', {
		id: correlationId,
		name: (err as Error)?.name ?? 'Error',
	});
	return c.json({ error: 'internal_error', id: correlationId }, 500);
});

export default {
	fetch: app.fetch,
	scheduled: handleScheduled,
};

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { handleScheduled } from './cron';
import { attachDb } from './middleware/auth';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import type { AppBindings } from './types';

const app = new Hono<AppBindings>();

app.use('*', secureHeaders());
app.use('*', attachDb);

// CORS matters only for direct cross-origin calls in dev (web on :5173).
// In prod everything is same-origin under run.midnightcatit.com.
app.use(
	'/api/*',
	cors({
		origin: (origin) => {
			if (/^http:\/\/localhost:\d+$/.test(origin)) return origin;
			if (origin === 'https://run.midnightcatit.com') return origin;
			return undefined;
		},
		credentials: true,
	}),
);

app.route('/auth', authRoutes);
app.route('/api', apiRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
	console.error('api_error', err);
	return c.json({ error: 'internal_error' }, 500);
});

export default {
	fetch: app.fetch,
	scheduled: handleScheduled,
};

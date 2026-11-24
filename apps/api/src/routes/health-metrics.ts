import { Hono } from 'hono';
import { loadHealthMetrics, normalizeWindow } from '../lib/health-metrics';
import type { AppBindings } from '../types';

/**
 * Grouped health metrics for the web: every stored daily metric and point sample
 * over a 7, 30 or 90 day window (30 by default), each as a series with its latest
 * point. The work lives in `loadHealthMetrics`; this route only reads the query
 * and the user.
 */
const healthMetrics = new Hono<AppBindings>();

healthMetrics.get('/', async (c) => {
	const user = c.get('user')!;
	const windowDays = normalizeWindow(c.req.query('window'));
	const payload = await loadHealthMetrics(c.env.DB, user.id, windowDays);
	return c.json(payload);
});

export default healthMetrics;

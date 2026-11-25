import { Hono } from 'hono';
import type { AppBindings } from '../types';

const health = new Hono<AppBindings>();

health.get('/', (c) => {
	// Unauthenticated, so reveal nothing about the deployment beyond liveness.
	return c.json({ ok: true, time: new Date().toISOString() });
});

export default health;

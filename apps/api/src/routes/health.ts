import { Hono } from 'hono';
import type { AppBindings } from '../types';

const health = new Hono<AppBindings>();

health.get('/', (c) => {
	return c.json({ ok: true, env: c.env.ENVIRONMENT, time: new Date().toISOString() });
});

export default health;

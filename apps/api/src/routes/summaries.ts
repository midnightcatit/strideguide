import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { schema } from '../db';
import type { AppBindings } from '../types';

const summaries = new Hono<AppBindings>();

/** Latest cron-generated coach note for the user (or null). */
summaries.get('/', async (c) => {
	const user = c.get('user')!;
	const rows = await c
		.get('db')
		.select()
		.from(schema.summaries)
		.where(eq(schema.summaries.userId, user.id))
		.orderBy(desc(schema.summaries.createdAt))
		.limit(1);
	const s = rows[0];
	return c.json({
		summary: s ? { id: s.id, kind: s.kind, body: s.body, createdAt: s.createdAt } : null,
	});
});

export default summaries;

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { schema } from '../db';
import type { AppBindings } from '../types';

const exercises = new Hono<AppBindings>();

exercises.get('/', async (c) => {
	const rows = await c.get('db').select().from(schema.exercises);
	return c.json({ exercises: rows });
});

exercises.get('/:id', async (c) => {
	const id = c.req.param('id');
	const rows = await c
		.get('db')
		.select()
		.from(schema.exercises)
		.where(eq(schema.exercises.id, id))
		.limit(1);
	if (!rows[0]) return c.json({ error: 'not_found' }, 404);
	return c.json({ exercise: rows[0] });
});

export default exercises;

import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { schema } from '../db';
import type { AppBindings } from '../types';

const plans = new Hono<AppBindings>();

/** Returns the active plan (with weeks + sessions) for the user's first active goal. */
plans.get('/current', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');

	const goalRows = await db
		.select()
		.from(schema.userGoals)
		.where(eq(schema.userGoals.userId, user.id))
		.orderBy(desc(schema.userGoals.createdAt))
		.limit(1);
	const goal = goalRows[0];
	if (!goal) return c.json({ plan: null });

	const planRows = await db
		.select()
		.from(schema.plans)
		.where(eq(schema.plans.userGoalId, goal.id))
		.orderBy(desc(schema.plans.version))
		.limit(1);
	const plan = planRows[0];
	if (!plan) return c.json({ plan: null, goal });

	const weeks = await db
		.select()
		.from(schema.planWeeks)
		.where(eq(schema.planWeeks.planId, plan.id));

	return c.json({ goal, plan, weeks });
});

export default plans;

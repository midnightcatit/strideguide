import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { normalizeSessionNotes } from '@strideguide/shared';
import { schema } from '../db';
import type { AppBindings } from '../types';

/**
 * Per-session notes, kept in their own route file so the plans routes stay
 * focused. Mounted under /plans, so the path is /plans/sessions/:id/notes.
 */
const sessionNotes = new Hono<AppBindings>();

/** True when the session belongs to a plan owned by this user. */
async function sessionOwnedBy(
	db: AppBindings['Variables']['db'],
	userId: string,
	sessionId: string,
): Promise<boolean> {
	const session = (
		await db
			.select()
			.from(schema.sessionsPlan)
			.where(eq(schema.sessionsPlan.id, sessionId))
			.limit(1)
	)[0];
	if (!session) return false;
	const week = (
		await db
			.select()
			.from(schema.planWeeks)
			.where(eq(schema.planWeeks.id, session.planWeekId))
			.limit(1)
	)[0];
	if (!week) return false;
	const plan = (
		await db.select().from(schema.plans).where(eq(schema.plans.id, week.planId)).limit(1)
	)[0];
	if (!plan) return false;
	const goal = (
		await db
			.select()
			.from(schema.userGoals)
			.where(and(eq(schema.userGoals.id, plan.userGoalId), eq(schema.userGoals.userId, userId)))
			.limit(1)
	)[0];
	return !!goal;
}

/** PATCH /sessions/:id/notes: save the runner's note for one session. */
sessionNotes.patch(
	'/sessions/:id/notes',
	zValidator('json', z.object({ notes: z.string() })),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const id = c.req.param('id');
		const notes = normalizeSessionNotes(c.req.valid('json').notes);

		if (!(await sessionOwnedBy(db, user.id, id))) return c.json({ error: 'Not found.' }, 404);

		// An empty note clears the column rather than storing an empty string.
		await db
			.update(schema.sessionsPlan)
			.set({ notes: notes || null })
			.where(eq(schema.sessionsPlan.id, id));

		return c.json({ ok: true, notes });
	},
);

export default sessionNotes;

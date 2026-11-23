import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { schema } from '../db';
import type { Db } from '../db';
import type { AppBindings } from '../types';
import {
	attachImportLog,
	loadPlannedSessions,
	proposeMatch,
	sessionOwnedBy,
	type PlannedSessionInfo,
} from '../lib/activities';
import type { MatchCandidate } from '@strideguide/shared/plan';

/**
 * Imported activities and their match to the plan.
 *
 * Listing runs the pure matcher against the runner's current plan. A strong
 * match (same day, same modality, close size) is applied on its own: the
 * activity is tied to the session and an import log closes it out, so the work
 * counts in Progress and the adaptive engine. A weaker, same-kind overlap is
 * returned as a proposal for the runner to confirm or reject, so an ambiguous
 * import is never silently treated as a planned session.
 */
const activities = new Hono<AppBindings>();

type ActivityRow = typeof schema.activities.$inferSelect;

function summarize(session: PlannedSessionInfo | undefined) {
	if (!session) return null;
	return {
		id: session.id,
		title: session.title,
		type: session.type ?? null,
		modality: session.modality,
		date: session.date,
	};
}

function candidateOut(c: MatchCandidate, byId: Map<string, PlannedSessionInfo>) {
	return {
		sessionId: c.sessionId,
		confidence: c.confidence,
		decision: c.decision,
		dateDeltaDays: c.dateDeltaDays,
		breakdown: c.breakdown,
		session: summarize(byId.get(c.sessionId)),
	};
}

function rowOut(
	row: ActivityRow,
	byId: Map<string, PlannedSessionInfo>,
	proposal: { best: MatchCandidate | null; candidates: MatchCandidate[] } | null,
) {
	return {
		id: row.id,
		provider: row.provider,
		modality: row.modality,
		type: row.type,
		startedAt: row.startedAt,
		durationSec: row.durationSec,
		distanceM: row.distanceM,
		avgHr: row.avgHr,
		matchState: row.matchState,
		matchConfidence: row.matchConfidence,
		sessionId: row.sessionId,
		session: summarize(row.sessionId ? byId.get(row.sessionId) : undefined),
		proposal: proposal?.best ? candidateOut(proposal.best, byId) : null,
		candidates: proposal?.candidates.map((c) => candidateOut(c, byId)) ?? [],
	};
}

/** Apply a match: tie the activity to the session and close it out with a log. */
async function applyMatch(
	db: Db,
	userId: string,
	row: ActivityRow,
	sessionId: string,
	confidence: number,
): Promise<void> {
	await db
		.update(schema.activities)
		.set({ sessionId, matchConfidence: confidence, matchState: 'confirmed' })
		.where(eq(schema.activities.id, row.id));
	await attachImportLog(db, userId, row, sessionId);
}

activities.get('/', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');

	const [sessions, rows] = await Promise.all([
		loadPlannedSessions(db, user.id),
		db
			.select()
			.from(schema.activities)
			.where(eq(schema.activities.userId, user.id))
			.orderBy(desc(schema.activities.startedAt))
			.limit(60),
	]);
	const byId = new Map(sessions.map((s) => [s.id, s]));

	const out = [];
	for (const row of rows) {
		if (row.matchState === 'confirmed' || row.sessionId) {
			out.push(rowOut(row, byId, null));
			continue;
		}
		if (row.matchState === 'rejected') {
			out.push(rowOut(row, byId, null));
			continue;
		}
		const proposal = proposeMatch(row, sessions);
		if (proposal.best && proposal.best.decision === 'auto') {
			// The auto policy: a strong match needs no prompt, so it is applied now.
			await applyMatch(db, user.id, row, proposal.best.sessionId, proposal.best.confidence);
			out.push(
				rowOut(
					{ ...row, sessionId: proposal.best.sessionId, matchState: 'confirmed', matchConfidence: proposal.best.confidence },
					byId,
					null,
				),
			);
		} else {
			out.push(rowOut(row, byId, proposal));
		}
	}

	return c.json({ activities: out });
});

/** Confirm a proposed match, or a session the runner picked themselves. */
activities.post(
	'/:id/confirm',
	zValidator('json', z.object({ sessionId: z.string().optional() })),
	async (c) => {
		const user = c.get('user')!;
		const db = c.get('db');
		const id = c.req.param('id');
		const { sessionId } = c.req.valid('json');

		const row = (
			await db
				.select()
				.from(schema.activities)
				.where(and(eq(schema.activities.id, id), eq(schema.activities.userId, user.id)))
				.limit(1)
		)[0];
		if (!row) return c.json({ error: 'not_found' }, 404);

		let targetId = sessionId;
		let confidence = row.matchConfidence ?? 0;

		if (!targetId) {
			const sessions = await loadPlannedSessions(db, user.id);
			const best = proposeMatch(row, sessions).best;
			if (!best) return c.json({ error: 'no_match' }, 400);
			targetId = best.sessionId;
			confidence = best.confidence;
		}

		if (!(await sessionOwnedBy(db, user.id, targetId))) {
			return c.json({ error: 'unknown_session' }, 400);
		}

		await applyMatch(db, user.id, row, targetId, confidence);
		return c.json({ ok: true, sessionId: targetId, confidence });
	},
);

/** Reject a proposal. The activity is kept, flagged so it is not proposed again. */
activities.post('/:id/reject', async (c) => {
	const user = c.get('user')!;
	const db = c.get('db');
	const id = c.req.param('id');

	const row = (
		await db
			.select()
			.from(schema.activities)
			.where(and(eq(schema.activities.id, id), eq(schema.activities.userId, user.id)))
			.limit(1)
	)[0];
	if (!row) return c.json({ error: 'not_found' }, 404);

	await db
		.update(schema.activities)
		.set({ sessionId: null, matchConfidence: null, matchState: 'rejected' })
		.where(eq(schema.activities.id, row.id));

	return c.json({ ok: true });
});

export default activities;

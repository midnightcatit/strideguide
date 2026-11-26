import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { explanationRefFor } from '@strideguide/shared/plan';
import { DEFAULT_PREFS, formatDistance, type Units } from '@strideguide/shared/units';
import { schema } from '../db';
import { runAi } from '../lib/ai';
import { classifyRisk, SAFETY_REPLY, shouldRedirect } from '../lib/coach-safety';
import { sanitizeText, WRITING_RULES } from '@strideguide/shared/writing';
import { checkRateLimit } from '../lib/rate-limit';
import type { AppBindings } from '../types';

const ai = new Hono<AppBindings>();

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 0 = Monday … 6 = Sunday for an ISO date. */
function weekdayOf(iso: string): number {
	return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

ai.post(
	'/chat',
	zValidator('json', z.object({ message: z.string().min(1).max(2000) })),
	async (c) => {
		const user = c.get('user')!;
		const rl = await checkRateLimit(c.env.DB, `ai:${user.id}`, 40, 3600);
		if (!rl.ok) return c.json({ error: 'rate_limited' }, 429, { 'Retry-After': '600' });

		const db = c.get('db');
		const lines: string[] = [];
		const today = new Date().toISOString().slice(0, 10);

		// A typed safety read on the message, decided by Jev. Best-effort and
		// bounded: no key, a timeout or an invalid answer returns null, so the
		// coach answers as usual. Only a confident risk read replaces the reply,
		// and it is a plain line that points to a professional, not a diagnosis.
		const risk = await classifyRisk(c.env, c.req.valid('json').message, {
			rateLimit: { db: c.env.DB, key: `jev:${user.id}`, limit: 40, windowSec: 3600 },
		});
		if (shouldRedirect(risk)) {
			await db.insert(schema.aiJobs).values({
				id: crypto.randomUUID(),
				type: 'coach_chat',
				status: 'ok',
				modelUsed: 'safety-classifier',
				latencyMs: 0,
			});
			return c.json({ reply: SAFETY_REPLY, model: 'safety-classifier', provider: 'typesafe' });
		}

		// The coach speaks in the runner's own units, so the context below is
		// formatted the same way the app shows it.
		const settingRows = await db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.userId, user.id))
			.limit(1);
		const units: Units = { ...DEFAULT_PREFS, ...(settingRows[0]?.prefs ?? {}) }.units;

		const goals = await db
			.select()
			.from(schema.userGoals)
			.where(eq(schema.userGoals.userId, user.id))
			.orderBy(desc(schema.userGoals.createdAt))
			.limit(1);
		const goal = goals[0];
		if (goal) {
			lines.push(
				`Goal: ${goal.goalProfileSlug}${goal.targetDate ? `, race on ${goal.targetDate}` : ''}.`,
			);
			const plans = await db
				.select()
				.from(schema.plans)
				.where(eq(schema.plans.userGoalId, goal.id))
				.orderBy(desc(schema.plans.version))
				.limit(1);
			const plan = plans[0];
			if (plan) {
				const weeks = await db
					.select()
					.from(schema.planWeeks)
					.where(eq(schema.planWeeks.planId, plan.id));
				const current =
					weeks.find(
						(w) => w.startDate && w.endDate && today >= w.startDate && today <= w.endDate,
					) ?? weeks.sort((a, b) => a.weekNumber - b.weekNumber)[0];
				if (current) {
					const sessions = await db
						.select()
						.from(schema.sessionsPlan)
						.where(eq(schema.sessionsPlan.planWeekId, current.id));
					lines.push(
						`This week (W${current.weekNumber}, ${current.focus ?? ''}): ` +
							sessions
								.map((s) => {
									const p = s.prescription;
									// The day is an offset into the week, so name the real
									// weekday from the week's own start (a plan can start mid-week).
									const wd = current.startDate ? (weekdayOf(current.startDate) + s.day) % 7 : s.day;
									return `${DAYS[wd]} ${s.type}${p?.targetDistanceKm ? ` ${formatDistance(p.targetDistanceKm, units)}` : ''}`;
								})
								.join('; ') +
							'.',
					);
					const primary = sessions.find((s) => s.modality === 'running') ?? sessions[0];
					if (primary) {
						const ref = explanationRefFor(primary.type);
						if (ref) {
							const rows = await db
								.select()
								.from(schema.explanations)
								.where(eq(schema.explanations.refId, ref))
								.limit(1);
							if (rows[0]?.summary) {
								lines.push(`Reference (knowledge base, ${primary.type}): ${rows[0].summary}`);
							}
						}
					}
				}
			}
		}

		const logs = await db
			.select()
			.from(schema.logs)
			.where(eq(schema.logs.userId, user.id))
			.orderBy(desc(schema.logs.createdAt))
			.limit(8);
		if (logs.length) {
			lines.push(
				'Recent logs: ' +
					logs
						.map((l) => {
							const rs = l.runStats;
							const day = l.createdAt instanceof Date ? l.createdAt.toISOString().slice(0, 10) : '';
							return `${day} ${rs?.distanceKm ? formatDistance(rs.distanceKm, units) : 'strength'}${l.rpe ? ` RPE ${l.rpe}` : ''}`;
						})
						.join('; ') +
					'.',
			);
		}

		const messages = [
			{
				role: 'system' as const,
				content: `${WRITING_RULES}

You are Stride Guide, a running and strength coach. Be concise and practical. Ground every answer in the user context and the knowledge-base reference below; if they do not cover it, say plainly what you would need to know. If the evidence is weak, say so. The runner uses ${units === 'imperial' ? 'miles, with pace per mile' : 'kilometres, with pace per kilometre'}. Give every distance and pace in those units, and restate in those units any figure you quote from the knowledge base or the user context.`,
			},
			...(lines.length
				? [{ role: 'system' as const, content: `User context:\n${lines.join('\n')}` }]
				: []),
			{ role: 'user' as const, content: c.req.valid('json').message },
		];

		try {
			const result = await runAi(c.env, messages, { maxTokens: 600 });
			await db.insert(schema.aiJobs).values({
				id: crypto.randomUUID(),
				type: 'coach_chat',
				status: 'ok',
				modelUsed: result.model,
				latencyMs: 0,
			});
			return c.json({
				reply: sanitizeText(result.text),
				model: result.model,
				provider: result.provider,
			});
		} catch {
			await db.insert(schema.aiJobs).values({
				id: crypto.randomUUID(),
				type: 'coach_chat',
				status: 'error',
				error: 'ai_unavailable',
			});
			return c.json({ error: 'ai_unavailable' }, 503);
		}
	},
);

export default ai;

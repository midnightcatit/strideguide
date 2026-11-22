import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { explanationRefFor } from '@strideguide/shared/plan';
import { schema } from '../db';
import { runAi } from '../lib/ai';
import { checkRateLimit } from '../lib/rate-limit';
import type { AppBindings } from '../types';

const ai = new Hono<AppBindings>();

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

		const goals = await db
			.select()
			.from(schema.userGoals)
			.where(eq(schema.userGoals.userId, user.id))
			.orderBy(desc(schema.userGoals.createdAt))
			.limit(1);
		const goal = goals[0];
		if (goal) {
			lines.push(`Goal: ${goal.goalProfileSlug}${goal.targetDate ? `, race on ${goal.targetDate}` : ''}.`);
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
					weeks.find((w) => w.startDate && w.endDate && today >= w.startDate && today <= w.endDate) ??
					weeks.sort((a, b) => a.weekNumber - b.weekNumber)[0];
				if (current) {
					const sessions = await db
						.select()
						.from(schema.sessionsPlan)
						.where(eq(schema.sessionsPlan.planWeekId, current.id));
					lines.push(
						`This week (W${current.weekNumber}, ${current.focus ?? ''}): ` +
							sessions
								.map((s) => {
									const p = s.prescription as { targetDistanceKm?: number } | null;
									return `${DAYS[s.day]} ${s.type}${p?.targetDistanceKm ? ` ${p.targetDistanceKm} km` : ''}`;
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
							const rs = l.runStats as { distanceKm?: number } | null;
							const day = l.createdAt instanceof Date ? l.createdAt.toISOString().slice(0, 10) : '';
							return `${day} ${rs?.distanceKm ? `${rs.distanceKm} km` : 'strength'}${l.rpe ? ` RPE ${l.rpe}` : ''}`;
						})
						.join('; ') +
					'.',
			);
		}

		const messages = [
			{
				role: 'system' as const,
				content:
					'You are Stride Guide, a sports-scientist running and strength coach. Be concise and practical, and write plainly in short sentences. Never use em dashes, and do not use markdown formatting such as bold or headings; plain prose only. Avoid hype, hedging and buzzwords; be specific. Ground answers in the user context below and in the knowledge-base reference. If the evidence is weak or you are unsure, say so plainly. Never give medical advice; for pain, injury or illness, suggest seeing a professional.',
			},
			...(lines.length ? [{ role: 'system' as const, content: `User context:\n${lines.join('\n')}` }] : []),
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
			return c.json({ reply: result.text, model: result.model, provider: result.provider });
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

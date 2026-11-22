import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { runAi } from '../lib/ai';
import type { AppBindings } from '../types';

const ai = new Hono<AppBindings>();

/** Live coach chat (PLAN.md section 6.4). Grounded context is injected client-side for now. */
ai.post(
	'/chat',
	zValidator(
		'json',
		z.object({
			message: z.string().min(1),
			context: z.string().optional(),
		}),
	),
	async (c) => {
		const { message, context } = c.req.valid('json');
		const messages = [
			{
				role: 'system' as const,
				content:
					'You are Stride Guide, a sports-scientist training coach. Be concise, practical, and evidence-informed.',
			},
			...(context ? [{ role: 'system' as const, content: context }] : []),
			{ role: 'user' as const, content: message },
		];
		const result = await runAi(c.env, messages, { maxTokens: 700 });
		return c.json({ reply: result.text, model: result.model, provider: result.provider });
	},
);

export default ai;

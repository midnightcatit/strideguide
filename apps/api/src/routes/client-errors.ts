import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { schema } from '../db';
import { checkRateLimit, clientIp } from '../lib/rate-limit';
import type { AppBindings } from '../types';

const clientErrors = new Hono<AppBindings>();

/**
 * Public diagnostics sink for the browser beacon. It stays reachable without a
 * session on purpose: a client that is stuck mid-flow should still be able to
 * report why. Rate-limited by IP, capped by the schema, and never fails loud.
 */
clientErrors.post(
	'/',
	zValidator(
		'json',
		z.object({
			kind: z.string().min(1).max(40),
			message: z.string().max(500).optional(),
			detail: z.string().max(4000).optional(),
			url: z.string().max(500).optional(),
		}),
	),
	async (c) => {
		const rl = await checkRateLimit(c.env.DB, `clienterr:${clientIp(c.req.raw)}`, 60, 3600);
		if (!rl.ok) return c.json({ ok: false }, 429);

		const body = c.req.valid('json');
		try {
			await c.get('db').insert(schema.clientErrors).values({
				id: crypto.randomUUID(),
				kind: body.kind,
				message: body.message ?? null,
				detail: body.detail ?? null,
				url: body.url ?? null,
				userAgent: c.req.header('user-agent')?.slice(0, 300) ?? null,
				userId: c.get('user')?.id ?? null,
			});
		} catch {
			// a diagnostics beacon must never surface an error of its own
		}
		return c.json({ ok: true });
	},
);

export default clientErrors;

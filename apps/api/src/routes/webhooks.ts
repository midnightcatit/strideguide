import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { schema } from '../db';
import type { AppBindings } from '../types';

/**
 * Google Health push notifications. Google POSTs a JSON array describing what
 * changed, and this route only marks the matching connection as due for a sync;
 * the cron does the fetching. Nothing here reads tokens or calls the provider.
 *
 * Auth: Google sends the subscriber's endpoint secret in the Authorization
 * header. We compare it to GOOGLE_HEALTH_WEBHOOK_SECRET. With no secret set the
 * route answers 401 and writes nothing, so an unregistered deployment is inert
 * and still passes Google's unauthorized challenge during subscription setup.
 */
const webhooks = new Hono<AppBindings>();

interface HealthNotification {
	data?: {
		healthUserId?: string;
		dataType?: string;
		operation?: string;
	};
}

/** Pull the distinct user ids out of a notification body, ignoring anything odd. */
export function healthUserIdsFromPayload(payload: unknown): string[] {
	if (!Array.isArray(payload)) return [];
	const ids = new Set<string>();
	for (const entry of payload) {
		const id = (entry as HealthNotification)?.data?.healthUserId;
		if (typeof id === 'string' && id.length > 0) ids.add(id);
	}
	return [...ids];
}

webhooks.post('/google-health', async (c) => {
	const secret = c.env.GOOGLE_HEALTH_WEBHOOK_SECRET;
	const provided = c.req.header('authorization') ?? '';
	if (!secret || provided !== secret) {
		return c.body(null, 401);
	}

	let payload: unknown = null;
	try {
		payload = await c.req.json();
	} catch {
		payload = null;
	}

	const now = new Date();
	for (const healthUserId of healthUserIdsFromPayload(payload)) {
		await c
			.get('db')
			.update(schema.connections)
			.set({ syncRequestedAt: now, updatedAt: now })
			.where(
				and(
					eq(schema.connections.provider, 'google-health'),
					eq(schema.connections.providerUserId, healthUserId),
				),
			);
	}

	// Acknowledge and let the cron do the work.
	return c.body(null, 204);
});

export default webhooks;

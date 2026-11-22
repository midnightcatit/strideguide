import type { D1Database } from '@cloudflare/workers-types';

export interface RateLimitResult {
	ok: boolean;
	count: number;
	limit: number;
}

/** Fixed-window rate limiter backed by D1 (M0-SEC-06). */
export async function checkRateLimit(
	db: D1Database,
	key: string,
	limit: number,
	windowSec: number,
): Promise<RateLimitResult> {
	const now = Math.floor(Date.now() / 1000);
	await db
		.prepare(
			`INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
			 ON CONFLICT(key) DO UPDATE SET
			   count = CASE WHEN ?2 - window_start >= ?3 THEN 1 ELSE count + 1 END,
			   window_start = CASE WHEN ?2 - window_start >= ?3 THEN ?2 ELSE window_start END`,
		)
		.bind(key, now, windowSec)
		.run();
	const row = await db
		.prepare(`SELECT count FROM rate_limits WHERE key = ?1`)
		.bind(key)
		.first<{ count: number }>();
	const count = row?.count ?? 1;
	return { ok: count <= limit, count, limit };
}

export function clientIp(request: Request): string {
	// cf-connecting-ip is set by Cloudflare and cannot be spoofed by the client.
	return request.headers.get('cf-connecting-ip') ?? 'unknown';
}

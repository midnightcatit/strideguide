import { eq } from 'drizzle-orm';
import { schema } from '../db';
import type { Db } from '../db';

/** Deterministic cache key so identical asks never re-bill (PLAN.md section 6.2). */
export function cacheKey(parts: { type: string; model?: string; input: string }): string {
	return `${parts.type}:${parts.model ?? 'any'}:${hash(parts.input)}`;
}

export async function getCached(db: Db, key: string): Promise<unknown | null> {
	const rows = await db.select().from(schema.aiCache).where(eq(schema.aiCache.cacheKey, key)).limit(1);
	const row = rows[0];
	if (!row) return null;
	return row.response ?? null;
}

export async function putCache(
	db: Db,
	key: string,
	response: unknown,
	model: string,
	ttlSeconds?: number,
): Promise<void> {
	await db
		.insert(schema.aiCache)
		.values({ cacheKey: key, response, model, ttl: ttlSeconds ?? null })
		.onConflictDoUpdate({
			target: schema.aiCache.cacheKey,
			set: { response, model, ttl: ttlSeconds ?? null },
		});
}

/** FNV-1a — small, deterministic, non-cryptographic. */
function hash(input: string): string {
	let h = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(36);
}

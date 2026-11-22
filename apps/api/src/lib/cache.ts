import { eq } from 'drizzle-orm';
import { schema } from '../db';
import type { Db } from '../db';
import { sha256Hex } from './session';

/** Deterministic cache key so identical asks never re-bill (PLAN.md §6.2). SHA-256 (M0-SEC-16). */
export async function cacheKey(parts: {
	type: string;
	model?: string;
	input: string;
}): Promise<string> {
	return `${parts.type}:${parts.model ?? 'any'}:${await sha256Hex(parts.input)}`;
}

export async function getCached(db: Db, key: string): Promise<unknown | null> {
	const rows = await db
		.select()
		.from(schema.aiCache)
		.where(eq(schema.aiCache.cacheKey, key))
		.limit(1);
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

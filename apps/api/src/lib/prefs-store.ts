import type { D1Database } from '@cloudflare/workers-types';
import { DEFAULT_PREFS, type Prefs } from '@strideguide/shared/units';

/**
 * A guarded writer for the settings.prefs column. D1 has no interactive
 * transaction, so a read-modify-write is done as a compare-and-swap: the store
 * reads the raw prefs text, the change returns the next prefs, and the write
 * lands only while the stored text still equals what was read. Two writers that
 * overlap therefore cannot lose each other's keys; the one that lost the race
 * re-reads and tries again.
 *
 * The raw text is deliberate: the guard compares the stored JSON as it is, which
 * a parsed value cannot do.
 */

export interface PrefsStore {
	read: (userId: string) => Promise<string | null>;
	write: (userId: string, nextPrefs: string, expectedText: string | null) => Promise<boolean>;
}

/** The prefs edit a change returns, or the reason it refuses to change anything. */
export type PrefsEdit = { ok: true; prefs: Prefs } | { ok: false; error: string };

/**
 * The outcome of a guarded prefs change. `refused` is the change's own answer
 * (it will not make the edit); `conflict` is the rare case of losing every retry
 * to concurrent writers.
 */
export type PrefsChange =
	| { kind: 'ok' }
	| { kind: 'refused'; error: string }
	| { kind: 'conflict' };

/** How many times a change re-reads and retries when another write lands first. */
const WRITE_ATTEMPTS = 3;

/**
 * Read the stored prefs, apply a pure change, and write the result back guarded
 * on the text that was read. When another write lands between the read and the
 * write, the write changes nothing, the loop re-reads and retries, and no key
 * from either writer is lost.
 */
export async function changeStoredPrefs(
	store: PrefsStore,
	userId: string,
	change: (prefs: Prefs) => PrefsEdit,
): Promise<PrefsChange> {
	for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt += 1) {
		const text = await store.read(userId);
		const edit = change(storedPrefs(text));
		if (!edit.ok) return { kind: 'refused', error: edit.error };
		if (await store.write(userId, JSON.stringify(edit.prefs), text)) return { kind: 'ok' };
	}
	return { kind: 'conflict' };
}

/** Parse a stored prefs text, with the defaults behind an empty row. */
function storedPrefs(text: string | null): Prefs {
	if (!text) return { ...DEFAULT_PREFS };
	return { ...DEFAULT_PREFS, ...(JSON.parse(text) as Prefs) };
}

/** The D1-backed store: a raw text read and a guarded upsert on the prefs column. */
export function d1PrefsStore(db: D1Database): PrefsStore {
	return {
		read: async (userId) => {
			const row = await db
				.prepare('SELECT prefs FROM settings WHERE user_id = ?1')
				.bind(userId)
				.first<{ prefs: string | null }>();
			return row?.prefs ?? null;
		},
		write: async (userId, nextPrefs, expectedText) => {
			const result = await db
				.prepare(
					`INSERT INTO settings (user_id, prefs) VALUES (?1, ?2)
					 ON CONFLICT(user_id) DO UPDATE SET prefs = ?2
					 WHERE settings.prefs = ?3`,
				)
				.bind(userId, nextPrefs, expectedText)
				.run();
			return result.meta.changes > 0;
		},
	};
}

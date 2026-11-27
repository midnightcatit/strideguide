/**
 * Where the user got to in the guided player, per session. The server is the
 * source of truth; this is a per-session cache and an optimistic local update.
 */
import { api } from './api';
import { createSessionStateStore } from './sessionState.svelte';

export interface Progress {
	idx: number;
	elapsed: number;
	/** The instance count when this was saved. A saved place is only trusted when
	 * the count still matches, so a workout whose layout changed (rest cards
	 * inserted, say) never resumes on the wrong step. Older saves have none. */
	steps?: number;
}

const store = createSessionStateStore<Progress>({
	key: 'sg:progress',
	write: (id, p) => api.setSessionState(id, 'started', JSON.stringify(p)),
});

export function hydrateProgress(entries: { sessionId: string; progress: string | null }[]): void {
	const out: { id: string; value: Progress }[] = [];
	for (const e of entries) {
		if (!e.progress) continue;
		try {
			const p = JSON.parse(e.progress) as Partial<Progress>;
			if (typeof p.idx === 'number') {
				out.push({
					id: e.sessionId,
					value: {
						idx: p.idx,
						elapsed: p.elapsed ?? 0,
						steps: typeof p.steps === 'number' ? p.steps : undefined,
					},
				});
			}
		} catch {
			// ignore a bad row
		}
	}
	store.hydrate(out);
}

export function getProgress(id: string): Progress | undefined {
	return store.get(id);
}

export function setProgress(id: string, p: Progress): void {
	store.set(id, p);
}

export function clearProgress(id: string): void {
	if (!store.has(id)) return;
	store.clear(id);
}

/**
 * Sessions the user skipped "for now". The server is the source of truth, so it
 * follows the user across devices; this is a per-session cache and an optimistic
 * local update.
 */
import { api } from './api';
import { createSessionStateStore, decodeIdList, encodeIdList } from './sessionState.svelte';

const store = createSessionStateStore<true>({
	key: 'sg:skipped',
	write: (id) => api.setSessionState(id, 'skipped'),
	unset: (id) => api.setSessionState(id, null),
	decode: decodeIdList<true>,
	encode: encodeIdList<true>,
});

export function isSkipped(id: string): boolean {
	return store.has(id);
}

/** The session ids currently marked skipped, so completion reads can tell them apart. */
export function skippedIds(): string[] {
	return store.ids();
}

export function hydrateSkipped(list: string[]): void {
	store.hydrate(list.map((id) => ({ id, value: true as const })));
}

export function skipSession(id: string): void {
	store.set(id, true);
}

export function unskipSession(id: string): void {
	store.clear(id);
}

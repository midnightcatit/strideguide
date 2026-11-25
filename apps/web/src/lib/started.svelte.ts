/**
 * Sessions the user has started but not yet logged. The server is the source of
 * truth; this is a per-session cache and an optimistic local update.
 */
import { api } from './api';
import { createSessionStateStore, decodeIdList, encodeIdList } from './sessionState.svelte';

const store = createSessionStateStore<true>({
	key: 'sg:started',
	write: (id) => api.setSessionState(id, 'started'),
	unset: (id) => api.setSessionState(id, null),
	decode: decodeIdList<true>,
	encode: encodeIdList<true>,
});

export function isStarted(id: string): boolean {
	return store.has(id);
}

export function hydrateStarted(list: string[]): void {
	store.hydrate(list.map((id) => ({ id, value: true as const })));
}

export function markStarted(id: string): void {
	if (store.has(id)) return;
	store.set(id, true);
}

export function clearStarted(id: string): void {
	if (!store.has(id)) return;
	store.clear(id);
}

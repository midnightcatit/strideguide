/**
 * Sessions the user has started but not yet logged. The server is the source of
 * truth; this is a per-session cache and an optimistic local update.
 */
import { api } from './api';

const KEY = 'sg:started';

let ids = $state<Set<string>>(new Set());
if (typeof localStorage !== 'undefined') {
	try {
		ids = new Set<string>(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
	} catch {
		ids = new Set();
	}
}

function persist(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify([...ids]));
	} catch {
		// ignore
	}
}

export function isStarted(id: string): boolean {
	return ids.has(id);
}

export function hydrateStarted(list: string[]): void {
	ids = new Set(list);
	persist();
}

export function markStarted(id: string): void {
	if (ids.has(id)) return;
	ids = new Set(ids).add(id);
	persist();
	void api.setSessionState(id, 'started').catch(() => {});
}

export function clearStarted(id: string): void {
	if (!ids.has(id)) return;
	const next = new Set(ids);
	next.delete(id);
	ids = next;
	persist();
	void api.setSessionState(id, null).catch(() => {});
}

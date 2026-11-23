/**
 * Sessions the user skipped "for now". The server is the source of truth, so it
 * follows the user across devices; this is a per-session cache and an optimistic
 * local update.
 */
import { api } from './api';

const KEY = 'sg:skipped';

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

export function isSkipped(id: string): boolean {
	return ids.has(id);
}

export function hydrateSkipped(list: string[]): void {
	ids = new Set(list);
	persist();
}

export function skipSession(id: string): void {
	ids = new Set(ids).add(id);
	persist();
	void api.setSessionState(id, 'skipped').catch(() => {});
}

export function unskipSession(id: string): void {
	const next = new Set(ids);
	next.delete(id);
	ids = next;
	persist();
	void api.setSessionState(id, null).catch(() => {});
}

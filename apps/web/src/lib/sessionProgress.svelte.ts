/**
 * Where the user got to in the guided player, per session. The server is the
 * source of truth; this is a per-session cache and an optimistic local update.
 */
import { api } from './api';

const KEY = 'sg:progress';

export interface Progress {
	idx: number;
	elapsed: number;
}

let map = $state<Record<string, Progress>>({});
if (typeof localStorage !== 'undefined') {
	try {
		map = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Progress>;
	} catch {
		map = {};
	}
}

function persist(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(map));
	} catch {
		// ignore
	}
}

export function hydrateProgress(entries: { sessionId: string; progress: string | null }[]): void {
	const next: Record<string, Progress> = {};
	for (const e of entries) {
		if (!e.progress) continue;
		try {
			const p = JSON.parse(e.progress) as Partial<Progress>;
			if (typeof p.idx === 'number') next[e.sessionId] = { idx: p.idx, elapsed: p.elapsed ?? 0 };
		} catch {
			// ignore a bad row
		}
	}
	map = next;
	persist();
}

export function getProgress(id: string): Progress | undefined {
	return map[id];
}

export function setProgress(id: string, p: Progress): void {
	map = { ...map, [id]: p };
	persist();
	void api.setSessionState(id, 'started', JSON.stringify(p)).catch(() => {});
}

export function clearProgress(id: string): void {
	if (!(id in map)) return;
	const next = { ...map };
	delete next[id];
	map = next;
	persist();
}

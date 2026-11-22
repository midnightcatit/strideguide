/**
 * Offline support (M2). Logs written while offline are queued in localStorage and
 * flushed when connectivity returns; the last plan is cached so the app renders offline.
 * Storage stays small (a handful of JSON logs), so localStorage is enough.
 */

const OUTBOX_KEY = 'sg:outbox:v1';
const PLAN_KEY = 'sg:lastPlan:v1';

export interface QueuedLog {
	id: string;
	body: unknown;
	at: number;
}

function available(): boolean {
	return typeof localStorage !== 'undefined';
}

export function queueLog(body: unknown): QueuedLog {
	const item: QueuedLog = { id: crypto.randomUUID(), body, at: Date.now() };
	if (available()) {
		const q = outbox();
		q.push(item);
		localStorage.setItem(OUTBOX_KEY, JSON.stringify(q));
	}
	return item;
}

export function outbox(): QueuedLog[] {
	if (!available()) return [];
	try {
		return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '') as QueuedLog[];
	} catch {
		return [];
	}
}

export function removeFromOutbox(ids: string[]): void {
	if (!available()) return;
	localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox().filter((i) => !ids.includes(i.id))));
}

export function cachePlan(plan: unknown): void {
	if (!available()) return;
	try {
		localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
	} catch {
		// ignore quota errors
	}
}

export function cachedPlan<T = unknown>(): T | null {
	if (!available()) return null;
	try {
		const raw = localStorage.getItem(PLAN_KEY);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

export function isOnline(): boolean {
	return typeof navigator === 'undefined' ? true : navigator.onLine;
}

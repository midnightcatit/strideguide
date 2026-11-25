/**
 * Offline support (M2). Logs written while offline are queued in localStorage and
 * flushed when connectivity returns; the last plan is cached so the app renders offline.
 * Storage stays small (a handful of JSON logs), so localStorage is enough.
 *
 * The cached plan is keyed by user id, so one account never reads another's plan
 * after a shared device changes hands. The last signed-in user is kept too, so a
 * cold start offline can open the app shell instead of the sign-in wall.
 */

const OUTBOX_KEY = 'sg:outbox:v1';
const PLAN_KEY = 'sg:lastPlan:v1';
const USER_KEY = 'sg:lastUser:v1';

export interface QueuedLog {
	id: string;
	body: unknown;
	at: number;
}

/** The last signed-in user, kept for an offline cold start. */
export interface CachedUser {
	id: string;
	email: string;
	name?: string | null;
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

/** One cache key per user, so a plan read is scoped to the signed-in account. */
function planKey(userId: string): string {
	return `${PLAN_KEY}:${userId}`;
}

export function cachePlan(userId: string | null, plan: unknown): void {
	if (!available() || !userId) return;
	try {
		localStorage.setItem(planKey(userId), JSON.stringify(plan));
	} catch {
		// ignore quota errors
	}
}

export function cachedPlan<T = unknown>(userId: string | null): T | null {
	if (!available() || !userId) return null;
	try {
		const raw = localStorage.getItem(planKey(userId));
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

/** Remember the signed-in user, so an offline start can still open the app. */
export function cacheUser(user: CachedUser): void {
	if (!available()) return;
	try {
		localStorage.setItem(USER_KEY, JSON.stringify(user));
	} catch {
		// ignore quota errors
	}
}

export function cachedUser(): CachedUser | null {
	if (!available()) return null;
	try {
		const raw = localStorage.getItem(USER_KEY);
		const parsed = raw ? (JSON.parse(raw) as CachedUser) : null;
		return parsed && parsed.id ? parsed : null;
	} catch {
		return null;
	}
}

/** The cached user's id, or null when nobody signed in on this device yet. */
export function cachedUserId(): string | null {
	return cachedUser()?.id ?? null;
}

export function clearUser(): void {
	if (!available()) return;
	try {
		localStorage.removeItem(USER_KEY);
	} catch {
		// ignore
	}
}

/**
 * Drop every bit of per-user client state on sign-out, so a different account
 * signing in on the same device never sees the previous one's plan, session
 * state or health cache. Covers localStorage and sessionStorage.
 */
export function clearClientState(): void {
	for (const store of [safeStorage('local'), safeStorage('session')]) {
		if (!store) continue;
		try {
			for (const key of Object.keys(store)) {
				if (key.startsWith('sg:')) store.removeItem(key);
			}
		} catch {
			// Storage can be blocked; the reload after sign-out still resets memory.
		}
	}
}

function safeStorage(kind: 'local' | 'session'): Storage | null {
	if (kind === 'local') return typeof localStorage === 'undefined' ? null : localStorage;
	return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

export function isOnline(): boolean {
	return typeof navigator === 'undefined' ? true : navigator.onLine;
}

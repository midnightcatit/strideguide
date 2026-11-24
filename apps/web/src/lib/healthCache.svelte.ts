/**
 * One shared, in-memory cache for the connected-health reads, so the dashboard
 * card and the progress drill-down do not each hit the API on every visit.
 *
 * It holds the last connection status and the last health payload per window,
 * keyed by user, each with the time it was read. Reads are stale while
 * revalidate: a view renders whatever is cached straight away and the store
 * refreshes in the background once an entry passes the reuse window. That window
 * mirrors the server's manual-sync window, so a fresh cache means no connection
 * read, no sync and no metric fetch. sessionStorage keeps the cache across a
 * reload in the same tab.
 */
import {
	api,
	type ConnectionStatus,
	type HealthMetricWindow,
	type HealthMetricsPayload,
} from './api';
import { isFresh, syncDue } from './healthCache';

const STORAGE_KEY = 'sg:healthCache:v1';

interface WindowEntry {
	payload: HealthMetricsPayload;
	at: number;
}

interface CacheState {
	userId: string | null;
	connection: ConnectionStatus | null;
	connectionAt: number;
	windows: Partial<Record<HealthMetricWindow, WindowEntry>>;
}

function empty(): CacheState {
	return { userId: null, connection: null, connectionAt: 0, windows: {} };
}

function hydrate(): CacheState {
	if (typeof sessionStorage === 'undefined') return empty();
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return empty();
		const parsed = JSON.parse(raw) as Partial<CacheState>;
		return {
			userId: parsed.userId ?? null,
			connection: parsed.connection ?? null,
			connectionAt: parsed.connectionAt ?? 0,
			windows: parsed.windows ?? {},
		};
	} catch {
		return empty();
	}
}

export const healthCache = $state<CacheState>(hydrate());

function persist(): void {
	if (typeof sessionStorage === 'undefined') return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(healthCache));
	} catch {
		// Private mode or a full store: the in-memory cache still holds the session.
	}
}

/** The cached payload for a window, but only for the signed-in user. */
export function healthFor(
	userId: string | null,
	windowDays: HealthMetricWindow,
): HealthMetricsPayload | null {
	if (!userId || healthCache.userId !== userId) return null;
	return healthCache.windows[windowDays]?.payload ?? null;
}

/** The cached connection status, but only for the signed-in user. */
export function connectionFor(userId: string | null): ConnectionStatus | null {
	if (!userId || healthCache.userId !== userId) return null;
	return healthCache.connection;
}

function resetFor(userId: string): void {
	if (healthCache.userId === userId) return;
	healthCache.userId = userId;
	healthCache.connection = null;
	healthCache.connectionAt = 0;
	healthCache.windows = {};
	persist();
}

let connectionTask: Promise<void> | null = null;
const payloadTasks = new Map<HealthMetricWindow, Promise<void>>();

async function refreshConnection(): Promise<void> {
	if (!isFresh(healthCache.connectionAt, Date.now())) {
		try {
			const res = await api.connections();
			healthCache.connection = res.providers.find((p) => p.id === 'google-health') ?? null;
			healthCache.connectionAt = Date.now();
			persist();
		} catch {
			// Keep the last known connection; a stale read beats none.
		}
	}
	const connection = healthCache.connection;
	if (!connection?.connected) return;
	if (!syncDue(connection.lastSyncedAt, Date.now())) return;
	try {
		const res = await api.syncConnection('google-health');
		if (healthCache.connection && res.lastSyncedAt) {
			healthCache.connection = { ...healthCache.connection, lastSyncedAt: res.lastSyncedAt };
			healthCache.connectionAt = Date.now();
			persist();
		}
	} catch {
		// A failed sync leaves the last one in place; the next view tries again.
	}
}

function ensureConnection(): Promise<void> {
	if (!connectionTask) {
		connectionTask = refreshConnection().finally(() => {
			connectionTask = null;
		});
	}
	return connectionTask;
}

async function refreshPayload(windowDays: HealthMetricWindow): Promise<void> {
	if (isFresh(healthCache.windows[windowDays]?.at ?? null, Date.now())) return;
	const payload = await api.healthMetrics(windowDays);
	// Reassign the map so the change is a plain top-level write, which the cache
	// readers are guaranteed to pick up.
	healthCache.windows = { ...healthCache.windows, [windowDays]: { payload, at: Date.now() } };
	persist();
}

function ensurePayload(windowDays: HealthMetricWindow): Promise<void> {
	const running = payloadTasks.get(windowDays);
	if (running) return running;
	const task = refreshPayload(windowDays)
		.catch(() => {})
		.finally(() => {
			payloadTasks.delete(windowDays);
		});
	payloadTasks.set(windowDays, task);
	return task;
}

/**
 * Read the connection and the requested window, reusing the cache when it is
 * fresh. Safe to call from every view: the first caller refreshes, later callers
 * wait on the same request, and a fresh cache makes no network call at all.
 */
export async function ensureHealth(userId: string, windowDays: HealthMetricWindow): Promise<void> {
	resetFor(userId);
	await ensureConnection();
	await ensurePayload(windowDays);
}

/**
 * Pure decisions for the shared connected-health cache. Keeping the window math
 * here, with no runes and no browser APIs, lets the freshness rules be tested on
 * their own and reused by the reactive store in healthCache.svelte.ts.
 */

/** The server reuses a manual sync for this long. The client mirrors the window
 * so a view does not ask the API for work it just did. */
export const MANUAL_SYNC_WINDOW_MS = 20 * 60 * 1000;

/** Whether a client timestamp is still inside the reuse window. A missing time
 * (nothing stored yet) always reads as stale. */
export function isFresh(
	at: number | null,
	now: number,
	windowMs: number = MANUAL_SYNC_WINDOW_MS,
): boolean {
	return at != null && now - at < windowMs;
}

/** Whether a manual sync should run, given the connection's last success time.
 * A missing or unreadable time runs; the window edge counts as due, matching the
 * server's manualSyncNeeded. */
export function syncDue(
	lastSyncedAt: string | null,
	now: number,
	windowMs: number = MANUAL_SYNC_WINDOW_MS,
): boolean {
	if (!lastSyncedAt) return true;
	const at = Date.parse(lastSyncedAt);
	return !Number.isFinite(at) || now - at >= windowMs;
}

/**
 * Remember where a view was left, so a Back from a drill-down lands where the
 * runner left instead of resetting to the top. Keyed per route and kept in
 * sessionStorage, so it is per tab and clears when the tab closes. A timing
 * independent store, unlike the router snapshot, so a page reads it on mount and
 * restores its scroll even while its data is still arriving.
 */
const PREFIX = 'sg:view:';

export function saveView<T>(key: string, value: T): void {
	try {
		sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
	} catch {
		// Private mode or storage full: the view simply will not restore.
	}
}

export function readView<T>(key: string): T | null {
	try {
		const raw = sessionStorage.getItem(PREFIX + key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

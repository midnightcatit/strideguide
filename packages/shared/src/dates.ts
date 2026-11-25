/**
 * Date helpers for the runner's own civil calendar. Every screen answers for the
 * day the runner is living in, so "today" is the date on their device, not the
 * UTC date. The two differ for a few hours each day on either side of UTC, which
 * is why a UTC "today" lands on yesterday just after midnight ahead of UTC.
 */

/** The local calendar date as yyyy-mm-dd for a moment (defaults to now). */
export function localIso(date: Date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * A stored timestamp as epoch milliseconds, from either an ISO string or a
 * number. The number form is seconds: that is what a `created_at` column holds
 * and what the client writes when it queues a log offline, so every reader
 * agrees on one convention instead of guessing per call site.
 */
export function epochMs(value: string | number | null | undefined): number | undefined {
	if (value == null) return undefined;
	if (typeof value === 'number') return Number.isFinite(value) ? value * 1000 : undefined;
	const t = Date.parse(value);
	return Number.isNaN(t) ? undefined : t;
}

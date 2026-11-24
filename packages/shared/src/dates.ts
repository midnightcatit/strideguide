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

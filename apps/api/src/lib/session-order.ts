/**
 * Order the sessions of one day: the planned ones first in their slot order
 * (AM before PM), then any the runner added, so a workout they add lands at the
 * end of the day rather than before a planned session.
 */
export interface OrderableSession {
	day: number;
	slot?: string | null;
	prescription?: unknown;
}

function added(session: OrderableSession): number {
	return (session.prescription as { added?: boolean } | null)?.added === true ? 1 : 0;
}

export function compareDaySessions(a: OrderableSession, b: OrderableSession): number {
	if (a.day !== b.day) return a.day - b.day;
	const byAdded = added(a) - added(b);
	if (byAdded !== 0) return byAdded;
	return (a.slot ?? '').localeCompare(b.slot ?? '');
}

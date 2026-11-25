/**
 * Reconcile a rebuilt plan's sessions against the ones already stored, so a
 * session that keeps its logical identity (day, slot, type) keeps its row id.
 *
 * The session id is the anchor for a log, a session state and a confirmed
 * activity, and it is what the fitness estimate joins a logged run back to for
 * its type. Rebuilding a plan by deleting and re-inserting every session minted
 * fresh ids, so all three dangled: logs lost their type, session states were
 * stranded, and confirmed activity matches were nulled. Reusing the id whenever
 * the logical identity is unchanged keeps the runner's history attached.
 *
 * Pure: it only plans the writes. The caller applies updates, then inserts, then
 * deletes. Deletes go last so nothing is removed while an update might still
 * name it.
 */

/** A stored session, as far as identity is concerned. */
export interface ExistingSession {
	id: string;
	day: number;
	slot: string | null;
	type: string;
}

/** A session the rebuild wants to store. */
export interface DesiredSession {
	day: number;
	slot: string;
	type: string;
}

export interface SessionReconcile<T extends DesiredSession> {
	/** Reuse the id: update this stored row to the desired session. */
	updates: { id: string; session: T }[];
	/** No stored row matched: insert with a fresh id. */
	inserts: T[];
	/** Stored rows no longer in the plan: remove them. */
	deletes: string[];
}

/** The logical identity of a session within its week. */
function key(day: number, slot: string | null, type: string): string {
	return `${day}|${slot ?? 'AM'}|${type}`;
}

export function reconcileSessions<T extends DesiredSession>(
	existing: ExistingSession[],
	desired: T[],
): SessionReconcile<T> {
	// A pool per logical key, so two desired sessions that share a key (an added
	// workout that shares the planned AM slot) each consume a stored row in turn
	// rather than fighting over one id.
	const pool = new Map<string, ExistingSession[]>();
	for (const e of existing) {
		const k = key(e.day, e.slot, e.type);
		const list = pool.get(k);
		if (list) list.push(e);
		else pool.set(k, [e]);
	}

	const updates: SessionReconcile<T>['updates'] = [];
	const inserts: T[] = [];
	for (const session of desired) {
		const match = pool.get(key(session.day, session.slot, session.type))?.shift();
		if (match) updates.push({ id: match.id, session });
		else inserts.push(session);
	}

	const deletes: string[] = [];
	for (const list of pool.values()) for (const e of list) deletes.push(e.id);

	return { updates, inserts, deletes };
}

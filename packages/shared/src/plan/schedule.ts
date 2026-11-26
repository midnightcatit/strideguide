/**
 * Fitting a week's sessions into the runner's blocked-out windows.
 *
 * The runner stores free windows in settings.prefs.schedule, one per weekday with
 * a local "HH:MM" start and end (see ScheduleBlock). When any are present the
 * engine calls placeSessions to give each session a start time inside a window
 * that can hold it, and to move a session to another of the runner's days only
 * when its own day has windows but none is long enough. With no schedule the
 * function returns the sessions exactly as they came in, so a plan built without
 * one is byte for byte what it was before. Nothing here touches distances, the
 * week's volume or the training maths; it sets a day and an optional start time,
 * nothing else. Every branch is pure and deterministic.
 */
import type { ScheduleBlock } from '../units';
import type { PlannedSession } from './types';

/** Monday first, matching the app's weekday convention (0 = Monday). */
const DAY_LABELS = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
] as const;

/** Minutes from midnight for a stored "HH:MM" time. */
function timeToMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}

/** A stored "HH:MM" time (24-hour) for minutes from midnight. */
function minutesToTime(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Plain wording for a length of time, e.g. "1 hour 35 minutes" or "50 minutes". */
function humanDuration(minutes: number): string {
	const total = Math.max(0, Math.round(minutes));
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h && m) return `${h} hour${h === 1 ? '' : 's'} ${m} minutes`;
	if (h) return `${h} hour${h === 1 ? '' : 's'}`;
	return `${m} minutes`;
}

/** A window on one of the runner's days, with the room left after placements. */
interface Slot {
	day: number;
	start: number;
	end: number;
	/** Minutes already given to sessions in this window. */
	used: number;
	/** How many sessions already sit in this window. */
	count: number;
}

/** A session no window could hold: what it is, the day it stays on and how long. */
export interface UnplacedSession {
	title: string;
	day: number;
	needMin: number;
}

export interface SchedulePlacement {
	sessions: PlannedSession[];
	/** Sessions no window could hold, so the engine can warn about each. */
	unplaced: UnplacedSession[];
	/** Windows were saved, but none falls on a day the runner trains. */
	noWindowsOnTrainingDays: boolean;
}

/** Said once when every saved window is on a day the runner does not train. */
const NO_WINDOW_ON_DAYS =
	'You saved training windows, but none of them fall on the days you can train, so the plan uses your chosen days alone.';

/**
 * The best window to take from a set of candidates. Prefer one that is still
 * empty, so a day's sessions spread across its windows instead of stacking into
 * the first; then the tightest fit, so a long run leaves the longer windows for
 * later; then the earliest window, so the result is stable.
 */
function pickSlot(candidates: Slot[]): Slot {
	return [...candidates].sort(
		(a, b) =>
			a.count - b.count ||
			a.end - a.start - a.used - (b.end - b.start - b.used) ||
			a.day - b.day ||
			a.start - b.start,
	)[0]!;
}

/**
 * Place a week's sessions inside the runner's windows.
 *
 * A session lands in a window on its own day when one can hold it. If its own day
 * has windows but none is long enough, it moves to a window on another of the
 * runner's days that can, rather than being dropped. A day with no windows is
 * left open: the session stays there with no time. When no window can hold a
 * session at all, it stays on its own day with no time and is reported as
 * unplaced, for the engine to warn about. A race keeps its fixed date, and a
 * cross-training session keeps its sport day; neither moves, though both still
 * take a time when their own day has a window that fits.
 */
export function placeSessions(
	sessions: PlannedSession[],
	schedule: ScheduleBlock[] | undefined,
	availableDays: number[],
): SchedulePlacement {
	if (!schedule?.length) {
		return { sessions, unplaced: [], noWindowsOnTrainingDays: false };
	}

	const available = new Set(availableDays);
	const slots: Slot[] = schedule
		.filter((b) => available.has(b.day))
		.map((b) => ({
			day: b.day,
			start: timeToMinutes(b.start),
			end: timeToMinutes(b.end),
			used: 0,
			count: 0,
		}))
		.filter((s) => s.end > s.start)
		.sort((a, b) => a.day - b.day || a.start - b.start);

	// Windows exist, but on none of the days the runner trains: say so plainly
	// rather than quietly using the chosen days alone.
	if (!slots.length) {
		return { sessions, unplaced: [], noWindowsOnTrainingDays: true };
	}

	const daysWithWindows = new Set(slots.map((s) => s.day));
	const unplaced: UnplacedSession[] = [];
	const placed = new Map<PlannedSession, PlannedSession>();

	// Longest sessions first, so a long run claims a window that can hold it and
	// short sessions fall into the smaller ones. Ties break on the session's own
	// day, then its type and slot, so the result never depends on input order.
	const order = [...sessions].sort(
		(a, b) =>
			b.durationMin - a.durationMin ||
			a.day - b.day ||
			a.type.localeCompare(b.type) ||
			a.slot.localeCompare(b.slot),
	);

	for (const session of order) {
		// The race is a fixed calendar event, not a session to place.
		if (session.type === 'race') continue;
		const need = Math.max(0, Math.round(session.durationMin));
		const fits = (s: Slot) => s.end - s.start - s.used >= need;

		const onOwnDay = slots.filter((s) => s.day === session.day && fits(s));
		const anywhere = slots.filter(fits);
		const canMove = session.type !== 'cross-train';

		let chosen: Slot | undefined;
		if (onOwnDay.length) {
			chosen = pickSlot(onOwnDay);
		} else if (anywhere.length && canMove && daysWithWindows.has(session.day)) {
			// Its own day has windows but none is long enough: move it to a window
			// on another day the runner trains rather than leaving it unscheduled.
			chosen = pickSlot(anywhere);
		} else if (!daysWithWindows.has(session.day)) {
			// Its own day carries no window, so it stays open and unconstrained.
			continue;
		} else {
			unplaced.push({ title: session.title, day: session.day, needMin: need });
			continue;
		}

		const timeStart = minutesToTime(chosen.start + chosen.used);
		chosen.used += need;
		chosen.count += 1;
		placed.set(session, {
			...session,
			day: chosen.day,
			prescription: { ...session.prescription, timeStart },
		});
	}

	const out = sessions.map((s) => placed.get(s) ?? s);
	return { sessions: out, unplaced, noWindowsOnTrainingDays: false };
}

/**
 * The plain warnings for a placement, deduped so a problem that repeats every
 * week of the plan is said once. Each note names the session, the length it
 * needs and the day it stays on.
 */
export function scheduleWarnings(
	unplaced: UnplacedSession[],
	noWindowsOnTrainingDays: boolean,
): string[] {
	const out: string[] = [];
	if (noWindowsOnTrainingDays) out.push(NO_WINDOW_ON_DAYS);
	// One note per session and day, at its longest need across the plan.
	const worst = new Map<string, UnplacedSession>();
	for (const note of unplaced) {
		const key = `${note.title}|${note.day}`;
		const prev = worst.get(key);
		if (!prev || note.needMin > prev.needMin) worst.set(key, note);
	}
	for (const note of worst.values()) {
		const day = DAY_LABELS[note.day] ?? `day ${note.day}`;
		out.push(
			`Your ${note.title.toLowerCase()} on ${day} needs about ${humanDuration(note.needMin)}, and the windows you blocked out cannot fit it in. It stays on ${day} with no set time.`,
		);
	}
	return out;
}

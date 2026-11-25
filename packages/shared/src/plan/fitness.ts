import { epochMs } from '../dates';
import { VDOT_MAX, VDOT_MIN, vdotFromRace } from './vdot';

/**
 * A pure read of a runner's current fitness and preferences from what they have
 * actually logged. No I/O, no clock except an optional `now`, so it is cheap and
 * testable. Everything downstream (paces, volume, adaptation, model shaping)
 * leans on this one signal.
 */

/** One logged session, already joined to the plan so it carries its type. */
export interface FitnessEntry {
	sessionId?: string | null;
	/** The plan session's type (easy, long, tempo, interval, strength, ...). */
	type?: string | null;
	/** The plan session's modality (running, strength, mobility, recovery), when known. */
	modality?: string | null;
	/** ISO date or epoch seconds. */
	date?: string | number | null;
	distanceKm?: number | null;
	durationSec?: number | null;
	rpe?: number | null;
	feedback?: 'up' | 'down' | null;
}

export interface FitnessState {
	/** Best recent hard effort, as an effective VDOT, when one reads. */
	effectiveVdot?: number;
	/** Average running distance per week over the recent window, in km. */
	recentWeeklyKm: number;
	/** Whether effort has drifted up, down or held across recent sessions. */
	rpeTrend?: 'rising' | 'steady' | 'falling';
	/** Session types the runner rated up more than down. */
	likedTypes: string[];
	/** Session types the runner rated down more than up. */
	dislikedTypes: string[];
	/** How many logged sessions the read is based on. */
	samples: number;
}

export interface FitnessOptions {
	/** Recent race times, the most reliable fitness anchor. */
	raceTimes?: Record<string, string>;
	/** Days in the recent window (default 28). */
	windowDays?: number;
	/** Current time as epoch milliseconds (defaults to Date.now()). */
	now?: number;
}

const DAY_MS = 86400000;

/** A session type that is a genuine hard effort, so its pace can set VDOT. */
const HARD_TYPES = new Set(['race', 'race-pace', 'interval', 'tempo', 'hills']);

/**
 * Session types that are never a run, so their distance must not read as run
 * volume. Kept as a last resort for an entry that carries no modality; when the
 * modality is known it decides, since a recovery jog is running but a spin is not.
 */
const NON_RUNNING_TYPES = new Set([
	'strength',
	'machine-circuit',
	'full-body-strength',
	'mobility',
	'cross-train',
	'walk',
	'walking',
]);

function entryTime(entry: FitnessEntry): number | undefined {
	return epochMs(entry.date);
}

/** Best VDOT readable from a recent hard effort with a distance and a time. */
function vdotFromEntries(entries: FitnessEntry[]): number | undefined {
	let best: number | undefined;
	for (const e of entries) {
		const km = e.distanceKm ?? 0;
		const secs = e.durationSec ?? 0;
		if (km < 3 || secs <= 0) continue;
		const hard = (e.rpe ?? 0) >= 8 || (e.type ? HARD_TYPES.has(e.type) : false);
		if (!hard) continue;
		const v = vdotFromRace(km * 1000, secs);
		if (Number.isFinite(v) && v >= VDOT_MIN && v <= VDOT_MAX && (best === undefined || v > best)) {
			best = v;
		}
	}
	return best;
}

/** Net thumbs feedback per session type, split into liked and disliked. */
function feedbackByType(entries: FitnessEntry[]): { liked: string[]; disliked: string[] } {
	const tally = new Map<string, { up: number; down: number }>();
	for (const e of entries) {
		if (!e.type || !e.feedback) continue;
		const row = tally.get(e.type) ?? { up: 0, down: 0 };
		if (e.feedback === 'up') row.up++;
		else row.down++;
		tally.set(e.type, row);
	}
	const liked: string[] = [];
	const disliked: string[] = [];
	for (const [type, { up, down }] of tally) {
		if (up > down) liked.push(type);
		else if (down > up) disliked.push(type);
	}
	return { liked: liked.sort(), disliked: disliked.sort() };
}

export function fitnessState(entries: FitnessEntry[], opts: FitnessOptions = {}): FitnessState {
	const now = opts.now ?? Date.now();
	const windowDays = opts.windowDays ?? 28;
	const since = now - windowDays * DAY_MS;
	// Within the window when a date is known; time-based signals need a date.
	const recent = entries.filter((e) => {
		const t = entryTime(e);
		return t !== undefined && t >= since && t <= now + DAY_MS;
	});
	const feed = feedbackByType(recent);

	// Weekly volume from recent running only. The modality decides when the entry
	// carries one, so a recovery jog counts but a spin, a strength session or a
	// mobility session never does; without a modality, only the never-running
	// types drop out.
	let km = 0;
	for (const e of recent) {
		if (typeof e.distanceKm !== 'number' || e.distanceKm <= 0) continue;
		if (e.modality != null) {
			if (e.modality !== 'running') continue;
		} else if (e.type && NON_RUNNING_TYPES.has(e.type)) {
			continue;
		}
		km += e.distanceKm;
	}
	const recentWeeklyKm = Math.round((km / (windowDays / 7)) * 10) / 10;

	// Effort trend: the average RPE of the newer half against the older half.
	const rated = recent
		.filter((e) => typeof e.rpe === 'number' && e.rpe > 0)
		.sort((a, b) => (entryTime(a) ?? 0) - (entryTime(b) ?? 0));
	let rpeTrend: FitnessState['rpeTrend'];
	if (rated.length >= 6) {
		const half = Math.floor(rated.length / 2);
		const older = rated.slice(0, half);
		const newer = rated.slice(half);
		const avg = (xs: FitnessEntry[]) => xs.reduce((s, e) => s + (e.rpe ?? 0), 0) / xs.length;
		const diff = avg(newer) - avg(older);
		rpeTrend = diff >= 0.9 ? 'rising' : diff <= -0.9 ? 'falling' : 'steady';
	}

	return {
		effectiveVdot: vdotFromEntries(recent),
		recentWeeklyKm,
		rpeTrend,
		likedTypes: feed.liked,
		dislikedTypes: feed.disliked,
		samples: recent.length,
	};
}

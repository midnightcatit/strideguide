/**
 * The rest model for strength work: how long a runner waits between sets, and
 * how a workout stored with implicit rest becomes one with explicit rest cards.
 *
 * The bands follow the ACSM position stand on progression models (2009): two to
 * three minutes for heavy core lifts, one to two minutes for assistance work.
 * This app prescribes strength at RPE 7 to 8 rather than lifting to failure, so
 * the runner rests at the low end of each band and still keeps the stimulus.
 */
import type { StructuredWorkout, WorkoutStep } from '../types';

/** Rest between sets by phase, in seconds: [short end, long end]. A taper week
 * keeps the build band and the post-race recovery weeks rest like the base. */
const REST_BAND: Record<string, [number, number]> = {
	base: [45, 60],
	build: [75, 90],
	peak: [90, 120],
	taper: [75, 90],
	recovery: [45, 60],
};

/** How far up the band each level starts: a beginner at the short end, an
 * advanced runner at the long end, since they move heavier load. */
const LEVEL_NUDGE: Record<string, number> = {
	beginner: 0,
	intermediate: 0.5,
	advanced: 1,
};

/** Rest between strength sets, in seconds. The phase picks the band and the
 * runner's level nudges inside it, snapped to five seconds so the player's
 * countdown reads cleanly. An unknown phase or level falls back to the short
 * end of the base band. */
export function strengthRestSec(level: string, phase: string): number {
	const band = REST_BAND[phase] ?? REST_BAND.base!;
	const nudge = LEVEL_NUDGE[level] ?? 0;
	const sec = band[0] + (band[1] - band[0]) * nudge;
	return Math.round(sec / 5) * 5;
}

/** Plyometric moves need full recovery so every contact stays sharp, the way
 * the library prescribes them at 90 seconds or more. Other moves take the
 * phase band. */
export function strengthRestForMove(pattern: string, level: string, phase: string): number {
	return pattern === 'plyometric'
		? Math.max(strengthRestSec(level, phase), 90)
		: strengthRestSec(level, phase);
}

/** The note a rest card carries: one for an ordinary strength move, one for a
 * plyometric one. */
export const REST_CARD_NOTE = 'Catch your breath. The next set needs you fresh.';
export const PLYO_REST_CARD_NOTE = 'Full recovery keeps the jumps springy. Take all of it.';

/**
 * Turn a workout stored with implicit rest, where a work step carries `sets`
 * and `restSec`, into one with explicit rest cards: one rest step after each
 * set, none after the final set of the final move in playback order, since the
 * cool-down that follows is rest-free by design. A rest is kept before a later
 * block that still has work. A workout that already carries explicit rest cards
 * passes through unchanged, so callers can run it on every session.
 */
export function withRestCards(workout?: StructuredWorkout | null): StructuredWorkout | undefined {
	if (!workout) return undefined;
	const implicit = (s: WorkoutStep) => s.kind === 'work' && ((s.sets ?? 0) > 1 || (s.restSec ?? 0) > 0);
	if (!workout.blocks.some((b) => b.steps.some(implicit))) return workout;
	// The last work step in playback order takes no rest card: nothing follows it
	// but the finish, or a rest-free cool-down. Read across every block, so the
	// rest before a following block survives and only the true end drops it.
	let lastWork: WorkoutStep | undefined;
	for (const b of workout.blocks) for (const s of b.steps) if (s.kind === 'work') lastWork = s;
	const blocks = workout.blocks.map((b) => {
		if (!b.steps.some(implicit)) return b;
		const steps: WorkoutStep[] = [];
		b.steps.forEach((s) => {
			if (!implicit(s)) {
				steps.push(s);
				return;
			}
			const sets = Math.max(1, s.sets ?? 1);
			const rest = s.restSec ?? 0;
			for (let k = 0; k < sets; k++) {
				steps.push({ ...s, sets: 1, restSec: undefined });
				const finalSet = k === sets - 1;
				if (rest > 0 && !(finalSet && s === lastWork)) {
					steps.push({ kind: 'rest', label: 'Rest', durationSec: rest, note: REST_CARD_NOTE });
				}
			}
		});
		return { ...b, steps };
	});
	return { ...workout, blocks };
}

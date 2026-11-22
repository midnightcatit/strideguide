/**
 * Guided warm-up / cool-down routines (data). Dynamic drills before running,
 * gentle static stretches after — from the mobility research (research/wave-3/8a).
 * Durations in seconds; rendered as timed steps in the guided player.
 */

export interface Drill {
	name: string;
	durationSec: number;
}

/** Dynamic warm-up (~3 min) — wake up the joints and activate the muscles you'll use. */
export const WARMUP_DRILLS: Drill[] = [
	{ name: 'Easy jog, building', durationSec: 60 },
	{ name: 'Leg swings (front to back)', durationSec: 30 },
	{ name: 'Leg swings (side to side)', durationSec: 30 },
	{ name: 'Hip openers (walking)', durationSec: 30 },
	{ name: 'Ankle rocks', durationSec: 30 },
	{ name: 'A-skips or butt kicks', durationSec: 30 },
];

/** Cool-down stretches (~3 min) — hold gently, no bouncing. */
export const COOLDOWN_STRETCHES: Drill[] = [
	{ name: 'Calf stretch', durationSec: 45 },
	{ name: 'Hamstring stretch', durationSec: 45 },
	{ name: 'Quad stretch', durationSec: 45 },
	{ name: 'Hip flexor stretch', durationSec: 45 },
];

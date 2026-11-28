/**
 * Guided warm-up / cool-down routines and a stretching library (data). Dynamic
 * drills before running, gentle static stretches after or on rest days, from the
 * mobility and stretching research (research/wave-3/8a, research/wave-3/8c).
 * Durations in seconds; rendered as timed steps in the guided player.
 */

import type { StepBlock, StepKind, StructuredWorkout, WorkoutStep } from '../types';

export interface Drill {
	name: string;
	durationSec: number;
	/** How many rounds to run the hold. Total time under stretch is durationSec * rounds. */
	rounds?: number;
	/** What it works, shown in the detail view. */
	targets: string[];
	/** One plain sentence on why it helps running. */
	why: string;
	/** Where you should feel it. */
	feel: string;
	/** Technique cues, in plain language. */
	form: string[];
	/** Common mistakes to avoid. */
	mistakes: string[];
	/** Research explanation ref. */
	ref?: string;
}

const WARMUP_REF = 'wave-3/8a-warmup-cooldown-mobility';
const STRETCH_REF = 'wave-3/8c-stretching-flexibility';

/**
 * Warm-up drills in running order (research/wave-5/14b): the raise first, then
 * the dynamic activation and mobilisation work. The first entry is a longer raise
 * for sessions that start with drills before any running, such as strength.
 */
export const WARMUP_DRILLS: Drill[] = [
	{
		name: 'Brisk walk or easy jog',
		durationSec: 150,
		targets: ['whole body', 'aerobic'],
		why: 'The raise. Lifts heart rate and muscle temperature, so the drills and the first effort feel smoother.',
		feel: 'Warm and loose, breathing a little harder by the end.',
		form: ['Start easy and build over a couple of minutes.'],
		mistakes: ['Starting too hard and arriving already tired'],
		ref: WARMUP_REF,
	},
	{
		name: 'Leg swings (front to back)',
		durationSec: 30,
		targets: ['hamstrings', 'hip flexors', 'hips'],
		why: 'Wakes up the hip through its running range before you load it.',
		feel: 'Loose through the hip, with no pinch at the front.',
		form: ['Hold a wall and swing with control.', 'Let the leg travel a little further each rep.'],
		mistakes: ['Swinging wildly', 'Arching the lower back'],
		ref: WARMUP_REF,
	},
	{
		name: 'Leg swings (side to side)',
		durationSec: 30,
		targets: ['adductors', 'hips'],
		why: 'Opens the hips sideways, which helps keep the stride straight and even.',
		feel: 'A stretch along the inner thigh.',
		form: ['Sweep the leg across the body, then out.', 'Keep the torso upright.'],
		mistakes: ['Rotating the whole body instead of the leg'],
		ref: WARMUP_REF,
	},
	{
		name: 'Hip openers (walking)',
		durationSec: 30,
		targets: ['hips', 'glutes'],
		why: 'Opens the hip with each step, the way it moves when you run.',
		feel: 'A stretch at the front of the hip and glute.',
		form: ['Step and lift the knee out to the side.', 'Keep the movement smooth.'],
		mistakes: ['Rushing so the movement becomes a kick'],
		ref: WARMUP_REF,
	},
	{
		name: 'Ankle rocks',
		durationSec: 30,
		targets: ['ankles', 'calves'],
		why: 'Prepares the ankle to bend and the calf to load with each foot strike.',
		feel: 'A stretch at the front of the ankle and the calf.',
		form: ['Knee forward over the toes, heel down.', 'Rock forward and back slowly.'],
		mistakes: ['Heel lifting off the floor'],
		ref: WARMUP_REF,
	},
	{
		name: 'A-skips or butt kicks',
		durationSec: 30,
		targets: ['coordination', 'calves', 'hamstrings'],
		why: 'Wakes up the running pattern and the quick, springy contacts of faster running.',
		feel: 'Quick and light on your feet.',
		form: ['Stay tall with a small forward lean.', 'Fast feet, relaxed arms.'],
		mistakes: ['Reaching with the heel instead of lifting the knee with control'],
		ref: WARMUP_REF,
	},
];

/**
 * Quality sessions get a longer dynamic dose than easy and long runs, toward the
 * 4 to 6 minute window the research supports before hard running. The drills are
 * the same movements; only the dose changes, and the duration lives here as data
 * so it is easy to tune without touching the engine.
 */
const QUALITY_DRILL_SEC = 50;
export const QUALITY_WARMUP_DRILLS: Drill[] = WARMUP_DRILLS.slice(1).map((d) => ({
	...d,
	durationSec: QUALITY_DRILL_SEC,
}));

/**
 * Potentiation for quality sessions: short strides with an easy jog back. They
 * wake up the legs so the first hard effort of the session feels smooth.
 */
export const STRIDES: Drill[] = [
	{
		name: 'Stride',
		durationSec: 20,
		targets: ['legs', 'neuromuscular'],
		why: 'A short acceleration wakes up the legs so the first hard effort feels smooth.',
		feel: 'Fast and relaxed, building to about 90 percent effort.',
		form: ['Build smoothly to fast over a few seconds, then ease down.', 'Stay tall and relaxed.'],
		mistakes: ['Sprinting all out', 'Tensing the shoulders'],
		ref: WARMUP_REF,
	},
	{
		name: 'Easy jog back',
		durationSec: 40,
		targets: ['aerobic'],
		why: 'Lets you recover fully so each stride stays sharp.',
		feel: 'Easy and unhurried.',
		form: ['Jog back the way you came.'],
		mistakes: ['Rushing the recovery'],
		ref: WARMUP_REF,
	},
];

/** Cool-down stretches (~3 min): hold gently, no bouncing. */
export const COOLDOWN_STRETCHES: Drill[] = [
	{
		name: 'Calf stretch',
		durationSec: 40,
		targets: ['calves', 'Achilles'],
		why: 'Calves and Achilles take the load of every step, so they tighten after running.',
		feel: 'A stretch at the back of the lower leg.',
		form: [
			'Back leg straight, heel pressed down.',
			'Lean into the wall until you feel the stretch.',
		],
		mistakes: ['Bouncing instead of holding', 'Back foot turned out'],
		ref: STRETCH_REF,
	},
	{
		name: 'Hamstring stretch',
		durationSec: 40,
		targets: ['hamstrings'],
		why: 'Hamstrings work hard on every stride and shorten with hard running.',
		feel: 'A stretch along the back of the thigh.',
		form: ['Hinge forward with a flat back.', 'Stop at a gentle stretch, not a strain.'],
		mistakes: ['Rounding the back', 'Locking the knee hard'],
		ref: STRETCH_REF,
	},
	{
		name: 'Quad stretch',
		durationSec: 40,
		targets: ['quadriceps', 'hip flexors'],
		why: 'Quads and hip flexors tighten with the repetitive lift of running.',
		feel: 'A stretch at the front of the thigh.',
		form: ['Hold the ankle, knees together.', 'Push the hip forward gently.'],
		mistakes: ['Pulling the knee out to the side', 'Arching the lower back'],
		ref: STRETCH_REF,
	},
	{
		name: 'Hip flexor stretch',
		durationSec: 40,
		targets: ['hip flexors', 'hips'],
		why: 'Opens the front of the hip, which helps you run tall when tired.',
		feel: 'A stretch at the front of the hip on the back leg.',
		form: ['Kneel on one knee, tuck the pelvis under.', 'Press the hips gently forward.'],
		mistakes: ['Letting the front knee drift inward', 'Leaning back'],
		ref: STRETCH_REF,
	},
];

/** Extra static stretches, added when the flexibility goal is beyond the current range. */
export const EXTRA_STRETCHES: Drill[] = [
	{
		name: 'Glute stretch',
		durationSec: 45,
		rounds: 2,
		targets: ['glutes', 'hips'],
		why: 'Glutes tighten with hill work and faster running; releasing them helps the hip move freely.',
		feel: 'A stretch deep in the glute and outer hip.',
		form: ['Cross one ankle over the other knee.', 'Gently pull the knee toward the chest.'],
		mistakes: ['Pushing into pain', 'Lifting the head and shoulders off the floor'],
		ref: STRETCH_REF,
	},
	{
		name: 'Adductor stretch',
		durationSec: 45,
		rounds: 2,
		targets: ['adductors', 'inner thigh'],
		why: 'Keeps the inner thigh supple, which supports a steady, straight stride.',
		feel: 'A stretch along the inner thigh.',
		form: [
			'Widen the feet and shift weight to one side.',
			'Keep the moving knee tracking over the foot.',
		],
		mistakes: ['Bouncing', 'Letting the knee collapse inward'],
		ref: STRETCH_REF,
	},
	{
		name: 'Thoracic rotation',
		durationSec: 45,
		rounds: 2,
		targets: ['mid-back', 'shoulders'],
		why: 'Restores rotation in the upper back, which keeps the arm swing free.',
		feel: 'A gentle twist through the upper back.',
		form: [
			'Lie on your side, knees bent.',
			'Open the top arm across the body and follow it with your eyes.',
		],
		mistakes: ['Forcing the twist', 'Letting the knees lift'],
		ref: STRETCH_REF,
	},
	{
		name: 'Chest and shoulder stretch',
		durationSec: 45,
		rounds: 2,
		targets: ['chest', 'shoulders'],
		why: 'Counters the rounded posture that builds up over long runs.',
		feel: 'A stretch across the chest and the front of the shoulder.',
		form: ['Clasp the hands behind the back.', 'Lift the chest and open the shoulders.'],
		mistakes: ['Arching the lower back instead of opening the chest'],
		ref: STRETCH_REF,
	},
];

/**
 * A short mobility session. A flexibility goal beyond the current range adds the
 * extra stretches; otherwise it stays a maintenance routine. Cool-down holds sit
 * around 40 seconds, and the dedicated flexibility stretches run two rounds so
 * the total time under stretch is met without a single hold long enough to cost
 * power (research/wave-5/14a).
 */
export function mobilityRoutine(building: boolean): Drill[] {
	const dynamic = [WARMUP_DRILLS[1]!, WARMUP_DRILLS[2]!];
	const statics = building ? [...COOLDOWN_STRETCHES, ...EXTRA_STRETCHES] : COOLDOWN_STRETCHES;
	return [...dynamic, ...statics];
}

/**
 * Map drills to a block of timed steps. A drill that carries rounds becomes one
 * step whose `sets` is that round count, so a hold reads once at its full dose
 * ("2 x 40s") instead of as two identical rows. The player still runs every
 * round, and the total time under stretch stays durationSec * rounds.
 */
export function drillBlock(label: string, drills: Drill[], kind: StepKind): StepBlock {
	const steps: WorkoutStep[] = [];
	for (const d of drills) {
		const rounds = d.rounds ?? 1;
		steps.push({
			kind,
			label: d.name,
			durationSec: d.durationSec,
			sets: rounds > 1 ? rounds : undefined,
			targetRpe: kind === 'warmup' ? [2, 3] : [1, 2],
			note: d.why,
		});
	}
	return { repeat: 1, label, steps };
}

/** A guided mobility session: the dynamic loosen-up, then the static holds. */
export function mobilityWorkout(routine: Drill[]): StructuredWorkout {
	const dynamic = routine.slice(0, 2);
	const statics = routine.slice(2);
	return {
		blocks: [
			drillBlock('Loosen up', dynamic, 'warmup'),
			drillBlock('Mobility stretches', statics, 'cooldown'),
		],
	};
}

import { describe, expect, it } from 'vitest';
import {
	CUSTOM_WORKOUT_LIMITS,
	validateCustomWorkout,
	type CustomWorkoutDraft,
	type CustomWorkoutItem,
} from './workouts';

/** A minimal valid draft; each test bends one part of it. */
function draft(overrides?: {
	name?: string;
	category?: CustomWorkoutDraft['category'];
	warmup?: CustomWorkoutItem[];
	main?: CustomWorkoutItem[];
	cooldown?: CustomWorkoutItem[];
}): CustomWorkoutDraft {
	return {
		name: overrides?.name ?? 'Leg day',
		category: overrides?.category ?? 'strength',
		sections: {
			warmup: {
				items: overrides?.warmup ?? [
					{ kind: 'mobility', ref: 'Hip circles', durationSec: 30 },
				],
			},
			main: {
				items: overrides?.main ?? [{ kind: 'strength', ref: 'Leg press', sets: 3, reps: 10 }],
			},
			cooldown: {
				items:
					overrides?.cooldown ??
					[{ kind: 'mobility', ref: 'Standing straight-knee calf stretch', durationSec: 40 }],
			},
		},
	};
}

/** A draft as a buggy client could send it: JSON carries fields the type leaves out. */
function rawItem(value: unknown): CustomWorkoutItem {
	return value as CustomWorkoutItem;
}

describe('validateCustomWorkout', () => {
	it('accepts a workout whose items all resolve', () => {
		expect(validateCustomWorkout(draft())).toEqual([]);
	});

	it('asks for at least one item in each section', () => {
		for (const section of ['warmup', 'main', 'cooldown'] as const) {
			const d = draft();
			d.sections[section] = { items: [] };
			const problems = validateCustomWorkout(d);
			expect(problems.some((p) => p.includes('needs at least one item'))).toBe(true);
		}
	});

	it('refuses a section that carries only a note', () => {
		// A free-text line is a note on the section, never a buildable item, so a
		// note alone cannot stand in for the section's work.
		const d = draft();
		d.sections.main = { items: [], note: 'Then 10 minutes on the bike.' };
		expect(validateCustomWorkout(d).some((p) => p.includes('needs at least one item'))).toBe(
			true,
		);
	});

	it('keeps a note beside the items without turning it into one', () => {
		const d = draft();
		d.sections.main.note = 'Then 10 minutes on the bike.';
		expect(validateCustomWorkout(d)).toEqual([]);
	});

	it('resolves strength items against the move catalog', () => {
		expect(validateCustomWorkout(draft())).toEqual([]);
		const problems = validateCustomWorkout(
			draft({ main: [{ kind: 'strength', ref: 'Chest fly 9000', sets: 3, reps: 10 }] }),
		);
		expect(problems.some((p) => p.includes('not a move in the catalog'))).toBe(true);
	});

	it('resolves mobility items against the drill and stretch libraries', () => {
		expect(
			validateCustomWorkout(draft({ warmup: [{ kind: 'mobility', ref: 'Foam roll quads' }] })),
		).toEqual([]);
		const problems = validateCustomWorkout(
			draft({ warmup: [{ kind: 'mobility', ref: 'Made-up stretch' }] }),
		);
		expect(problems.some((p) => p.includes('not a drill or stretch'))).toBe(true);
	});

	it('resolves run items against the run archetypes', () => {
		expect(
			validateCustomWorkout(
				draft({
					category: 'running',
					warmup: [{ kind: 'run', ref: 'easy', durationSec: 300 }],
					main: [{ kind: 'run', ref: 'tempo', durationSec: 1200 }],
					cooldown: [{ kind: 'mobility', ref: 'Hip circles', durationSec: 30 }],
				}),
			),
		).toEqual([]);
		const problems = validateCustomWorkout(
			draft({ category: 'running', main: [{ kind: 'run', ref: 'machine-circuit' }] }),
		);
		expect(problems.some((p) => p.includes('not a run type'))).toBe(true);
	});

	it('holds main work to the workout category', () => {
		const problems = validateCustomWorkout(
			draft({ main: [{ kind: 'run', ref: 'easy', durationSec: 600 }] }),
		);
		expect(problems.some((p) => p.includes('Main work for a strength workout'))).toBe(true);
	});

	it('keeps strength moves out of the warm-up and cool-down', () => {
		const problems = validateCustomWorkout(
			draft({ warmup: [{ kind: 'strength', ref: 'Leg press', sets: 1, reps: 10 }] }),
		);
		expect(problems.some((p) => p.includes('not strength moves'))).toBe(true);
	});

	it('rejects dose fields the item kind does not support', () => {
		const strengthWithDistance = validateCustomWorkout(
			draft({ main: [rawItem({ kind: 'strength', ref: 'Leg press', sets: 3, distanceKm: 5 })] }),
		);
		expect(strengthWithDistance.some((p) => p.includes('does not take a distance'))).toBe(true);

		const runWithReps = validateCustomWorkout(
			draft({ category: 'running', main: [rawItem({ kind: 'run', ref: 'easy', reps: 10 })] }),
		);
		expect(runWithReps.some((p) => p.includes('does not take reps'))).toBe(true);

		const drillWithReps = validateCustomWorkout(
			draft({ warmup: [rawItem({ kind: 'mobility', ref: 'Hip circles', reps: 10 })] }),
		);
		expect(drillWithReps.some((p) => p.includes('does not take reps'))).toBe(true);
	});

	it('caps the sets a section carries under the player step limit', () => {
		// One set becomes a work step and, except the last, a rest step, so 99 sets
		// convert to 197 steps and stay under prescriptionSchema's 200-step block cap.
		const atCap = draft({
			main: [
				{ kind: 'strength', ref: 'Leg press', sets: 20 },
				{ kind: 'strength', ref: 'Leg press', sets: 20 },
				{ kind: 'strength', ref: 'Leg press', sets: 20 },
				{ kind: 'strength', ref: 'Leg press', sets: 20 },
				{ kind: 'strength', ref: 'Leg press', sets: 19 },
			],
		});
		expect(validateCustomWorkout(atCap)).toEqual([]);

		const overCap = draft({
			main: Array.from({ length: 6 }, () => ({
				kind: 'strength' as const,
				ref: 'Leg press',
				sets: 17,
			})),
		});
		expect(validateCustomWorkout(overCap).some((p) => p.includes('step limit'))).toBe(true);
		expect(CUSTOM_WORKOUT_LIMITS.maxSetsPerSection).toBe(99);
	});

	it('caps the items a section carries', () => {
		const problems = validateCustomWorkout(
			draft({
				main: Array.from(
					{ length: CUSTOM_WORKOUT_LIMITS.maxItemsPerSection + 1 },
					() => ({ kind: 'strength' as const, ref: 'Leg press', sets: 1, reps: 10 }),
				),
			}),
		);
		expect(problems.some((p) => p.includes('or fewer'))).toBe(true);
	});
});

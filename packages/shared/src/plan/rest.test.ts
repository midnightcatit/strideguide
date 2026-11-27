import { describe, expect, it } from 'vitest';
import { REST_CARD_NOTE, strengthRestForMove, strengthRestSec, withRestCards } from './rest';import type { StructuredWorkout } from '../types';

describe('strengthRestSec', () => {
	it('rests inside the phase band: base 45 to 60, build 75 to 90, peak 90 to 120', () => {
		for (const level of ['beginner', 'intermediate', 'advanced']) {
			expect(strengthRestSec(level, 'base')).toBeGreaterThanOrEqual(45);
			expect(strengthRestSec(level, 'base')).toBeLessThanOrEqual(60);
			expect(strengthRestSec(level, 'build')).toBeGreaterThanOrEqual(75);
			expect(strengthRestSec(level, 'build')).toBeLessThanOrEqual(90);
			expect(strengthRestSec(level, 'peak')).toBeGreaterThanOrEqual(90);
			expect(strengthRestSec(level, 'peak')).toBeLessThanOrEqual(120);
		}
	});

	it('rests longer as the level rises, inside the band', () => {
		for (const phase of ['base', 'build', 'peak']) {
			expect(strengthRestSec('beginner', phase)).toBeLessThan(strengthRestSec('intermediate', phase));
			expect(strengthRestSec('intermediate', phase)).toBeLessThan(strengthRestSec('advanced', phase));
		}
	});

	it('keeps a taper week on the build band and a recovery week on the base band', () => {
		expect(strengthRestSec('intermediate', 'taper')).toBe(strengthRestSec('intermediate', 'build'));
		expect(strengthRestSec('intermediate', 'recovery')).toBe(strengthRestSec('intermediate', 'base'));
	});

	it('falls back to the short end of the base band for an unknown phase or level', () => {
		expect(strengthRestSec('unknown', 'unknown')).toBe(strengthRestSec('beginner', 'base'));
	});

	it('gives plyometric moves full recovery and other moves the phase band', () => {
		expect(strengthRestForMove('plyometric', 'beginner', 'build')).toBe(90);
		expect(strengthRestForMove('squat', 'beginner', 'build')).toBe(strengthRestSec('beginner', 'build'));
	});
});

describe('withRestCards', () => {
	/** A strength workout stored before rest became explicit. */
	const implicitWorkout = (): StructuredWorkout => ({
		blocks: [
			{
				repeat: 1,
				label: 'Circuit',
				steps: [
					{ kind: 'work', label: 'Leg press', machine: 'Leg press', sets: 3, reps: 10, restSec: 75 },
					{ kind: 'work', label: 'Leg curl', machine: 'Leg curl', sets: 3, reps: 10, restSec: 75 },
				],
			},
		],
	});

	it('turns implicit rest into a rest card after each set', () => {
		const w = withRestCards(implicitWorkout())!;
		const steps = w.blocks[0]!.steps;
		expect(steps.map((s) => s.kind)).toEqual([
			'work',
			'rest',
			'work',
			'rest',
			'work',
			'rest',
			'work',
			'rest',
			'work',
			'rest',
			'work',
		]);
		expect(steps.filter((s) => s.kind === 'rest').every((s) => s.durationSec === 75)).toBe(true);
		expect(steps.filter((s) => s.kind === 'rest').every((s) => s.note === REST_CARD_NOTE)).toBe(true);
	});

	it('leaves no rest card after the final set of the final move', () => {
		const steps = withRestCards(implicitWorkout())!.blocks[0]!.steps;
		expect(steps[steps.length - 1]!.kind).toBe('work');
		expect(steps[steps.length - 1]!.label).toBe('Leg curl');
	});

	it('keeps the work whole: one set per step, no restSec left on them', () => {
		const steps = withRestCards(implicitWorkout())!.blocks[0]!.steps.filter((s) => s.kind === 'work');
		expect(steps.length).toBe(6);
		expect(steps.every((s) => (s.sets ?? 1) === 1 && s.restSec == null)).toBe(true);
		expect(steps.every((s) => s.label === 'Leg press' || s.label === 'Leg curl')).toBe(true);
	});

	it('expands a work step that carries only a set count, with no rest', () => {
		const w: StructuredWorkout = {
			blocks: [
				{
					repeat: 1,
					steps: [{ kind: 'work', label: 'Plank', machine: 'Plank', sets: 3, reps: 8 }],
				},
			],
		};
		const steps = withRestCards(w)!.blocks[0]!.steps;
		expect(steps.map((s) => s.kind)).toEqual(['work', 'work', 'work']);
	});

	it('passes a workout that already carries rest cards through unchanged', () => {
		const explicit: StructuredWorkout = {
			blocks: [
				{
					repeat: 1,
					label: 'Circuit',
					steps: [
						{ kind: 'work', label: 'Leg press', machine: 'Leg press', sets: 1, reps: 10 },
						{ kind: 'rest', label: 'Rest', durationSec: 75, note: REST_CARD_NOTE },
					],
				},
			],
		};
		expect(withRestCards(explicit)).toBe(explicit);
	});

	it('passes run workouts through unchanged and reads a missing workout as none', () => {
		const run: StructuredWorkout = {
			blocks: [
				{
					repeat: 6,
					steps: [
						{ kind: 'work', label: 'Interval', distanceM: 800 },
						{ kind: 'recovery', label: 'Recovery', distanceM: 400 },
					],
				},
			],
		};
		expect(withRestCards(run)).toBe(run);
		expect(withRestCards(undefined)).toBeUndefined();
		expect(withRestCards(null)).toBeUndefined();
	});

	it('keeps a transition rest before a later block and drops only the true last set', () => {
		const w: StructuredWorkout = {
			blocks: [
				{
					repeat: 1,
					label: 'Circuit',
					steps: [{ kind: 'work', label: 'Leg press', machine: 'Leg press', sets: 3, reps: 10, restSec: 75 }],
				},
				{
					repeat: 1,
					label: 'Finisher',
					steps: [{ kind: 'work', label: 'Plank', machine: 'Plank', sets: 2, reps: 1, restSec: 45 }],
				},
			],
		};
		const blocks = withRestCards(w)!.blocks;
		// Block one's final set is a transition into the next block, so it keeps
		// its rest. Only the last set of the whole workout drops it.
		expect(blocks[0]!.steps.map((s) => s.kind)).toEqual(['work', 'rest', 'work', 'rest', 'work', 'rest']);
		expect(blocks[1]!.steps.map((s) => s.kind)).toEqual(['work', 'rest', 'work']);
		expect(blocks[0]!.steps.filter((s) => s.kind === 'rest').every((s) => s.durationSec === 75)).toBe(true);
		expect(blocks[1]!.steps.filter((s) => s.kind === 'rest').every((s) => s.durationSec === 45)).toBe(true);
	});

	it('inserts no rest before a cool-down step that shares the block', () => {
		const w: StructuredWorkout = {
			blocks: [
				{
					repeat: 1,
					steps: [
						{ kind: 'work', label: 'Leg press', machine: 'Leg press', sets: 2, reps: 10, restSec: 75 },
						{ kind: 'cooldown', label: 'Calf stretch', durationSec: 40 },
					],
				},
			],
		};
		const steps = withRestCards(w)!.blocks[0]!.steps;
		// Work, rest, work, then straight into the cool-down.
		expect(steps.map((s) => s.kind)).toEqual(['work', 'rest', 'work', 'cooldown']);
	});
});

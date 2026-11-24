import { describe, expect, it } from 'vitest';
import { focusRoutine, mobilityFocus, mobilityPrescription } from './mobility-plan';

describe('mobilityFocus', () => {
	it('reads the area from the runner answers', () => {
		expect(mobilityFocus({})).toBe('general');
		expect(mobilityFocus({ niggles: 'a sore right knee on long runs' })).toBe('hips-glutes');
		expect(mobilityFocus({ terrain: 'flat' })).toBe('ankles');
		expect(mobilityFocus({ crossTraining: ['bike'] })).toBe('hips-glutes');
		expect(
			mobilityFocus({ crossTrainingSchedule: [{ activity: 'swim', days: [1, 4] }] }),
		).toBe('upper-back');
	});

	it('lets a named niggle outweigh the terrain and the sports', () => {
		// The ankle niggle counts for more than hilly terrain pointing at the calves.
		expect(mobilityFocus({ niggles: 'stiff left ankle', terrain: 'hilly' })).toBe('ankles');
		// Sports stack, and a niggle still wins over the terrain.
		expect(mobilityFocus({ crossTraining: ['swim', 'row'] })).toBe('upper-back');
		expect(mobilityFocus({ niggles: 'sore shoulder', terrain: 'hilly' })).toBe('upper-back');
	});
});

describe('mobilityPrescription', () => {
	it('keeps a small gap light and ramps to daily for the biggest', () => {
		expect(mobilityPrescription(0, {})).toBeUndefined();
		expect(mobilityPrescription(1, {})).toMatchObject({
			perWeek: 1,
			libraryId: 'mobility-stretch-8',
			focus: 'general',
		});
		expect(mobilityPrescription(2, {})).toMatchObject({
			perWeek: 2,
			libraryId: 'mobility-stretch-12',
			focus: 'general',
		});
		expect(mobilityPrescription(3, {})).toMatchObject({
			perWeek: 3,
			libraryId: 'mobility-build-general',
			focus: 'general',
		});
		expect(mobilityPrescription(4, {})).toMatchObject({
			perWeek: 7,
			libraryId: 'mobility-build-general',
			focus: 'general',
		});
	});

	it('aims a big gap at the area chosen from the answers', () => {
		expect(mobilityPrescription(4, { niggles: 'tight hips' })).toMatchObject({
			perWeek: 7,
			libraryId: 'mobility-build-hips-glutes',
			focus: 'hips-glutes',
		});
		// A gap too small to aim stays general even with a niggle.
		expect(mobilityPrescription(2, { niggles: 'tight hips' })).toMatchObject({
			libraryId: 'mobility-stretch-12',
			focus: 'general',
		});
	});
});

describe('focusRoutine', () => {
	it('returns a different routine per focus, with two rounds of each hold', () => {
		const names = (f: Parameters<typeof focusRoutine>[0]) => focusRoutine(f).map((d) => d.name);
		const general = names('general');
		const hips = names('hips-glutes');
		const ankles = names('ankles');
		// Two dynamic drills, then eight holds: every name must resolve, so a typo
		// shows up as a short routine rather than silently dropping a stretch.
		for (const focus of ['general', 'hips-glutes', 'hamstrings-calves', 'ankles', 'upper-back'] as const) {
			const routine = focusRoutine(focus);
			expect(routine, focus).toHaveLength(10);
			expect(new Set(routine.map((d) => d.name)).size).toBe(10);
		}
		expect(hips).not.toEqual(general);
		expect(ankles).not.toEqual(general);
		expect(hips).not.toEqual(ankles);
		expect(focusRoutine('hips-glutes').slice(2).every((d) => d.rounds === 2)).toBe(true);
	});
});

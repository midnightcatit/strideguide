import { describe, expect, it } from 'vitest';
import type { StructuredWorkout } from '../types';
import { WORKOUT_LIBRARY } from './library';
import {
	BODY_PARTS,
	bodyPartsForWorkout,
	bodyPartsIn,
	deriveBodyParts,
	matchesBodyPart,
	workoutLengthLabel,
	type BodyPart,
} from './workout-filters';

const byId = (id: string) => WORKOUT_LIBRARY.find((w) => w.id === id)!;

describe('body-part vocabulary', () => {
	it('lists each part once, in a stable order', () => {
		expect(new Set(BODY_PARTS).size).toBe(BODY_PARTS.length);
		expect(BODY_PARTS[0]).toBe('quads');
		expect(BODY_PARTS).toContain('full body');
	});
});

describe('deriving a workout’s parts', () => {
	it('reads the parts of a strength circuit from its own moves', () => {
		expect(bodyPartsForWorkout(byId('lower-body-strength-30'))).toEqual([
			'quads',
			'hamstrings',
			'glutes',
			'calves',
		]);
	});

	it('reads a mobility routine from its own drills', () => {
		expect(bodyPartsForWorkout(byId('hamstrings-calves-15'))).toEqual(['hamstrings', 'calves']);
	});

	it('gives a run no body part, so it filters by category alone', () => {
		for (const w of WORKOUT_LIBRARY) {
			if (w.modality !== 'running' && w.modality !== 'walking') continue;
			expect(bodyPartsForWorkout(w), `${w.id} should carry no body part`).toEqual([]);
		}
	});

	it('derives directly from a structured workout when asked', () => {
		expect(deriveBodyParts(byId('runner-core-20').workout)).toEqual(['core']);
	});

	it('reads a body part from a drill’s own targets', () => {
		// hamstrings-calves-15 carries an explicit bodyParts now, so this calls the
		// derivation directly to keep the drill-label path covered.
		const workout: StructuredWorkout = {
			blocks: [{ repeat: 1, steps: [{ kind: 'work', label: 'Standing quad stretch' }] }],
		};
		expect(deriveBodyParts(workout)).toEqual(['quads']);
	});
});

describe('the hand-set field', () => {
	it('lets a whole-body session sit under full body alone', () => {
		expect(bodyPartsForWorkout(byId('bodyweight-full-body-25'))).toEqual(['full body']);
	});

	it('never mixes full body with another part on one entry', () => {
		for (const w of WORKOUT_LIBRARY) {
			const parts = bodyPartsForWorkout(w);
			if (!parts.includes('full body')) continue;
			expect(parts, `${w.id} lists full body with another part`).toEqual(['full body']);
		}
	});

	it('fills every strength and mobility entry with a part', () => {
		for (const w of WORKOUT_LIBRARY) {
			if (w.modality !== 'strength' && w.modality !== 'mobility') continue;
			expect(bodyPartsForWorkout(w).length, `${w.id} has no body part`).toBeGreaterThan(0);
		}
	});

	it('keeps the entries the derivation does not reach, set by hand', () => {
		expect(bodyPartsForWorkout(byId('desk-break-8'))).toEqual(['hamstrings', 'hips', 'chest', 'back']);
		expect(bodyPartsForWorkout(byId('post-run-cooldown-12'))).toEqual(['full body']);
	});
});

describe('the body-part filter', () => {
	const parts: BodyPart[] = ['hamstrings', 'calves'];

	it('passes everything on all, and matches an included part', () => {
		expect(matchesBodyPart(parts, 'all')).toBe(true);
		expect(matchesBodyPart(parts, 'hamstrings')).toBe(true);
		expect(matchesBodyPart(parts, 'glutes')).toBe(false);
		expect(matchesBodyPart(undefined, 'glutes')).toBe(false);
		expect(matchesBodyPart(['full body'], 'full body')).toBe(true);
	});

	it('collects the parts present across a list in chip order', () => {
		expect(bodyPartsIn([byId('hamstrings-calves-15'), byId('runner-core-20')])).toEqual([
			'hamstrings',
			'calves',
			'core',
		]);
	});
});

describe('the length label', () => {
	it('reads as the secondary text a row shows', () => {
		expect(workoutLengthLabel(30)).toBe('30 min');
	});

	it('is empty when a workout has no length', () => {
		expect(workoutLengthLabel(undefined)).toBe('');
		expect(workoutLengthLabel(0)).toBe('');
	});
});

import { describe, expect, it } from 'vitest';
import { type CustomWorkout } from '@strideguide/shared';
import { NAMED_WORKOUTS } from '@strideguide/shared/plan';
import {
	categoryForCustomWorkout,
	categoryForLibraryWorkout,
	composerCategoryForFilter,
	customRef,
	filterFavoriteRefs,
	imageForLabels,
	matchesFavorite,
	recipeRefs,
	resolveFavoriteRefs,
	slugifyExercise,
	type FavoriteWorkoutRef,
} from './favorite-picker';

function custom(overrides: Partial<CustomWorkout> = {}): CustomWorkout {
	return {
		id: 'custom-1',
		name: 'Thursday hills',
		category: 'running',
		sections: {
			warmup: { items: [{ kind: 'run', ref: 'easy' }] },
			main: { items: [{ kind: 'run', ref: 'hills' }] },
			cooldown: { items: [{ kind: 'run', ref: 'easy' }] },
		},
		createdAt: '2026-11-27T00:00:00.000Z',
		updatedAt: '2026-11-27T00:00:00.000Z',
		...overrides,
	};
}

describe('favourite workout categories', () => {
	it('reads a library workout as the category a runner would look under', () => {
		expect(categoryForLibraryWorkout({ modality: 'running', type: 'interval' })).toBe('run');
		expect(categoryForLibraryWorkout({ modality: 'running', type: 'recovery' })).toBe('recovery');
		expect(categoryForLibraryWorkout({ modality: 'strength', type: 'full-body-strength' })).toBe(
			'strength',
		);
		expect(categoryForLibraryWorkout({ modality: 'mobility', type: 'mobility' })).toBe('mobility');
	});

	it('maps the custom vocabulary, where running means run', () => {
		expect(categoryForCustomWorkout('running')).toBe('run');
		expect(categoryForCustomWorkout('strength')).toBe('strength');
		expect(categoryForCustomWorkout('mobility')).toBe('mobility');
		expect(categoryForCustomWorkout('recovery')).toBe('recovery');
	});

	it('opens a new composer workout in the custom category behind the filter', () => {
		// A new workout opened from the Run filter must start as a run, not a run
		// step the composer cannot build.
		expect(composerCategoryForFilter('run')).toBe('running');
		expect(composerCategoryForFilter('strength')).toBe('strength');
		expect(composerCategoryForFilter('mobility')).toBe('mobility');
		expect(composerCategoryForFilter('recovery')).toBe('recovery');
		expect(composerCategoryForFilter('all')).toBe('strength');
	});
});

describe('favourite workout images', () => {
	it('slugifies a catalog name to the manifest key', () => {
		expect(slugifyExercise('Barbell back squat')).toBe('barbell-back-squat');
		expect(slugifyExercise('Pigeon pose (figure-4 hip stretch)')).toBe(
			'pigeon-pose-figure-4-hip-stretch',
		);
	});

	it('finds an image among the labels, and none for a run-only line', () => {
		expect(imageForLabels(['Easy jog', 'Barbell back squat'])).toBe(
			'/exercises/glutes/barbell-back-squat.webp',
		);
		expect(imageForLabels(['Easy jog', '5 km time trial'])).toBeUndefined();
	});
});

describe('favourite workout refs', () => {
	it('turns every curated recipe into a pick with a category and a title', () => {
		const refs = recipeRefs();
		expect(refs.map((r) => r.id)).toEqual(NAMED_WORKOUTS.map((w) => w.id));
		for (const ref of refs) {
			expect(ref.title.trim().length).toBeGreaterThan(0);
			expect(['run', 'strength', 'mobility', 'recovery']).toContain(ref.category);
			expect(ref.source).toBe('library');
		}
	});

	it('gives the five by five recipe its squat image', () => {
		const fiveByFive = recipeRefs().find((r) => r.id === 'five-by-five-full-body-60');
		expect(fiveByFive?.imagePath).toBe('/exercises/glutes/barbell-back-squat.webp');
	});

	it('resolves ids in order, skips unknown ids, and resolves custom ids', () => {
		const owned = custom({ id: 'owned-1' });
		const refs = resolveFavoriteRefs(
			['five-by-five-full-body-60', 'missing-id', 'owned-1', 'five-by-five-full-body-60'],
			[owned],
		);
		expect(refs.map((r) => r.id)).toEqual(['five-by-five-full-body-60', 'owned-1']);
		expect(refs[1]?.source).toBe('custom');
		expect(refs[1]?.category).toBe('run');
	});

	it('gives a custom workout the image of its first move that has one', () => {
		const owned = custom({
			id: 'owned-2',
			category: 'strength',
			sections: {
				warmup: { items: [{ kind: 'mobility', ref: 'Leg swings (front to back)' }] },
				main: { items: [{ kind: 'strength', ref: 'Nordic hamstring curl' }] },
				cooldown: { items: [{ kind: 'mobility', ref: 'Leg swings (front to back)' }] },
			},
		});
		expect(customRef(owned).imagePath).toBe('/exercises/legs/nordic-hamstring-curl.webp');
	});
});

describe('filtering picks', () => {
	const refs: FavoriteWorkoutRef[] = [
		{ id: 'a', title: 'Parkrun time trial, 5 km', category: 'run', source: 'library' },
		{ id: 'b', title: 'Five by five', category: 'strength', source: 'library' },
		{ id: 'c', title: 'Yoga for runners', category: 'mobility', source: 'library' },
	];

	it('keeps only the chosen category', () => {
		expect(filterFavoriteRefs(refs, 'strength', []).map((r) => r.id)).toEqual(['b']);
	});

	it('requires every search token, across the title and category', () => {
		expect(matchesFavorite(refs[0]!, 'all', ['parkrun'])).toBe(true);
		expect(matchesFavorite(refs[0]!, 'all', ['parkrun', 'strength'])).toBe(false);
		expect(filterFavoriteRefs(refs, 'all', ['runners']).map((r) => r.id)).toEqual(['c']);
	});
});

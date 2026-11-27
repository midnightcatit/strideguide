/**
 * The pure logic behind the favourites picker: turn the curated library recipes
 * and the runner's own custom workouts into one list of picks, resolve a saved
 * id back to a label, and work out the image for a pick when one exists. Kept
 * free of Svelte and the DOM so the grouping, filtering and label rules are
 * cheap to test.
 */

import {
	BODY_PARTS,
	exerciseImage,
	NAMED_WORKOUTS,
	bodyPartsForWorkout,
	matchesBodyPart,
	WORKOUT_LIBRARY,
	type BodyPart,
	type LibraryWorkout,
} from '@strideguide/shared/plan';
import type { CustomWorkout, CustomWorkoutCategory } from '@strideguide/shared';

/** The categories the picker groups by: a run, strength, mobility or recovery session. */
export type FavoriteCategory = 'run' | 'strength' | 'mobility' | 'recovery';

/** The category behind each chip, in the order a runner reads them. */
export const FAVORITE_CATEGORIES: readonly { key: FavoriteCategory; label: string }[] = [
	{ key: 'run', label: 'Run' },
	{ key: 'strength', label: 'Strength' },
	{ key: 'mobility', label: 'Mobility' },
	{ key: 'recovery', label: 'Recovery' },
];

/** The label for a category, in plain words. */
export const FAVORITE_CATEGORY_LABELS: Record<FavoriteCategory, string> = {
	run: 'Run',
	strength: 'Strength',
	mobility: 'Mobility',
	recovery: 'Recovery',
};

/** One pick the picker can show: a curated recipe or a custom workout. */
export interface FavoriteWorkoutRef {
	id: string;
	title: string;
	category: FavoriteCategory;
	source: 'library' | 'custom';
	/** Minutes for a library recipe; a custom workout has no duration yet. */
	durationMin?: number;
	summary?: string;
	/** The body parts a library recipe trains. Empty for a run and for a custom workout. */
	bodyParts?: BodyPart[];
	/** The exercise still to show, when the workout resolves to one. */
	imagePath?: string;
}

/**
 * The category a library workout belongs to. Strength and mobility follow the
 * modality; a recovery-typed run such as a shakeout reads as recovery, and
 * every other run reads as a run.
 */
export function categoryForLibraryWorkout(
	w: Pick<LibraryWorkout, 'modality' | 'type'>,
): FavoriteCategory {
	if (w.modality === 'strength') return 'strength';
	if (w.modality === 'mobility') return 'mobility';
	if (w.type === 'recovery') return 'recovery';
	return 'run';
}

/** The category a custom workout belongs to; its own vocabulary names running "running". */
export function categoryForCustomWorkout(category: CustomWorkoutCategory): FavoriteCategory {
	return category === 'running' ? 'run' : category;
}

/**
 * The composer category a new workout opens in for the filter a runner is
 * browsing. The run filter maps back to the custom vocabulary, and All falls
 * back to the composer's own default, strength.
 */
export function composerCategoryForFilter(filter: FavoriteCategory | 'all'): CustomWorkoutCategory {
	if (filter === 'all') return 'strength';
	return filter === 'run' ? 'running' : filter;
}

/** Lowercase a name to the slug shape the exercise image manifest uses. */
export function slugifyExercise(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * The first image among the labels that has one, or undefined. Labels that name
 * a run step simply have no image, which is fine: the picker shows an image only
 * where the manifest carries one.
 */
export function imageForLabels(labels: readonly string[]): string | undefined {
	for (const label of labels) {
		const image = exerciseImage(slugifyExercise(label));
		if (image) return image.path;
	}
	return undefined;
}

/** The labels of a library workout's main work, which is where its moves live. */
function libraryWorkLabels(w: LibraryWorkout): string[] {
	const labels: string[] = [];
	for (const block of w.workout.blocks) {
		for (const step of block.steps) {
			if (step.kind === 'work') labels.push(step.label);
		}
	}
	return labels;
}

/** A library workout as a pick, with its category and its image when one exists. */
export function libraryRef(w: LibraryWorkout): FavoriteWorkoutRef {
	return {
		id: w.id,
		title: w.title,
		category: categoryForLibraryWorkout(w),
		source: 'library',
		durationMin: w.durationMin,
		summary: w.summary,
		bodyParts: bodyPartsForWorkout(w),
		imagePath: imageForLabels(libraryWorkLabels(w)),
	};
}

/** The curated recipes, as picks. These are the named sessions a runner asks for by name. */export function recipeRefs(): FavoriteWorkoutRef[] {
	return NAMED_WORKOUTS.map(libraryRef);
}

/** A custom workout as a pick, with the image of its first move or drill that has one. */
export function customRef(c: CustomWorkout): FavoriteWorkoutRef {
	const labels = [...c.sections.main.items, ...c.sections.warmup.items, ...c.sections.cooldown.items]
		.map((item) => (item.kind === 'run' ? '' : item.ref))
		.filter((ref) => ref.length > 0);
	return {
		id: c.id,
		title: c.name,
		category: categoryForCustomWorkout(c.category),
		source: 'custom',
		imagePath: imageForLabels(labels),
	};
}

/**
 * Resolve saved favourite ids back to picks, in the order they were saved. A
 * library id resolves against the whole library, so an older favourite that
 * names a generated workout still shows; a custom id resolves against the
 * runner's own workouts. An id that matches neither is left out of the strip.
 */
export function resolveFavoriteRefs(
	ids: readonly string[],
	custom: readonly CustomWorkout[],
): FavoriteWorkoutRef[] {
	const out: FavoriteWorkoutRef[] = [];
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) continue;
		const library = WORKOUT_LIBRARY.find((w) => w.id === id);
		if (library) {
			out.push(libraryRef(library));
			seen.add(id);
			continue;
		}
		const owned = custom.find((w) => w.id === id);
		if (owned) {
			out.push(customRef(owned));
			seen.add(id);
		}
	}
	return out;
}

/** True when a pick passes the category chip, the body-part chip and every search token. */
export function matchesFavorite(
	ref: FavoriteWorkoutRef,
	category: FavoriteCategory | 'all',
	tokens: readonly string[],
	bodyPart: BodyPart | 'all' = 'all',
): boolean {
	if (category !== 'all' && ref.category !== category) return false;
	if (!matchesBodyPart(ref.bodyParts, bodyPart)) return false;
	if (tokens.length === 0) return true;
	const hay = `${ref.title} ${ref.summary ?? ''} ${ref.category}`.toLowerCase();
	return tokens.every((token) => hay.includes(token));
}

/** The picks that pass the category chip, the body-part chip and the search. */
export function filterFavoriteRefs(
	refs: readonly FavoriteWorkoutRef[],
	category: FavoriteCategory | 'all',
	tokens: readonly string[],
	bodyPart: BodyPart | 'all' = 'all',
): FavoriteWorkoutRef[] {
	return refs.filter((ref) => matchesFavorite(ref, category, tokens, bodyPart));
}

/** The body parts present across a list of picks, in the chip order. */
export function bodyPartsInRefs(refs: readonly FavoriteWorkoutRef[]): BodyPart[] {
	const found = new Set<BodyPart>();
	for (const ref of refs) for (const part of ref.bodyParts ?? []) found.add(part);
	return BODY_PARTS.filter((part) => found.has(part));
}

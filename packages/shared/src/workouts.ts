/**
 * Runner-built custom workouts: the data shape a runner's own workout takes,
 * shared by the API validation, the plan engine and the web app.
 *
 * A custom workout has three fixed sections (warm-up, main work, cool-down) and
 * every section holds a list of items that each reference our own data: a
 * strength move from the move catalog, a drill or stretch from the mobility
 * libraries, or a run archetype. A free-text line is a note on the section, not
 * an item, so nothing unbuildable can end up in the guided player.
 */

import type { SessionArchetype } from './types';
import { findMove } from './plan/catalog';
import type { Drill } from './plan/mobility';
import {
	COOLDOWN_STRETCHES,
	EXTRA_STRETCHES,
	STRIDES,
	WARMUP_DRILLS,
} from './plan/mobility';
import { DYNAMIC_DRILLS, RECOVERY_DRILLS, STRETCHES } from './plan/stretches';

/** The category a custom workout belongs to, using the modality vocabulary. */
export const CUSTOM_WORKOUT_CATEGORIES = ['running', 'strength', 'mobility', 'recovery'] as const;
export type CustomWorkoutCategory = (typeof CUSTOM_WORKOUT_CATEGORIES)[number];

/** The three fixed sections, in the order a session runs them. */
export const CUSTOM_WORKOUT_SECTION_IDS = ['warmup', 'main', 'cooldown'] as const;
export type CustomWorkoutSectionId = (typeof CUSTOM_WORKOUT_SECTION_IDS)[number];

/** The section names a person reads. */
export const CUSTOM_WORKOUT_SECTION_LABELS: Record<CustomWorkoutSectionId, string> = {
	warmup: 'Warm-up',
	main: 'Main work',
	cooldown: 'Cool-down',
};

/** What an item can reference. */
export const CUSTOM_WORKOUT_ITEM_KINDS = ['strength', 'mobility', 'run'] as const;
export type CustomWorkoutItemKind = (typeof CUSTOM_WORKOUT_ITEM_KINDS)[number];

/**
 * The run archetypes a custom run workout can reference, drawn from
 * SessionArchetype. The non-running members (machine-circuit, full-body-strength,
 * mobility, cross-train) name other modalities and are left out.
 */
export const RUN_ARCHETYPES = [
	'easy',
	'recovery',
	'long',
	'tempo',
	'threshold',
	'interval',
	'race-pace',
	'strides',
	'hills',
	'fartlek',
	'race',
] as const satisfies readonly SessionArchetype[];
export type RunArchetype = (typeof RUN_ARCHETYPES)[number];

/** Every drill or stretch name across the warm-up, cool-down and mobility libraries. */
export const MOBILITY_DRILL_NAMES: ReadonlySet<string> = new Set(
	([...WARMUP_DRILLS, ...STRIDES, ...COOLDOWN_STRETCHES, ...EXTRA_STRETCHES, ...STRETCHES, ...DYNAMIC_DRILLS, ...RECOVERY_DRILLS] as Drill[]).map(
		(d) => d.name,
	),
);

/**
 * The bounds that keep a stored workout sane and its guided-player conversion
 * inside prescriptionSchema's 200-step block cap: one set becomes a work step
 * and, except for the last one, a rest step, so a section that holds at most 99
 * sets converts to at most 197 steps in its block.
 */
export const CUSTOM_WORKOUT_LIMITS = {
	/** Custom workouts one runner can keep. */
	maxWorkouts: 50,
	/** Characters in the workout name. */
	maxNameLen: 80,
	/** Characters in a catalog reference. */
	maxRefLen: 80,
	/** Characters in a section or item note. */
	maxNoteLen: 500,
	/** Items in one section. */
	maxItemsPerSection: 30,
	/** Sets summed across one section's items, so no converted block passes the cap. */
	maxSetsPerSection: 99,
} as const;

/** A strength item: a move from the catalog, by name, with its dose. */
export interface CustomStrengthItem {
	kind: 'strength';
	/** The move's name in the move catalog, as machines and favorites store it. */
	ref: string;
	sets?: number;
	reps?: number;
	/** For holds such as planks, seconds per set. */
	durationSec?: number;
	note?: string;
}

/** A mobility item: a drill or stretch from the mobility libraries, by name. */
export interface CustomMobilityItem {
	kind: 'mobility';
	/** The drill's name in the mobility and stretch libraries. */
	ref: string;
	/** Rounds of the hold, where a drill carries rounds. */
	sets?: number;
	/** Seconds per hold. */
	durationSec?: number;
	note?: string;
}

/** A run item: a run archetype, with its dose. */
export interface CustomRunItem {
	kind: 'run';
	/** One of RUN_ARCHETYPES, e.g. "easy" or "strides". */
	ref: string;
	/** Rounds, for repeated steps such as strides. */
	sets?: number;
	durationSec?: number;
	/** Kilometers, stored metric like every prescription. */
	distanceKm?: number;
	note?: string;
}

export type CustomWorkoutItem = CustomStrengthItem | CustomMobilityItem | CustomRunItem;

/** One section: a list of buildable items, plus the runner's free-text line. */
export interface CustomWorkoutSection {
	/** At least one item; a note alone is not a section. */
	items: CustomWorkoutItem[];
	/** The runner's free-text line for the section. Never an item. */
	note?: string;
}

export type CustomWorkoutSections = Record<CustomWorkoutSectionId, CustomWorkoutSection>;

/** A custom workout as the runner sends it, before the server gives it an id. */
export interface CustomWorkoutDraft {
	name: string;
	category: CustomWorkoutCategory;
	sections: CustomWorkoutSections;
}

/** A stored custom workout, kept on the runner's profile in settings.prefs. */
export interface CustomWorkout extends CustomWorkoutDraft {
	id: string;
	/** ISO timestamps, set by the server. */
	createdAt: string;
	updatedAt: string;
}

/** The item kinds each section accepts, by workout category. Main work matches the category; the warm-up and cool-down take drills or easy running. */
const MAIN_KINDS: Record<CustomWorkoutCategory, readonly CustomWorkoutItemKind[]> = {
	running: ['run'],
	strength: ['strength'],
	mobility: ['mobility'],
	recovery: ['mobility'],
};
const BOOKEND_KINDS: readonly CustomWorkoutItemKind[] = ['run', 'mobility'];

/**
 * The item kinds a section accepts, by workout category: main work matches the
 * category, and the warm-up and cool-down take drills or easy running. One
 * source, so the picker and the validator cannot disagree.
 */
export function sectionKinds(
	category: CustomWorkoutCategory,
	section: CustomWorkoutSectionId,
): readonly CustomWorkoutItemKind[] {
	return section === 'main' ? MAIN_KINDS[category] : BOOKEND_KINDS;
}

/** The dose fields each item kind must not carry; the supported sets are the rest. */
const FORBIDDEN_FIELDS: Record<CustomWorkoutItemKind, readonly string[]> = {
	strength: ['distanceKm'],
	mobility: ['reps', 'distanceKm'],
	run: ['reps'],
};

const KIND_NOUNS: Record<CustomWorkoutItemKind, string> = {
	strength: 'A strength move',
	mobility: 'A drill',
	run: 'A run step',
};

const FIELD_NAMES: Record<string, string> = {
	reps: 'reps',
	distanceKm: 'a distance',
};

/**
 * Everything wrong with a custom workout draft, as plain sentences for the
 * runner. An empty list means the draft is valid. Expects a schema-shaped
 * draft: the API validates the field bounds with zod before calling this.
 */
export function validateCustomWorkout(draft: CustomWorkoutDraft): string[] {
	const problems: string[] = [];
	if (!draft.name.trim()) problems.push('Give the workout a name.');
	for (const id of CUSTOM_WORKOUT_SECTION_IDS) {
		const section = draft.sections[id];
		const label = CUSTOM_WORKOUT_SECTION_LABELS[id];
		if (!section.items.length) {
			problems.push(`${label} needs at least one item; a note alone is not a section.`);
			continue;
		}
		if (section.items.length > CUSTOM_WORKOUT_LIMITS.maxItemsPerSection) {
			problems.push(`${label} holds ${section.items.length} items; keep it at ${CUSTOM_WORKOUT_LIMITS.maxItemsPerSection} or fewer.`);
		}
		const setSum = section.items.reduce((n, item) => n + (item.sets ?? 1), 0);
		if (setSum > CUSTOM_WORKOUT_LIMITS.maxSetsPerSection) {
			problems.push(
				`${label} holds ${setSum} sets; keep a section at ${CUSTOM_WORKOUT_LIMITS.maxSetsPerSection} or fewer so the guided player stays within its step limit.`,
			);
		}
		for (const item of section.items) {
			problems.push(...itemProblems(item, id, draft.category));
		}
	}
	return problems;
}

function itemProblems(
	item: CustomWorkoutItem,
	section: CustomWorkoutSectionId,
	category: CustomWorkoutCategory,
): string[] {
	const problems: string[] = [];
	const label = CUSTOM_WORKOUT_SECTION_LABELS[section];
	if (!CUSTOM_WORKOUT_ITEM_KINDS.includes(item.kind)) {
		problems.push(`"${item.kind}" is not an item type we know.`);
		return problems;
	}
	if (!sectionKinds(category, section).includes(item.kind)) {
		problems.push(
			section === 'main'
				? `${label} for a ${category} workout holds ${kindWords(category)}.`
				: `${label} holds drills or easy running, not strength moves.`,
		);
	}
	// A draft arrives as JSON, so a field the type leaves out can still be
	// present in the data. Read the values through a plain record and reject
	// the dose fields the item's kind does not support.
	const values = item as unknown as Record<string, unknown>;
	for (const field of FORBIDDEN_FIELDS[item.kind]) {
		if (values[field] != null) {
			problems.push(`${KIND_NOUNS[item.kind]} does not take ${FIELD_NAMES[field]}.`);
		}
	}
	switch (item.kind) {
		case 'strength':
			if (!findMove(item.ref)) problems.push(`"${item.ref}" is not a move in the catalog.`);
			break;
		case 'mobility':
			if (!MOBILITY_DRILL_NAMES.has(item.ref)) {
				problems.push(`"${item.ref}" is not a drill or stretch we know.`);
			}
			break;
		case 'run':
			if (!(RUN_ARCHETYPES as readonly string[]).includes(item.ref)) {
				problems.push(`"${item.ref}" is not a run type we know.`);
			}
			break;
	}
	return problems;
}

/** What a category's main work holds, in plain words for a validation message. */
function kindWords(category: CustomWorkoutCategory): string {
	switch (category) {
		case 'running':
			return 'run steps';
		case 'strength':
			return 'strength moves';
		case 'mobility':
		case 'recovery':
			return 'drills and stretches';
	}
}

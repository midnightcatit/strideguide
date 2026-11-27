/**
 * The pure half of the workout composer: the catalog the item picker draws on,
 * the draft edits a section makes, and the starting presets per category. Kept
 * free of any UI or I/O so the composer, the wiring screens and the tests share
 * one shape, and a saved workout always matches what the engine can run.
 */

import type {
	EquipmentItem,
	EquipmentPreference,
	SessionArchetype,
	StepBlock,
	StepKind,
	StructuredWorkout,
	WorkoutStep,
} from './types';
import {
	CUSTOM_WORKOUT_CATEGORIES,
	CUSTOM_WORKOUT_SECTION_IDS,
	RUN_ARCHETYPES,
	sectionKinds,
	type CustomMobilityItem,
	type CustomRunItem,
	type CustomStrengthItem,
	type CustomWorkoutCategory,
	type CustomWorkoutDraft,
	type CustomWorkoutItem,
	type CustomWorkoutSection,
	type CustomWorkoutSectionId,
	type RunArchetype,
} from './workouts';
import { ALL_MOVES, circuitFor, moveCategory, strengthShape } from './plan/catalog';
import type { MachineExercise } from './plan/machines';
import { exerciseImage } from './plan/exercise-images';
import { MUSCLE_GROUPS, muscleGroupFor, type MuscleGroup } from './plan/muscle-groups';
import {
	COOLDOWN_STRETCHES,
	EXTRA_STRETCHES,
	STRIDES,
	WARMUP_DRILLS,
	mobilityRoutine,
} from './plan/mobility';
import { DYNAMIC_DRILLS, RECOVERY_DRILLS, STRETCHES, findDrill } from './plan/stretches';
import type { Drill } from './plan/mobility';

/** Plain labels a person reads for each run archetype a custom run workout can hold. */
export const RUN_ARCHETYPE_LABELS: Record<RunArchetype, string> = {
	easy: 'Easy run',
	recovery: 'Recovery run',
	long: 'Long run',
	tempo: 'Tempo run',
	threshold: 'Threshold run',
	interval: 'Intervals',
	'race-pace': 'Goal-pace run',
	strides: 'Strides',
	hills: 'Hill reps',
	fartlek: 'Fartlek',
	race: 'Race',
};

/** The equipment filter values a strength picker offers, with their labels. */
export const EQUIPMENT_FILTERS: { value: EquipmentItem | 'bodyweight'; label: string }[] = [
	{ value: 'machines', label: 'Machines' },
	{ value: 'dumbbells', label: 'Dumbbells' },
	{ value: 'barbell', label: 'Barbell' },
	{ value: 'kettlebell', label: 'Kettlebell' },
	{ value: 'bands', label: 'Bands' },
	{ value: 'bodyweight', label: 'Bodyweight' },
];

/** One strength move the picker can add, with the labels and image it shows. */
export interface StrengthOption {
	kind: 'strength';
	/** The move's name in the catalog and in a saved workout's ref. */
	ref: string;
	label: string;
	muscleGroup: MuscleGroup;
	equipment: EquipmentItem | 'bodyweight';
	level?: 'beginner' | 'intermediate' | 'advanced';
	/** The still from the exercise manifest, when it has one. */
	image?: string;
}

/** One drill or stretch the picker can add. */
export interface MobilityOption {
	kind: 'mobility';
	ref: string;
	label: string;
	targets: string[];
	image?: string;
}

/** One run archetype the picker can add. */
export interface RunOption {
	kind: 'run';
	ref: RunArchetype;
	label: string;
}

export type CatalogOption = StrengthOption | MobilityOption | RunOption;

/**
 * The slug the exercise manifest keys on: lower case, runs of anything that is
 * not a letter or digit become a single hyphen, and the ends are trimmed. A
 * move name and its slug are the same fact, so this stays the one place that
 * turns a name into an image lookup.
 */
export function moveSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** The exercise still for a move or drill name, when the manifest has one. */
export function imageForName(name: string): string | undefined {
	return exerciseImage(moveSlug(name))?.path;
}

/** Every drill and stretch, in one list, for the mobility picker. */
function allDrills(): Drill[] {
	return [
		...WARMUP_DRILLS,
		...STRIDES,
		...COOLDOWN_STRETCHES,
		...EXTRA_STRETCHES,
		...STRETCHES,
		...DYNAMIC_DRILLS,
		...RECOVERY_DRILLS,
	];
}

/** Every catalog move once, with the group, equipment and image the picker shows. */
export function strengthOptions(): StrengthOption[] {
	const seen = new Set<string>();
	const out: StrengthOption[] = [];
	for (const m of ALL_MOVES) {
		if (seen.has(m.name)) continue;
		seen.add(m.name);
		out.push({
			kind: 'strength',
			ref: m.name,
			label: m.name,
			muscleGroup: muscleGroupFor(m),
			equipment: moveCategory(m),
			level: m.level,
			image: imageForName(m.name),
		});
	}
	return out;
}

/** Every drill and stretch once, with its targets and image. */
export function mobilityOptions(): MobilityOption[] {
	const seen = new Set<string>();
	const out: MobilityOption[] = [];
	for (const d of allDrills()) {
		if (seen.has(d.name)) continue;
		seen.add(d.name);
		out.push({
			kind: 'mobility',
			ref: d.name,
			label: d.name,
			targets: d.targets,
			image: imageForName(d.name),
		});
	}
	return out;
}

/** The run archetypes a run step can be, with plain labels. */
export function runOptions(): RunOption[] {
	return RUN_ARCHETYPES.map((ref) => ({ kind: 'run', ref, label: RUN_ARCHETYPE_LABELS[ref] }));
}

/** The options a given section accepts, by the category's item kinds. Run steps
 * come before the mobility library, so a warm-up or cool-down browse reaches
 * them without a search. */
export function catalogForSection(
	category: CustomWorkoutCategory,
	section: CustomWorkoutSectionId,
): CatalogOption[] {
	const kinds = sectionKinds(category, section);
	const out: CatalogOption[] = [];
	if (kinds.includes('run')) out.push(...runOptions());
	if (kinds.includes('mobility')) out.push(...mobilityOptions());
	if (kinds.includes('strength')) out.push(...strengthOptions());
	return out;
}

/** The filters the picker applies. `all` (or unset) means no filter for that axis. */
export interface CatalogFilter {
	query?: string;
	muscleGroup?: MuscleGroup | 'all';
	equipment?: EquipmentItem | 'bodyweight' | 'all';
	level?: 'beginner' | 'intermediate' | 'advanced' | 'all';
}

/** The text a search token is matched against, per option kind. */
function optionText(o: CatalogOption): string {
	if (o.kind === 'strength') return `${o.label} ${o.muscleGroup} ${o.equipment}`.toLowerCase();
	if (o.kind === 'mobility') return `${o.label} ${o.targets.join(' ')}`.toLowerCase();
	return o.label.toLowerCase();
}

/**
 * Narrow the options by a search query and, for strength moves, by muscle group,
 * equipment and level. A move with no level is not level-gated, so it passes any
 * level filter; the level filter only sorts the progression ladder.
 */
export function filterCatalog(options: CatalogOption[], filter: CatalogFilter): CatalogOption[] {
	const tokens = (filter.query ?? '')
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length > 0);
	return options.filter((o) => {
		if (tokens.length && !tokens.every((t) => optionText(o).includes(t))) return false;
		if (o.kind !== 'strength') return true;
		if (filter.muscleGroup && filter.muscleGroup !== 'all' && o.muscleGroup !== filter.muscleGroup)
			return false;
		if (filter.equipment && filter.equipment !== 'all' && o.equipment !== filter.equipment)
			return false;
		if (filter.level && filter.level !== 'all' && o.level && o.level !== filter.level) return false;
		return true;
	});
}

/** The muscle groups the picker offers in filter order. */
export function muscleGroupFilters(): MuscleGroup[] {
	return [...MUSCLE_GROUPS];
}

/** An empty draft: a base for the composer to fill from a preset. */
export function emptyDraft(category: CustomWorkoutCategory = 'strength'): CustomWorkoutDraft {
	return {
		name: '',
		category,
		sections: {
			warmup: { items: [] },
			main: { items: [] },
			cooldown: { items: [] },
		},
	};
}

function withSection(
	draft: CustomWorkoutDraft,
	section: CustomWorkoutSectionId,
	update: (s: CustomWorkoutSection) => CustomWorkoutSection,
): CustomWorkoutDraft {
	return { ...draft, sections: { ...draft.sections, [section]: update(draft.sections[section]) } };
}

/** A copy of the draft with one item added to the end of a section. */
export function addItem(
	draft: CustomWorkoutDraft,
	section: CustomWorkoutSectionId,
	item: CustomWorkoutItem,
): CustomWorkoutDraft {
	return withSection(draft, section, (s) => ({ ...s, items: [...s.items, item] }));
}

/** A copy of the draft with the item at `index` removed from a section. */
export function removeItem(
	draft: CustomWorkoutDraft,
	section: CustomWorkoutSectionId,
	index: number,
): CustomWorkoutDraft {
	return withSection(draft, section, (s) => ({
		...s,
		items: s.items.filter((_, i) => i !== index),
	}));
}

/**
 * A copy of the draft with an item moved from one position to another inside a
 * section. An out-of-range move is a no-op, so a button at either end is safe.
 */
export function moveItem(
	draft: CustomWorkoutDraft,
	section: CustomWorkoutSectionId,
	from: number,
	to: number,
): CustomWorkoutDraft {
	return withSection(draft, section, (s) => {
		if (!Number.isInteger(from) || !Number.isInteger(to)) return s;
		if (from === to || from < 0 || to < 0 || from >= s.items.length || to >= s.items.length)
			return s;
		const items = [...s.items];
		const [moved] = items.splice(from, 1);
		items.splice(to, 0, moved!);
		return { ...s, items };
	});
}

/** A copy of the draft with an item shifted by `delta` places (an up or down button). */
export function shiftItem(
	draft: CustomWorkoutDraft,
	section: CustomWorkoutSectionId,
	index: number,
	delta: number,
): CustomWorkoutDraft {
	return moveItem(draft, section, index, index + delta);
}

/** A copy of the draft with the runner's free-text line for a section set. */
export function setSectionNote(
	draft: CustomWorkoutDraft,
	section: CustomWorkoutSectionId,
	note: string,
): CustomWorkoutDraft {
	return withSection(draft, section, (s) => ({ ...s, note }));
}

/** A copy of the draft with a new name. */
export function setDraftName(draft: CustomWorkoutDraft, name: string): CustomWorkoutDraft {
	return { ...draft, name };
}

/**
 * A copy of the draft in another category. The caller rebuilds the sections
 * from the category's preset, since main-work items of the old kind no longer
 * fit; this only swaps the category itself.
 */
export function setDraftCategory(
	draft: CustomWorkoutDraft,
	category: CustomWorkoutCategory,
): CustomWorkoutDraft {
	return { ...draft, category };
}

/** A mobility item for a drill, carrying its hold length and its rounds. */
function drillItem(name: string): CustomMobilityItem {
	const drill = findDrill(name);
	const item: CustomMobilityItem = { kind: 'mobility', ref: name };
	if (drill?.durationSec) item.durationSec = drill.durationSec;
	if (drill?.rounds && drill.rounds > 1) item.sets = drill.rounds;
	return item;
}

/** A run item for an archetype, with an optional length. */
function runItem(ref: RunArchetype, durationSec?: number): CustomRunItem {
	const item: CustomRunItem = { kind: 'run', ref };
	if (durationSec) item.durationSec = durationSec;
	return item;
}

/** A strength item for a catalog move, at the preset dose. */
function strengthItem(move: MachineExercise): CustomStrengthItem {
	return { kind: 'strength', ref: move.name, sets: 3, reps: 10 };
}

/**
 * The default item the picker adds for an option, before the runner adjusts it.
 * A strength move lands at three sets of ten; a drill keeps its library hold and
 * rounds; a run step starts with no dose for the runner to set.
 */
export function defaultItemFor(option: CatalogOption): CustomWorkoutItem {
	switch (option.kind) {
		case 'strength':
			return { kind: 'strength', ref: option.ref, sets: 3, reps: 10 };
		case 'mobility':
			return drillItem(option.ref);
		case 'run':
			return runItem(option.ref);
	}
}

/**
 * The runner's context the composer reads to size a preset. `sessionMinutes`
 * sizes the strength circuit; `equipment` and the kit lists narrow which moves
 * it can pick, the way the plan engine already does.
 */
export interface ComposerContext {
	sessionMinutes?: number;
	equipment?: EquipmentPreference;
	equipmentItems?: string[];
	level?: string;
	machines?: string[];
	favoriteMachines?: string[];
	/** True once the runner is past base, so the mobility preset adds the extra holds. */
	building?: boolean;
}

/** The warming-up drills a strength preset opens with. */
function strengthWarmup(): CustomWorkoutItem[] {
	return WARMUP_DRILLS.slice(0, 3).map((d) => drillItem(d.name));
}

/** The circuit a strength preset's main work holds, sized to the session. */
function strengthMain(context: ComposerContext): CustomWorkoutItem[] {
	const circuit = circuitFor(
		context.equipment ?? 'machines',
		context.sessionMinutes,
		context.equipmentItems,
		context.building ?? false,
		context.level,
		context.machines,
		context.favoriteMachines,
	);
	return circuit.map(strengthItem);
}

/** The cool-down stretches a bookended preset closes with. */
function cooldownStretches(count = COOLDOWN_STRETCHES.length): CustomWorkoutItem[] {
	return COOLDOWN_STRETCHES.slice(0, count).map((d) => drillItem(d.name));
}

/** The mobility preset's loosen-up, the same dynamic pair the engine uses. */
function mobilityWarmup(building: boolean): CustomWorkoutItem[] {
	return mobilityRoutine(building)
		.slice(0, 2)
		.map((d) => drillItem(d.name));
}

/** The mobility preset's static holds, the part of the routine that stays put. */
function mobilityMain(building: boolean): CustomWorkoutItem[] {
	return mobilityRoutine(building)
		.slice(2)
		.map((d) => drillItem(d.name));
}

/**
 * The items a section starts with for a category, before the runner changes
 * anything. A preset is a starting point: every item can be removed or added to.
 */
export function presetSectionItems(
	category: CustomWorkoutCategory,
	section: CustomWorkoutSectionId,
	context: ComposerContext = {},
): CustomWorkoutItem[] {
	const building = context.building ?? false;
	if (category === 'strength') {
		if (section === 'warmup') return strengthWarmup();
		if (section === 'main') return strengthMain(context);
		return cooldownStretches();
	}
	if (category === 'mobility') {
		if (section === 'warmup') return mobilityWarmup(building);
		if (section === 'main') return mobilityMain(building);
		return [drillItem('Diaphragmatic breathing')];
	}
	if (category === 'recovery') {
		if (section === 'warmup') return [drillItem('Hip circles'), drillItem('Cat-cow')];
		if (section === 'main') return RECOVERY_DRILLS.slice(0, 4).map((d) => drillItem(d.name));
		return [drillItem("Child's pose"), drillItem('Diaphragmatic breathing')];
	}
	// running
	if (section === 'warmup') return [drillItem(WARMUP_DRILLS[0]!.name)];
	if (section === 'main') {
		const minutes = context.sessionMinutes ?? 45;
		return [runItem('easy', Math.round((minutes * 60 * 0.7) / 60) * 60)];
	}
	return cooldownStretches(2);
}

/** The name a new preset opens with, honest about what a strength circuit holds. */
export function presetName(
	category: CustomWorkoutCategory,
	mainItems: CustomWorkoutItem[],
): string {
	if (category === 'strength') {
		const moves = mainItems
			.filter((i): i is CustomStrengthItem => i.kind === 'strength')
			.map((i) => ALL_MOVES.find((m) => m.name === i.ref))
			.filter((m): m is MachineExercise => Boolean(m));
		return strengthShape(moves) === 'machines' ? 'Machine circuit' : 'Strength circuit';
	}
	if (category === 'mobility') return 'Mobility routine';
	if (category === 'recovery') return 'Recovery routine';
	return 'Easy run';
}

/** A draft for a category, filled from its preset and sized to the context. */
export function presetDraft(
	category: CustomWorkoutCategory,
	context: ComposerContext = {},
): CustomWorkoutDraft {
	const main = presetSectionItems(category, 'main', context);
	return {
		name: presetName(category, main),
		category,
		sections: {
			warmup: { items: presetSectionItems(category, 'warmup', context) },
			main: { items: main },
			cooldown: { items: presetSectionItems(category, 'cooldown', context) },
		},
	};
}

/** True when a value is one of the categories the composer can build. */
export function isCustomWorkoutCategory(value: string): value is CustomWorkoutCategory {
	return (CUSTOM_WORKOUT_CATEGORIES as readonly string[]).includes(value);
}

function withoutNote<T extends CustomWorkoutItem>(item: T): T {
	const copy = { ...item };
	delete (copy as { note?: string }).note;
	return copy;
}

function cleanItem(item: CustomWorkoutItem): CustomWorkoutItem {
	const note = item.note?.trim();
	return note ? { ...item, note } : withoutNote(item);
}

/**
 * A copy of the draft ready to send: the name and every note trimmed, and empty
 * notes dropped so the stored workout carries only what the runner wrote.
 */
export function cleanDraft(draft: CustomWorkoutDraft): CustomWorkoutDraft {
	const cleanSection = (s: CustomWorkoutSection): CustomWorkoutSection => {
		const note = s.note?.trim();
		return {
			items: s.items.map(cleanItem),
			...(note ? { note } : {}),
		};
	};
	return {
		name: draft.name.trim(),
		category: draft.category,
		sections: {
			warmup: cleanSection(draft.sections.warmup),
			main: cleanSection(draft.sections.main),
			cooldown: cleanSection(draft.sections.cooldown),
		},
	};
}

/** The rest a runner-built strength circuit takes between sets, in seconds. The
 * player's withRestCards turns a work step's sets into explicit rest cards from
 * this, so a composed circuit runs like the engine's own strength sessions. */
export const CUSTOM_STRENGTH_REST_SEC = 75;

/** A run step's plain label from its archetype. */
function runLabel(ref: string): string {
	return RUN_ARCHETYPE_LABELS[ref as RunArchetype] ?? ref;
}

/**
 * The guided steps for one bookend (warm-up or cool-down) item. A drill with
 * rounds becomes one step per round, the way the engine's drill blocks build,
 * since the player only expands a work step's own sets.
 */
function bookendSteps(item: CustomWorkoutItem, kind: StepKind): WorkoutStep[] {
	if (item.kind === 'run') {
		const rounds = item.sets && item.sets > 1 ? item.sets : 1;
		return Array.from({ length: rounds }, () => ({
			kind,
			label: runLabel(item.ref),
			...(item.distanceKm ? { distanceM: Math.round(item.distanceKm * 1000) } : {}),
			...(item.durationSec ? { durationSec: item.durationSec } : {}),
			...(item.note ? { note: item.note } : {}),
		}));
	}
	const drill = item.kind === 'mobility' ? findDrill(item.ref) : undefined;
	const durationSec = item.kind === 'mobility' ? item.durationSec ?? drill?.durationSec : undefined;
	const rounds = item.sets && item.sets > 1 ? item.sets : 1;
	return Array.from({ length: rounds }, () => ({
		kind,
		label: item.ref,
		...(durationSec ? { durationSec } : {}),
		targetRpe: kind === 'warmup' ? ([2, 3] as [number, number]) : ([1, 2] as [number, number]),
		...(item.note ? { note: item.note } : {}),
	}));
}

/**
 * The guided steps for one main-work item. A strength move keeps its sets and
 * reps and takes a rest between sets, so the player expands it into a rest card
 * after each set. A mobility hold or a run step keeps its rounds as sets, which
 * the player expands without a rest card.
 */
function mainSteps(item: CustomWorkoutItem): WorkoutStep[] {
	const rounds = item.sets && item.sets > 1 ? item.sets : undefined;
	if (item.kind === 'strength') {
		const step: WorkoutStep = {
			kind: 'work',
			label: item.ref,
			machine: item.ref,
			targetRpe: [7, 8],
			...(item.reps ? { reps: item.reps } : {}),
			...(item.durationSec ? { durationSec: item.durationSec } : {}),
			...(item.note ? { note: item.note } : {}),
		};
		if (rounds) {
			step.sets = rounds;
			step.restSec = CUSTOM_STRENGTH_REST_SEC;
		}
		return [step];
	}
	if (item.kind === 'mobility') {
		const durationSec = item.durationSec ?? findDrill(item.ref)?.durationSec;
		return [
			{
				kind: 'work',
				label: item.ref,
				...(durationSec ? { durationSec } : {}),
				targetRpe: [1, 2],
				...(rounds ? { sets: rounds } : {}),
				...(item.note ? { note: item.note } : {}),
			},
		];
	}
	return [
		{
			kind: 'work',
			label: runLabel(item.ref),
			targetRpe: [4, 6],
			...(item.distanceKm ? { distanceM: Math.round(item.distanceKm * 1000) } : {}),
			...(item.durationSec ? { durationSec: item.durationSec } : {}),
			...(rounds ? { sets: rounds } : {}),
			...(item.note ? { note: item.note } : {}),
		},
	];
}

/** The seconds one step takes, work plus the rest between its own sets. */
function stepSeconds(step: WorkoutStep): number {
	const sets = step.sets && step.sets > 1 ? step.sets : 1;
	const work = step.durationSec ?? (step.reps ? step.reps * 4 + 10 : 0);
	const rest = step.restSec && sets > 1 ? (sets - 1) * step.restSec : 0;
	return sets * work + rest;
}

/**
 * Turn a runner-built workout into the guided sequence the player runs: a
 * warm-up block, the main work, then a cool-down, each drawn from the section's
 * own items. This is the piece that lets a composed workout become a session,
 * since a stored custom workout is sections of items, not steps. Pure, so the
 * API and the onboarding preview build the same workout the same way.
 */
export function customWorkoutToStructured(custom: CustomWorkoutDraft): StructuredWorkout {
	const blocks: StepBlock[] = [];
	const warmup = custom.sections.warmup.items.flatMap((i) => bookendSteps(i, 'warmup'));
	if (warmup.length) blocks.push({ repeat: 1, label: 'Warm-up', steps: warmup });
	const main = custom.sections.main.items.flatMap(mainSteps);
	if (main.length) blocks.push({ repeat: 1, label: 'Main work', steps: main });
	const cooldown = custom.sections.cooldown.items.flatMap((i) => bookendSteps(i, 'cooldown'));
	if (cooldown.length) blocks.push({ repeat: 1, label: 'Cool-down', steps: cooldown });
	const totalSec = blocks.reduce(
		(sum, b) => sum + b.steps.reduce((s, step) => s + stepSeconds(step), 0),
		0,
	);
	return { blocks, estimatedDurationMin: Math.max(1, Math.round(totalSec / 60)) };
}

/**
 * The session archetype a custom workout carries, from its category and main
 * work: a run names its own kind, the rest name their modality.
 */
export function customWorkoutArchetype(custom: CustomWorkoutDraft): SessionArchetype {
	if (custom.category === 'running') {
		const run = custom.sections.main.items.find((i) => i.kind === 'run');
		if (run && (RUN_ARCHETYPES as readonly string[]).includes(run.ref)) {
			return run.ref as SessionArchetype;
		}
		return 'easy';
	}
	if (custom.category === 'strength') return 'machine-circuit';
	if (custom.category === 'mobility') return 'mobility';
	return 'recovery';
}

/** The runner's section notes in one line, or undefined when there are none. */
export function customWorkoutNotes(custom: CustomWorkoutDraft): string | undefined {
	const parts = CUSTOM_WORKOUT_SECTION_IDS.map((id) => custom.sections[id].note?.trim()).filter(
		(n): n is string => Boolean(n),
	);
	return parts.length ? parts.join('\n') : undefined;
}

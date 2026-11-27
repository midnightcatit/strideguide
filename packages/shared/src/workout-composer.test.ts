import { describe, expect, it } from 'vitest';
import {
	CUSTOM_WORKOUT_CATEGORIES,
	sectionKinds,
	validateCustomWorkout,
	type CustomWorkoutDraft,
	type CustomWorkoutItem,
} from './workouts';
import { circuitSize } from './plan/catalog';
import { withRestCards } from './plan/rest';
import {
	addItem,
	catalogForSection,
	cleanDraft,
	CUSTOM_STRENGTH_REST_SEC,
	customWorkoutArchetype,
	customWorkoutNotes,
	customWorkoutToStructured,
	defaultItemFor,
	filterCatalog,
	imageForName,
	moveItem,
	moveSlug,
	presetDraft,
	removeItem,
	shiftItem,
	strengthOptions,
} from './workout-composer';

const SESSION_LENGTHS = [20, 45, 90];

describe('workout composer helpers', () => {
	it('turns a move name into the manifest slug and finds its image', () => {
		expect(moveSlug('Leg press')).toBe('leg-press');
		expect(moveSlug("Child's pose")).toBe('child-s-pose');
		expect(imageForName('Leg press')).toBe('/exercises/glutes/leg-press.webp');
		// A move the harvest has no still for returns undefined, so the picker
		// falls back to a plain row rather than a broken image.
		expect(imageForName('Leg curl')).toBeUndefined();
	});

	it('builds a valid preset for every category and session length', () => {
		for (const category of CUSTOM_WORKOUT_CATEGORIES) {
			for (const sessionMinutes of SESSION_LENGTHS) {
				const draft = presetDraft(category, {
					sessionMinutes,
					equipment: 'machines',
					level: 'intermediate',
				});
				expect(validateCustomWorkout(draft), `${category} ${sessionMinutes}`).toEqual([]);
			}
		}
	});

	it('sizes the strength circuit to the session length', () => {
		for (const sessionMinutes of SESSION_LENGTHS) {
			const draft = presetDraft('strength', { sessionMinutes });
			expect(draft.sections.main.items.length).toBe(circuitSize(sessionMinutes));
		}
	});

	it('holds main work to the section kinds, so the picker cannot offer a move for a warm-up', () => {
		expect(sectionKinds('strength', 'main')).toEqual(['strength']);
		expect(sectionKinds('strength', 'warmup')).toEqual(['run', 'mobility']);
		const main = catalogForSection('strength', 'main');
		expect(main.every((o) => o.kind === 'strength')).toBe(true);
		const warmup = catalogForSection('strength', 'warmup');
		expect(warmup.some((o) => o.kind === 'strength')).toBe(false);
		expect(warmup.some((o) => o.kind === 'mobility')).toBe(true);
	});

	it('filters the catalog by muscle group, equipment, level and search', () => {
		const moves = strengthOptions();
		const chest = filterCatalog(moves, { muscleGroup: 'Chest' });
		expect(chest.length).toBeGreaterThan(0);
		expect(chest.every((o) => o.kind === 'strength' && o.muscleGroup === 'Chest')).toBe(true);

		const machines = filterCatalog(moves, { equipment: 'machines' });
		expect(machines.length).toBeGreaterThan(0);
		expect(machines.every((o) => o.kind === 'strength' && o.equipment === 'machines')).toBe(true);

		// A move with no level is not level-gated, so it survives the level filter,
		// and an advanced move still passes it; only beginner-gated moves drop.
		const advanced = filterCatalog(moves, { level: 'advanced' });
		expect(advanced.some((o) => o.kind === 'strength' && o.level === 'advanced')).toBe(true);
		expect(advanced.some((o) => o.kind === 'strength' && o.level === undefined)).toBe(true);
		expect(advanced.some((o) => o.kind === 'strength' && o.level === 'beginner')).toBe(false);

		const searched = filterCatalog(moves, { query: 'leg press' });
		expect(searched.some((o) => o.ref === 'Leg press')).toBe(true);
		expect(filterCatalog(moves, { query: 'no-such-move' })).toEqual([]);
	});

	it('adds, removes, moves and shifts items without touching the draft it was given', () => {
		const base = presetDraft('strength', { sessionMinutes: 45 });
		const originalMain = base.sections.main.items.slice();

		const item: CustomWorkoutItem = { kind: 'strength', ref: 'Leg press', sets: 3, reps: 10 };
		const added = addItem(base, 'main', item);
		expect(added.sections.main.items.length).toBe(originalMain.length + 1);
		expect(base.sections.main.items).toEqual(originalMain);

		const removed = removeItem(added, 'main', 0);
		expect(removed.sections.main.items.length).toBe(originalMain.length);
		expect(removed.sections.main.items[0]).toEqual(originalMain[1]);

		const three: CustomWorkoutDraft = {
			...base,
			sections: {
				...base.sections,
				main: {
					items: [
						{ kind: 'strength', ref: 'Leg press' },
						{ kind: 'strength', ref: 'Leg curl' },
						{ kind: 'strength', ref: 'Leg extension' },
					],
				},
			},
		};
		expect(moveItem(three, 'main', 0, 2).sections.main.items.map((i) => i.ref)).toEqual([
			'Leg curl',
			'Leg extension',
			'Leg press',
		]);
		expect(shiftItem(three, 'main', 0, 1).sections.main.items.map((i) => i.ref)).toEqual([
			'Leg curl',
			'Leg press',
			'Leg extension',
		]);
		// A shift off either end is a no-op, so a button at the end is safe.
		expect(shiftItem(three, 'main', 0, -1).sections.main.items.map((i) => i.ref)).toEqual([
			'Leg press',
			'Leg curl',
			'Leg extension',
		]);
		// A non-integer position is rejected, so NaN cannot be read by splice as
		// position zero and quietly move an item.
		expect(moveItem(three, 'main', Number.NaN, 1).sections.main.items.map((i) => i.ref)).toEqual([
			'Leg press',
			'Leg curl',
			'Leg extension',
		]);
		expect(moveItem(three, 'main', 1.5, 2).sections.main.items.map((i) => i.ref)).toEqual([
			'Leg press',
			'Leg curl',
			'Leg extension',
		]);
	});

	it('gives a picked drill its library hold and rounds', () => {
		const option = {
			kind: 'mobility' as const,
			ref: 'Glute stretch',
			label: 'Glute stretch',
			targets: ['glutes'],
		};
		const item = defaultItemFor(option);
		expect(item.kind).toBe('mobility');
		if (item.kind !== 'mobility') throw new Error('expected a mobility item');
		expect(item.durationSec).toBe(45);
		expect(item.sets).toBe(2);
	});

	it('trims the name and notes and drops empty ones before saving', () => {
		const draft = presetDraft('strength', { sessionMinutes: 45 });
		draft.name = '  Leg day  ';
		draft.sections.main.note = '   ';
		draft.sections.main.items[0] = { ...draft.sections.main.items[0]!, note: '  go slow  ' };
		const cleaned = cleanDraft(draft);
		expect(cleaned.name).toBe('Leg day');
		expect(cleaned.sections.main.note).toBeUndefined();
		expect(cleaned.sections.main.items[0]!.note).toBe('go slow');
	});
});

describe('custom workout to guided steps', () => {
	it('lays a composed strength workout out as warm-up, main work and cool-down', () => {
		const draft: CustomWorkoutDraft = {
			name: 'Leg day',
			category: 'strength',
			sections: {
				warmup: { items: [{ kind: 'mobility', ref: 'Hip circles' }] },
				main: { items: [{ kind: 'strength', ref: 'Leg press', sets: 3, reps: 10 }] },
				cooldown: { items: [{ kind: 'mobility', ref: "Child's pose" }] },
			},
		};
		const workout = customWorkoutToStructured(draft);
		expect(workout.blocks.map((b) => b.label)).toEqual(['Warm-up', 'Main work', 'Cool-down']);
		expect(workout.blocks[0]!.steps[0]).toMatchObject({ kind: 'warmup', label: 'Hip circles' });
		expect(workout.blocks[2]!.steps[0]).toMatchObject({ kind: 'cooldown', label: "Child's pose" });

		// A strength move keeps its sets and takes a rest between them, so the
		// player expands it into a rest card after each set.
		expect(workout.blocks[1]!.steps).toHaveLength(1);
		expect(workout.blocks[1]!.steps[0]).toMatchObject({
			kind: 'work',
			machine: 'Leg press',
			sets: 3,
			reps: 10,
			restSec: CUSTOM_STRENGTH_REST_SEC,
		});

		const withRests = withRestCards(workout)!;
		const main = withRests.blocks[1]!.steps;
		expect(main.filter((s) => s.kind === 'work')).toHaveLength(3);
		expect(main.filter((s) => s.kind === 'rest')).toHaveLength(2);
	});

	it('keeps a mobility hold as rounds without adding a rest card', () => {
		const draft: CustomWorkoutDraft = {
			name: 'Mobility routine',
			category: 'mobility',
			sections: {
				warmup: { items: [{ kind: 'mobility', ref: 'Hip circles' }] },
				main: { items: [{ kind: 'mobility', ref: 'Glute stretch', durationSec: 45, sets: 2 }] },
				cooldown: { items: [{ kind: 'mobility', ref: "Child's pose" }] },
			},
		};
		const workout = customWorkoutToStructured(draft);
		expect(workout.blocks[1]!.steps[0]).toMatchObject({ kind: 'work', sets: 2, durationSec: 45 });
		expect(workout.blocks[1]!.steps[0]!.restSec).toBeUndefined();

		const withRests = withRestCards(workout)!;
		const main = withRests.blocks[1]!.steps;
		expect(main.filter((s) => s.kind === 'rest')).toHaveLength(0);
		expect(main.filter((s) => s.kind === 'work')).toHaveLength(2);
	});

	it('maps a custom workout to a session archetype from its category and main run', () => {
		const run: CustomWorkoutDraft = {
			name: 'Tempo run',
			category: 'running',
			sections: {
				warmup: { items: [{ kind: 'mobility', ref: 'Hip circles' }] },
				main: { items: [{ kind: 'run', ref: 'tempo', durationSec: 1800 }] },
				cooldown: { items: [{ kind: 'run', ref: 'easy' }] },
			},
		};
		expect(customWorkoutArchetype(run)).toBe('tempo');
		expect(customWorkoutToStructured(run).blocks[1]!.steps[0]).toMatchObject({
			kind: 'work',
			label: 'Tempo run',
			durationSec: 1800,
		});
		expect(customWorkoutArchetype(presetDraft('strength'))).toBe('machine-circuit');
		expect(customWorkoutArchetype(presetDraft('mobility'))).toBe('mobility');
		expect(customWorkoutArchetype(presetDraft('recovery'))).toBe('recovery');
	});

	it('joins the runner section notes, dropping empty ones', () => {
		const draft = presetDraft('strength', { sessionMinutes: 45 });
		expect(customWorkoutNotes(draft)).toBeUndefined();
		draft.sections.main.note = '  go slow  ';
		draft.sections.warmup.note = '   ';
		draft.sections.cooldown.note = 'Breathe out.';
		expect(customWorkoutNotes(draft)).toBe('go slow\nBreathe out.');
	});
});

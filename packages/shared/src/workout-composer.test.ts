import { describe, expect, it } from 'vitest';
import {
	CUSTOM_WORKOUT_CATEGORIES,
	sectionKinds,
	validateCustomWorkout,
	type CustomWorkoutDraft,
	type CustomWorkoutItem,
} from './workouts';
import { circuitSize } from './plan/catalog';
import {
	addItem,
	catalogForSection,
	cleanDraft,
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

		// A move with no level is not level-gated, so it survives the level filter.
		const advanced = filterCatalog(moves, { level: 'advanced' });
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

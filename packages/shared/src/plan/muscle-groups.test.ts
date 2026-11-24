import { describe, expect, it } from 'vitest';
import { PF_MACHINES, type MachineExercise } from './machines';
import { MUSCLE_GROUPS, groupByMuscleGroup, muscleGroupFor, type MuscleGroup } from './muscle-groups';

function groupOf(name: string): MuscleGroup {
	const move = PF_MACHINES.find((m) => m.name === name);
	expect(move, `missing machine: ${name}`).toBeTruthy();
	return muscleGroupFor(move!);
}

describe('muscleGroupFor', () => {
	// Every machine the picker shows, with the group a runner would look under.
	const placements: [string, MuscleGroup][] = [
		['Back extension', 'Back'],
		['Back extension / reverse hyper', 'Back'],
		['Rear delt / lateral raise machine', 'Shoulders'],
		['Rowing machine', 'Cardio'],
		['Hip abduction machine', 'Glutes'],
		['Hip adduction machine', 'Legs'],
		['Seated calf raise', 'Legs'],
		['Standing calf raise', 'Legs'],
		['Leg press', 'Legs'],
		['Leg press (single-leg variation)', 'Legs'],
		['Hack squat', 'Legs'],
		['Pendulum squat', 'Legs'],
		['Smith machine squat', 'Legs'],
		['Leg extension', 'Legs'],
		['Leg curl', 'Legs'],
		['Lying leg curl', 'Legs'],
		['Seated leg curl', 'Legs'],
		['Cable pull-through', 'Glutes'],
		['Hip thrust / glute drive machine', 'Glutes'],
		['Glute kickback machine', 'Glutes'],
		['Cable woodchop / Pallof press', 'Core'],
		['Ab crunch machine', 'Core'],
		['Rotary torso machine', 'Core'],
		['Farmer / trap-bar carry', 'Core'],
		["Captain's chair leg raise", 'Core'],
		['Chest press / pec deck (cable fly)', 'Chest'],
		['Lat pulldown', 'Back'],
		['Seated row', 'Back'],
		['Seated cable row', 'Back'],
		['Assisted pull-up / dip', 'Back'],
		['Shoulder press', 'Shoulders'],
		['Bicep curl', 'Arms'],
		['Tricep extension', 'Arms'],
	];

	it.each(placements)('places %s under %s', (name, group) => {
		expect(groupOf(name)).toBe(group);
	});

	it('falls back to Other when no muscle maps, so a move is never dropped', () => {
		const unknown: MachineExercise = {
			name: 'Mystery machine',
			muscles: ['mystery muscle', 'another unknown'],
			pattern: 'push',
			why: 'test',
			feel: 'test',
			form: [],
			mistakes: [],
		};
		expect(muscleGroupFor(unknown)).toBe('Other');
	});

	it('falls back to Other for a move with no muscles at all', () => {
		const empty: MachineExercise = {
			name: 'Empty machine',
			muscles: [],
			pattern: 'pull',
			why: 'test',
			feel: 'test',
			form: [],
			mistakes: [],
		};
		expect(muscleGroupFor(empty)).toBe('Other');
	});

	it('skips an unmapped lead muscle and uses the first muscle that maps', () => {
		// Grip is not in the map, so the carry classifies by its trunk work.
		expect(groupOf('Farmer / trap-bar carry')).toBe('Core');
	});
});

describe('groupByMuscleGroup', () => {
	it('keeps every machine once and orders the groups as the picker shows them', () => {
		const groups = groupByMuscleGroup(PF_MACHINES);
		const names = groups.flatMap((g) => g.moves.map((m) => m.name));
		expect(names.length).toBe(PF_MACHINES.length);
		expect(new Set(names).size).toBe(PF_MACHINES.length);

		const order = groups.map((g) => MUSCLE_GROUPS.indexOf(g.group));
		expect(order).toEqual([...order].sort((a, b) => a - b));
		expect(groups.every((g) => g.moves.length > 0)).toBe(true);
	});

	it('puts the rower in its own Cardio group', () => {
		const groups = groupByMuscleGroup(PF_MACHINES);
		const cardio = groups.find((g) => g.group === 'Cardio');
		expect(cardio?.moves.map((m) => m.name)).toEqual(['Rowing machine']);
	});
});

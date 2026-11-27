/**
 * Muscle to group mapping for the favorite machine picker. The picker used to
 * group machines by movement pattern, which put lower-back moves under Legs and
 * a lateral raise under Pull, and dropped anything the pattern map had no key
 * for. Grouping by the first muscle that maps to a group keeps the labels
 * honest, and the Other fallback means a machine is never hidden.
 *
 * Adding a muscle or a group is a data change: extend the map or the group list.
 */

import type { MachineExercise } from './machines';

/** The groups a machine can land in, in the order the picker shows them. */
export const MUSCLE_GROUPS = [
	'Chest',
	'Back',
	'Shoulders',
	'Arms',
	'Legs',
	'Glutes',
	'Core',
	'Cardio',
	'Other',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/**
 * Muscle name to group. A muscle that is not listed is skipped when grouping a
 * move, so a first-listed accessory muscle (grip, upper traps) does not drag a
 * whole-body move into the wrong group. If no muscle maps, the move falls back
 * to Other.
 */
export const MUSCLE_GROUP: Record<string, MuscleGroup> = {
	// Chest
	'pectoralis major': 'Chest',
	pectoralis: 'Chest',
	pectorals: 'Chest',
	chest: 'Chest',
	// Back
	'latissimus dorsi': 'Back',
	lats: 'Back',
	rhomboids: 'Back',
	'mid-back': 'Back',
	'middle trapezius': 'Back',
	'lower trapezius': 'Back',
	'upper back': 'Back',
	'erector spinae': 'Back',
	'spinal erectors': 'Back',
	// Shoulders
	shoulders: 'Shoulders',
	deltoids: 'Shoulders',
	'anterior deltoid': 'Shoulders',
	'posterior deltoid': 'Shoulders',
	'lateral deltoid': 'Shoulders',
	'rear deltoids': 'Shoulders',
	'front shoulders': 'Shoulders',
	// Arms
	biceps: 'Arms',
	'biceps brachii': 'Arms',
	triceps: 'Arms',
	'triceps brachii': 'Arms',
	forearms: 'Arms',
	grip: 'Arms',
	// Legs
	quadriceps: 'Legs',
	'rectus femoris': 'Legs',
	hamstrings: 'Legs',
	'biceps femoris': 'Legs',
	'adductor magnus': 'Legs',
	'adductor longus': 'Legs',
	'adductor brevis': 'Legs',
	adductors: 'Legs',
	gracilis: 'Legs',
	'hip adductors': 'Legs',
	gastrocnemius: 'Legs',
	soleus: 'Legs',
	calves: 'Legs',
	'hip flexors': 'Legs',
	iliopsoas: 'Legs',
	'tibialis anterior': 'Legs',
	shins: 'Legs',
	peroneals: 'Legs',
	'foot intrinsics': 'Legs',
	'toe extensors': 'Legs',
	'toe flexors': 'Legs',
	'ankle stabilizers': 'Legs',
	// Glutes
	glutes: 'Glutes',
	'gluteus maximus': 'Glutes',
	'gluteus medius': 'Glutes',
	'gluteus minimus': 'Glutes',
	'hip abductors': 'Glutes',
	'deep hip rotators': 'Glutes',
	// Core
	obliques: 'Core',
	'rectus abdominis': 'Core',
	'transverse abdominis': 'Core',
	'quadratus lumborum': 'Core',
	abdominals: 'Core',
	trunk: 'Core',
	core: 'Core',
	'deep abdominal wall': 'Core',
};

/**
 * The group a move belongs to. A cardio pattern wins first, because cardio is
 * not derivable from muscle (the rower trains legs and back but is a cardio
 * machine). Otherwise it is the group of the first muscle that maps, and Other
 * when no muscle maps.
 */
export function muscleGroupFor(move: MachineExercise): MuscleGroup {
	if (move.pattern === 'cardio') return 'Cardio';
	for (const muscle of move.muscles) {
		const group = MUSCLE_GROUP[muscle];
		if (group) return group;
	}
	return 'Other';
}

/**
 * Group a list of moves by muscle group, keeping only the groups that hold at
 * least one move and ordering them as the picker shows them. Pure, so the UI
 * stays a thin view over the shared data.
 */
export function groupByMuscleGroup<T extends MachineExercise>(
	moves: T[],
): { group: MuscleGroup; moves: T[] }[] {
	const out: { group: MuscleGroup; moves: T[] }[] = [];
	for (const group of MUSCLE_GROUPS) {
		const inGroup = moves.filter((m) => muscleGroupFor(m) === group);
		if (inGroup.length) out.push({ group, moves: inGroup });
	}
	return out;
}

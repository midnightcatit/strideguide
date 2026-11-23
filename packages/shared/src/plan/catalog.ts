/**
 * Unified move catalog and circuit builder. Machines and bodyweight moves share
 * one shape, so the engine and the UI can treat them the same way and a session
 * can mix the two.
 */

import { BODYWEIGHT_MOVES, DUMBBELL_MOVES } from './bodyweight';
import { PF_MACHINES, type MachineExercise } from './machines';
import {
	BAND_HOME_MOVES,
	BODYWEIGHT_PROGRESSIONS,
	EXTRA_MACHINES,
	FREEWEIGHT_MOVES,
} from './exercises';
import type { EquipmentPreference } from '../types';

/** Every move we can name: machines and bodyweight, then the wave-5 expansions. */
export const ALL_MOVES: MachineExercise[] = [
	...PF_MACHINES,
	...BODYWEIGHT_MOVES,
	...DUMBBELL_MOVES,
	...EXTRA_MACHINES,
	...FREEWEIGHT_MOVES,
	...BAND_HOME_MOVES,
	...BODYWEIGHT_PROGRESSIONS,
];

/** Look a move up by name, across both catalogs. */
export function findMove(name?: string): MachineExercise | undefined {
	if (!name) return undefined;
	return ALL_MOVES.find((m) => m.name === name);
}

// Running-relevant order: legs and posterior chain first, then push/pull and core.
const MACHINE_ORDER = [
	'Leg press',
	'Leg curl',
	'Back extension',
	'Leg extension',
	'Seated row',
	'Shoulder press',
	'Bicep curl',
	'Tricep extension',
];
const BODYWEIGHT_ORDER = [
	'Bodyweight squat',
	'Split squat',
	'Single-leg RDL',
	'Glute bridge',
	'Calf raise',
	'Push-up',
	'Inverted row',
	'Prone Y-T-W',
	'Plank',
	'Dead bug',
];

function ordered(moves: MachineExercise[], order: string[]): MachineExercise[] {
	const rank = new Map(order.map((n, i) => [n, i]));
	return [...moves].sort((a, b) => (rank.get(a.name) ?? 99) - (rank.get(b.name) ?? 99));
}

/** Circuit size for a session length in minutes. */
export function circuitSize(minutes?: number): number {
	if (!minutes) return 6;
	if (minutes <= 30) return 5;
	if (minutes >= 60) return 8;
	return 6;
}

/**
 * A running-relevant strength circuit for the chosen equipment. `allowed` narrows
 * machines to what the user has, and is ignored for bodyweight, which needs none.
 */
export function circuitFor(
	mode: EquipmentPreference = 'machines',
	minutes?: number,
	allowed?: string[],
	loaded = false,
): MachineExercise[] {
	const size = circuitSize(minutes);
	const machines = ordered(
		allowed?.length ? PF_MACHINES.filter((m) => allowed.includes(m.name)) : PF_MACHINES,
		MACHINE_ORDER,
	);
	const bodyweight = ordered(BODYWEIGHT_MOVES, BODYWEIGHT_ORDER);

	if (mode === 'bodyweight') return bodyweight.slice(0, size);
	// With dumbbells, the base block is bodyweight and the later blocks load it up.
	if (mode === 'bodyweight-dumbbells') {
		return (loaded ? ordered(DUMBBELL_MOVES, BODYWEIGHT_ORDER) : bodyweight).slice(0, size);
	}
	if (mode === 'both') {
		const mixed: MachineExercise[] = [];
		for (let i = 0; i < Math.max(machines.length, bodyweight.length); i++) {
			if (machines[i]) mixed.push(machines[i]!);
			if (bodyweight[i]) mixed.push(bodyweight[i]!);
		}
		return mixed.slice(0, size);
	}
	return machines.slice(0, size);
}

/**
 * Unified move catalog and circuit builder. Machines, free weights, bands and
 * bodyweight moves share one shape, so the engine and the UI can treat them the
 * same way and a session can mix them. The circuit honors the runner's equipment
 * choice, the kit they actually have, and their level.
 */

import { BODYWEIGHT_MOVES, DUMBBELL_MOVES } from './bodyweight';
import { PF_MACHINES, type MachineExercise, type MovePattern } from './machines';
import {
	BAND_HOME_MOVES,
	BODYWEIGHT_PROGRESSIONS,
	EXTRA_MACHINES,
	FREEWEIGHT_MOVES,
	RUNNER_PROTOCOL_MOVES,
} from './exercises';
import type { EquipmentItem, EquipmentPreference } from '../types';

/** Every move we can name: machines and bodyweight, then the wave-5 and wave-6 expansions. */
export const ALL_MOVES: MachineExercise[] = [
	...PF_MACHINES,
	...BODYWEIGHT_MOVES,
	...DUMBBELL_MOVES,
	...EXTRA_MACHINES,
	...FREEWEIGHT_MOVES,
	...BAND_HOME_MOVES,
	...BODYWEIGHT_PROGRESSIONS,
	...RUNNER_PROTOCOL_MOVES,
];

/** Look a move up by name, across both catalogs. */
export function findMove(name?: string): MachineExercise | undefined {
	if (!name) return undefined;
	return ALL_MOVES.find((m) => m.name === name);
}

/** The equipment category a move belongs to, for the runner's kit checklist. */
export function moveCategory(m: MachineExercise): EquipmentItem | 'bodyweight' {
	if (m.equipment === 'machine' || m.equipment === 'cable') return 'machines';
	if (m.equipment === 'dumbbells') return 'dumbbells';
	if (m.equipment === 'barbell') return 'barbell';
	if (m.equipment === 'kettlebell') return 'kettlebell';
	if (m.equipment === 'bands' || m.equipment === 'home') return 'bands';
	if (PF_MACHINES.includes(m)) return 'machines';
	if (DUMBBELL_MOVES.includes(m)) return 'dumbbells';
	return 'bodyweight';
}

/** What a built circuit is actually made of, read from its moves. */
export type StrengthShape = 'machines' | 'bodyweight' | 'mixed';

/**
 * The shape of a strength circuit, taken from the moves actually selected rather
 * than the equipment mode the runner picked. A machines-mode circuit still tops
 * up with bodyweight moves when a pattern has no machine, and every mode leans on
 * bodyweight to fill gaps, so the label has to follow the moves or a card can read
 * "Machine circuit" over a bodyweight squat. `mixed` covers a blend (machines plus
 * bodyweight, or free weights plus bodyweight).
 */
export function strengthShape(circuit: MachineExercise[]): StrengthShape {
	if (!circuit.length) return 'mixed';
	const categories = new Set(circuit.map((m) => moveCategory(m)));
	if ([...categories].every((c) => c === 'machines')) return 'machines';
	if ([...categories].every((c) => c === 'bodyweight')) return 'bodyweight';
	return 'mixed';
}

/** Circuit size for a session length in minutes. */
export function circuitSize(minutes?: number): number {
	if (!minutes) return 6;
	if (minutes <= 30) return 5;
	if (minutes >= 60) return 8;
	return 6;
}

// Running-relevant pattern order: legs and hips first, then push/pull, then core.
const PATTERN_SEQUENCE: MovePattern[] = [
	'squat',
	'hinge',
	'pull',
	'push',
	'core',
	'posterior-chain',
	'knee-extension',
	'plyometric',
];

const LEVELS: Record<string, string[]> = {
	beginner: ['beginner'],
	intermediate: ['beginner', 'intermediate'],
	advanced: ['beginner', 'intermediate', 'advanced'],
};

function dedupeByName(moves: MachineExercise[]): MachineExercise[] {
	const seen = new Set<string>();
	const out: MachineExercise[] = [];
	for (const m of moves) {
		if (seen.has(m.name)) continue;
		seen.add(m.name);
		out.push(m);
	}
	return out;
}

function roundRobin(pools: MachineExercise[][]): MachineExercise[] {
	const out: MachineExercise[] = [];
	const max = Math.max(0, ...pools.map((p) => p.length));
	for (let i = 0; i < max; i++) {
		for (const pool of pools) {
			if (pool[i]) out.push(pool[i]!);
		}
	}
	return dedupeByName(out);
}

/** Bodyweight moves plus the progression rungs the runner's level allows. */
function bodyweightPool(level?: string): MachineExercise[] {
	const allowed = LEVELS[level ?? 'beginner'] ?? LEVELS.beginner!;
	const progressions = BODYWEIGHT_PROGRESSIONS.filter((p) => !p.level || allowed.includes(p.level));
	return [...BODYWEIGHT_MOVES, ...progressions];
}

const freeByTool = (tool: string) => FREEWEIGHT_MOVES.filter((m) => m.equipment === tool);

/**
 * The candidate moves for a mode, before the kit filter and the balancing. Before
 * the base phase (`loaded` false), a mixed program stays on machines, bodyweight
 * and dumbbells, then adds the heavier free weights and bands once the base is in.
 */
function poolFor(mode: EquipmentPreference, level?: string, loaded = false): MachineExercise[] {
	const bw = bodyweightPool(level);
	const machines = [...PF_MACHINES, ...EXTRA_MACHINES];
	const dumbbells = [...DUMBBELL_MOVES, ...freeByTool('dumbbells')];
	const free = [
		...DUMBBELL_MOVES,
		...freeByTool('dumbbells'),
		...freeByTool('barbell'),
		...freeByTool('kettlebell'),
	];
	const bands = [...BAND_HOME_MOVES];

	switch (mode) {
		case 'bodyweight':
			return dedupeByName(bw);
		case 'bodyweight-dumbbells':
			return loaded ? roundRobin([dumbbells, bw]) : dedupeByName(bw);
		case 'dumbbells':
			return roundRobin([dumbbells, bw]);
		case 'barbell':
			return roundRobin([freeByTool('barbell'), bw]);
		case 'kettlebell':
			return roundRobin([freeByTool('kettlebell'), bw]);
		case 'bands':
			return roundRobin([bands, bw]);
		case 'both':
			return roundRobin([machines, bw]);
		case 'full-gym':
			return loaded ? roundRobin([machines, free, bands, bw]) : roundRobin([machines, bw]);
		case 'machines':
		default:
			return dedupeByName(machines);
	}
}

/** True when a move fits the runner's kit: their categories and their machines. */
function available(m: MachineExercise, items?: string[], machines?: string[]): boolean {
	const cat = moveCategory(m);
	const kitOk = cat === 'bodyweight' || !items?.length || items.includes(cat);
	const machineOk = cat !== 'machines' || !machines?.length || machines.includes(m.name);
	return kitOk && machineOk;
}

/** Pick a balanced circuit: a move per pattern in turn, then anything left. */
function selectBalanced(pool: MachineExercise[], size: number): MachineExercise[] {
	const out: MachineExercise[] = [];
	const used = new Set<string>();
	for (let i = 0; i < size; i++) {
		const pattern = PATTERN_SEQUENCE[i % PATTERN_SEQUENCE.length]!;
		let pick = pool.find((m) => !used.has(m.name) && m.pattern === pattern);
		if (!pick) pick = pool.find((m) => !used.has(m.name));
		if (!pick) break;
		used.add(pick.name);
		out.push(pick);
	}
	return out;
}

/**
 * A running-relevant strength circuit for the chosen equipment. `items` narrows
 * to the runner's categories and `machines` to the machines they have; the filter
 * never shows equipment the runner lacks, topping up with bodyweight instead.
 * `level` picks the bodyweight progression rung.
 */
export function circuitFor(
	mode: EquipmentPreference = 'machines',
	minutes?: number,
	items?: string[],
	loaded = false,
	level?: string,
	machines?: string[],
): MachineExercise[] {
	const size = circuitSize(minutes);
	const base = poolFor(mode, level, loaded);
	const filtered = base.filter((m) => available(m, items, machines));
	// Bodyweight is always available, so a thin kit still fills a full circuit.
	const pool = filtered.length
		? dedupeByName([...filtered, ...bodyweightPool(level)])
		: bodyweightPool(level);
	return selectBalanced(pool, size);
}

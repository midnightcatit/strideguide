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

/**
 * The lower-body spine of every strength session, in priority order: a squat or
 * leg-press pattern, a hip hinge, knee flexion and calf work. The spine leads
 * every sequence, so an upper-body or core accessory never displaces a
 * lower-body pattern; when a session is short, the accessory is the first thing
 * cut (research/wave-7/17a).
 */
const LOWER_SPINE: MovePattern[] = ['squat', 'hinge', 'knee-flexion', 'calf'];

/**
 * A strength day's lean within a full-body session. `patterns` is a priority
 * order, not a filter: the lower-body spine first, then the lean's extra move
 * for its area, then one or two upper-body or core accessories, then a second
 * round of the spine to fill a long session. Every session keeps the spine, so
 * the day still trains the whole body whatever it leans on.
 */
export interface StrengthFocus {
	id: string;
	label: string;
	/** A plain day title for a session with this lean, e.g. "Leg day". */
	title: string;
	patterns: MovePattern[];
}

// The two legs-lean days alternate their first accessory between push and
// pull, so the week still covers the upper body both ways.
const LEGS_LEAN_PUSH: StrengthFocus = {
	id: 'legs',
	label: 'legs and hips',
	title: 'Leg day',
	// Spine, the lean's extra lower move, then the accessories, then a second
	// squat, so a long session stays lower-heavy.
	patterns: [...LOWER_SPINE, 'knee-extension', 'push', 'core', 'squat'],
};
const LEGS_LEAN_PULL: StrengthFocus = {
	id: 'legs',
	label: 'legs and hips',
	title: 'Leg day',
	patterns: [...LOWER_SPINE, 'knee-extension', 'pull', 'core', 'squat'],
};
const UPPER_CORE_LEAN: StrengthFocus = {
	id: 'upper-core',
	label: 'upper body and core',
	title: 'Upper body day',
	// The spine still leads, so the legs keep their share; the lean adds the
	// core and push accessories, and a second squat fills a long session before
	// the pull dose, keeping the lower body about two thirds of the work.
	patterns: [...LOWER_SPINE, 'core', 'push', 'squat', 'pull'],
};

/**
 * The week's lean rotation: with two strength days both lean legs and hips
 * (one pushing, one pulling accessory), with three or more the first two lean
 * legs and hips and the next leans upper body and core. Legs lead twice
 * because running loads them most, and every session still touches the whole
 * body (research/wave-7/17a).
 */
const LEAN_ROTATION: StrengthFocus[] = [LEGS_LEAN_PUSH, LEGS_LEAN_PULL, UPPER_CORE_LEAN];

/**
 * The lean for the `index`-th strength day of a week with `count` strength
 * days. One strength day a week stays full-body with no lean. With two, both
 * lean legs and hips. With three or more, two lean legs and hips and the next
 * leans upper body and core, so the week spreads the work while every session
 * keeps the lower-body spine (research/wave-7/17a).
 */
export function focusFor(index: number, count: number): StrengthFocus | null {
	if (count <= 1) return null;
	return LEAN_ROTATION[index % LEAN_ROTATION.length] ?? null;
}

// The full-body session with no lean: the spine, then a pull and a push
// accessory, then core and a second squat to fill a long session.
const PATTERN_SEQUENCE: MovePattern[] = [...LOWER_SPINE, 'pull', 'push', 'core', 'squat'];

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
	const bands = BAND_HOME_MOVES.filter((m) => loaded || !m.requiresLoaded);

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
export function moveAvailable(m: MachineExercise, items?: string[], machines?: string[]): boolean {
	const cat = moveCategory(m);
	const kitOk = cat === 'bodyweight' || !items?.length || items.includes(cat);
	const machineOk = cat !== 'machines' || !machines?.length || machines.includes(m.name);
	return kitOk && machineOk;
}

/**
 * Pick a balanced circuit: a move per pattern in turn, then anything left. A
 * favorite move is taken first for its pattern, then any favorite left over, so
 * the run of patterns is kept and favorites only bend the choice within it.
 */
function selectBalanced(
	pool: MachineExercise[],
	size: number,
	favorites?: string[],
	focus?: StrengthFocus | null,
	variant = 0,
): MachineExercise[] {
	const out: MachineExercise[] = [];
	const used = new Set<string>();
	const fav = new Set(favorites ?? []);
	const isFav = (m: MachineExercise) => fav.has(m.name);
	const patterns = focus?.patterns ?? PATTERN_SEQUENCE;
	for (let i = 0; i < size; i++) {
		const pattern = patterns[i % patterns.length]!;
		const matches = pool.filter((m) => !used.has(m.name) && m.pattern === pattern);
		// Rotate within a pattern by the variant, so the same squat or hinge is not
		// chosen every session; a favorite still wins its pattern.
		const pick =
			matches.find(isFav) ??
			matches[variant % Math.max(1, matches.length)] ??
			pool.find((m) => !used.has(m.name) && isFav(m)) ??
			pool.find((m) => !used.has(m.name));
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
 * `level` picks the bodyweight progression rung. `favorites` is a soft
 * preference: a favorite move is chosen for its pattern when it is in the pool,
 * and the circuit falls back to the normal pick when it is absent or unsuitable.
 */
export function circuitFor(
	mode: EquipmentPreference = 'machines',
	minutes?: number,
	items?: string[],
	loaded = false,
	level?: string,
	machines?: string[],
	favorites?: string[],
	focus?: StrengthFocus | null,
	variant = 0,
): MachineExercise[] {
	const size = circuitSize(minutes);
	const base = poolFor(mode, level, loaded);
	const filtered = base.filter((m) => moveAvailable(m, items, machines));
	// Bodyweight is always available, so a thin kit still fills a full circuit.
	const pool = filtered.length
		? dedupeByName([...filtered, ...bodyweightPool(level)])
		: bodyweightPool(level);
	return selectBalanced(pool, size, favorites, focus, variant);
}

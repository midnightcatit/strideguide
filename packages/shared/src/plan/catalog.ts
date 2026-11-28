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

/* ------------------------- strength variety (seeded) ---------------------- */

/**
 * The equipment tier a session is built from. A session picks one tier first and
 * takes its moves from it, so the composition title reads true. Barbell and
 * kettlebell moves are free weights, so they sit with the dumbbell tier; the
 * four tiers are the four plain circuit titles the runner sees.
 */
export type StrengthTier = 'machine' | 'dumbbell' | 'band' | 'bodyweight';

/** The plain word each tier shows as a circuit title. */
export const STRENGTH_TIER_LABELS: Record<StrengthTier, string> = {
	machine: 'Machine',
	dumbbell: 'Dumbbell',
	band: 'Band',
	bodyweight: 'Bodyweight',
};

/** The tiers in the order a mixed title lists them, most-specific first. */
const TIER_ORDER: StrengthTier[] = ['machine', 'dumbbell', 'band', 'bodyweight'];

/** The tier a move belongs to, read from its equipment through moveCategory. */
export function strengthTierOf(m: MachineExercise): StrengthTier {
	const cat = moveCategory(m);
	if (cat === 'machines') return 'machine';
	if (cat === 'bands') return 'band';
	if (cat === 'bodyweight') return 'bodyweight';
	return 'dumbbell';
}

/**
 * The composition title of a strength circuit, derived from the tiers its moves
 * are actually made of: one tier is "Machine circuit" and the like, two read
 * "<A> and <B> circuit", and three or more read "Mixed circuit". So the title can
 * never claim a tier the circuit does not hold.
 */
export function compositionTitle(moves: readonly MachineExercise[]): string {
	const present = new Set(moves.map((m) => strengthTierOf(m)));
	const tiers = TIER_ORDER.filter((t) => present.has(t));
	if (tiers.length >= 3) return 'Mixed circuit';
	if (tiers.length === 2) return `${STRENGTH_TIER_LABELS[tiers[0]!]} and ${STRENGTH_TIER_LABELS[tiers[1]!]} circuit`;
	if (tiers.length === 1) return `${STRENGTH_TIER_LABELS[tiers[0]!]} circuit`;
	return 'Strength circuit';
}

/**
 * A stable 32-bit hash of the parts, used to seed the session's rotation. FNV-1a
 * over the string form of each part, so the same (plan seed, week, day, slot)
 * always gives the same plan and different weeks or days differ.
 */
export function hashSeed(...parts: (string | number)[]): number {
	let h = 2166136261 >>> 0;
	for (const part of parts) {
		const s = String(part);
		for (let i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h = Math.imul(h, 16777619) >>> 0;
		}
		h ^= 0x2c;
		h = Math.imul(h, 16777619) >>> 0;
	}
	return h >>> 0;
}

/**
 * The stable seed for a plan, from its own identity: the runner's id and the
 * plan's start date. Two runners, or one runner's two plans with different
 * start dates, get different seeds, so their rotations differ; regenerating the
 * same plan gives the same seed, so it rebuilds identically.
 */
export function planSeed(userId: string, startDate: string): number {
	return hashSeed(userId, startDate);
}

/** A small deterministic PRNG (mulberry32), so a seed always replays the same picks. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A copy of the list in a seeded order, so accessories shuffle but replay. */
function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
}

/** How many recent strength sessions a move is kept out of. */
export const STRENGTH_RECENT_SESSIONS = 3;

/** The moves a tier can offer, before the kit filter. */
function tierPool(tier: StrengthTier, level: string | undefined, loaded: boolean): MachineExercise[] {
	switch (tier) {
		case 'machine':
			return dedupeByName([...PF_MACHINES, ...EXTRA_MACHINES]).filter(
				(m) => strengthTierOf(m) === 'machine',
			);
		case 'band':
			return BAND_HOME_MOVES.filter((m) => loaded || !m.requiresLoaded);
		case 'dumbbell':
			return dedupeByName([
				...DUMBBELL_MOVES,
				...freeByTool('dumbbells'),
				...freeByTool('barbell'),
				...freeByTool('kettlebell'),
			]);
		case 'bodyweight':
		default:
			return bodyweightPool(level);
	}
}

/**
 * The tier a session is built from, chosen before any move so the composition
 * stays true: the runner's equipment mode decides it. A full gym still leads on
 * machines, the mode the app was built for, and tops up from bodyweight only when
 * a pattern has no machine.
 */
export function primaryTierFor(mode: EquipmentPreference, loaded = false): StrengthTier {
	switch (mode) {
		case 'bodyweight':
			return 'bodyweight';
		case 'bodyweight-dumbbells':
			return loaded ? 'dumbbell' : 'bodyweight';
		case 'dumbbells':
		case 'barbell':
		case 'kettlebell':
			return 'dumbbell';
		case 'bands':
			return 'band';
		case 'both':
		case 'machines':
		case 'full-gym':
		default:
			return 'machine';
	}
}

export interface StrengthCircuitOptions {
	mode?: EquipmentPreference;
	minutes?: number;
	items?: string[];
	loaded?: boolean;
	level?: string;
	machines?: string[];
	favorites?: string[];
	focus?: StrengthFocus | null;
	/**
	 * The plan seed. Each pattern's move order is a stable seeded shuffle of this,
	 * so the same plan always walks the same order.
	 */
	seed?: number;
	/**
	 * A per-session seed for the accessory order, so the week's two strength days
	 * differ in the order of their work. Defaults to `seed`, so a direct call with
	 * one seed is still one deterministic circuit.
	 */
	sessionSeed?: number;
	/**
	 * The walking cursor per pattern, advanced in place as the pattern is used, so
	 * a slot returns to a move only after its order has been walked. Absent, every
	 * pattern starts at the head of its order.
	 */
	cursors?: Map<MovePattern, number>;
	/** Move names used in the last few sessions, deprioritized in every slot. */
	recent?: string[];
}

/**
 * The seeded circuit builder the engine uses. The spine's pattern order is kept,
 * the accessories are shuffled by the session seed, and each pattern walks its
 * own stable, plan-seeded order so a slot returns to a move only after the order
 * has been walked. A move used in the last few sessions is skipped, so nothing
 * repeats inside that window while the pools allow. The order lists the runner's
 * own tool first, then the rest of the tier, then bodyweight, then any move, so
 * a thin tier pool widens rather than repeating early, which is what makes a
 * two-tier composition.
 */
export function buildStrengthCircuit(o: StrengthCircuitOptions): MachineExercise[] {
	const size = circuitSize(o.minutes);
	const patternSeq = o.focus?.patterns ?? PATTERN_SEQUENCE;
	const spine = patternSeq.slice(0, LOWER_SPINE.length);
	const accessories = patternSeq.slice(LOWER_SPINE.length);
	const sessionRng = mulberry32(o.sessionSeed ?? o.seed ?? 0);
	const orderedPatterns = [...spine, ...seededShuffle(accessories, sessionRng)];

	const tier = primaryTierFor(o.mode ?? 'machines', o.loaded ?? false);
	// The runner's own tool, when they named one, leads the tier: a kettlebell
	// runner sees kettlebell moves first rather than a plain dumbbell draw.
	const preferredTool =
		o.mode === 'kettlebell'
			? 'kettlebell'
			: o.mode === 'barbell'
				? 'barbell'
				: o.mode === 'dumbbells' || o.mode === 'bodyweight-dumbbells'
					? 'dumbbells'
					: undefined;
	const primary = tierPool(tier, o.level, o.loaded ?? false).filter((m) =>
		moveAvailable(m, o.items, o.machines),
	);
	const bw = bodyweightPool(o.level).filter((m) => moveAvailable(m, o.items, o.machines));
	const anyMove = ALL_MOVES.filter((m) => moveAvailable(m, o.items, o.machines));
	const recent = new Set(o.recent ?? []);
	const fav = new Set(o.favorites ?? []);
	const used = new Set<string>();
	const out: MachineExercise[] = [];

	// One stable order per pattern, fixed for the plan by a hash of the plan seed
	// and the pattern: the runner's own tool first, then the rest of the tier,
	// then bodyweight, then any move, each group shuffled so the order itself
	// differs per pattern. `solidEnd` is where the any-move fallback starts, so a
	// favorite is only honored from the moves the runner actually has.
	const orderCache = new Map<MovePattern, { order: MachineExercise[]; solidEnd: number }>();
	const orderFor = (pattern: MovePattern): { order: MachineExercise[]; solidEnd: number } => {
		const cached = orderCache.get(pattern);
		if (cached) return cached;
		const rng = mulberry32(hashSeed(o.seed ?? 0, pattern));
		const seen = new Set<string>();
		const take = (list: MachineExercise[]) => {
			const group: MachineExercise[] = [];
			for (const m of list) {
				if (m.pattern !== pattern || seen.has(m.name)) continue;
				seen.add(m.name);
				group.push(m);
			}
			return seededShuffle(group, rng);
		};
		const primaryGroup = take(primary);
		const preferred = preferredTool
			? primaryGroup.filter((m) => m.equipment === preferredTool)
			: [];
		const rest = primaryGroup.filter((m) => !preferred.includes(m));
		const bwGroup = take(bw);
		const order = [...preferred, ...rest, ...bwGroup, ...take(anyMove)];
		const entry = { order, solidEnd: preferred.length + rest.length + bwGroup.length };
		orderCache.set(pattern, entry);
		return entry;
	};

	for (let i = 0; i < size; i++) {
		const pattern = orderedPatterns[i % orderedPatterns.length]!;
		const { order, solidEnd } = orderFor(pattern);
		if (!order.length) break;
		const start = (o.cursors?.get(pattern) ?? 0) % order.length;
		const fresh = (m: MachineExercise) => !used.has(m.name) && !recent.has(m.name);
		// A favorite move the runner has wins when it is fresh, as before; the
		// search stays inside the tier and bodyweight moves, so a favorite the
		// runner's kit cannot make is never forced in from the any-move fallback.
		let index = -1;
		for (let k = 0; k < solidEnd; k++) {
			if (fav.has(order[k]!.name) && fresh(order[k]!)) {
				index = k;
				break;
			}
		}
		if (index < 0) {
			// Walk the order from the cursor to the next fresh move.
			for (let k = 0; k < order.length; k++) {
				const j = (start + k) % order.length;
				if (fresh(order[j]!)) {
					index = j;
					break;
				}
			}
		}
		// Every move this slot can take is used or recent: take the next unused one
		// rather than dropping the slot, which keeps the spine whole.
		if (index < 0) {
			for (let k = 0; k < order.length; k++) {
				const j = (start + k) % order.length;
				if (!used.has(order[j]!.name)) {
					index = j;
					break;
				}
			}
		}
		if (index < 0) break;
		const pick = order[index]!;
		used.add(pick.name);
		out.push(pick);
		// The cursor moves past the move this slot took, so the order is walked and
		// a move does not return until the whole order has cycled.
		o.cursors?.set(pattern, index + 1);
	}
	return out;
}

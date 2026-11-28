/**
 * Mobility planning: how much dedicated stretching a runner earns from the
 * flexibility gap, and which stretches they get, chosen from their own answers.
 *
 * Evidence behind the rules (citations in the PR):
 * - Stretch training for two weeks or more raises range of motion, and static or
 *   PNF holds do it better than dynamic or ballistic work (Konrad et al. 2023).
 * - The weekly frequency and volume of stretching did not clearly change how
 *   much range a general population gained, so we scale frequency with the goal
 *   and only go daily for the biggest one instead of chasing maximum minutes.
 * - A single long static hold before running can cost a little power, so the
 *   dedicated sessions are scheduled away from the hard running (Konrad 2021).
 * - Range is specific to the muscles and positions you stretch, so a real goal
 *   aims the work at the areas the runner told us about: terrain, niggles and
 *   the sports they play.
 *
 * Pure: it reads types and drill data only, with no runtime imports.
 */

import type { Baseline, TerrainPreference } from '../types';
import { COOLDOWN_STRETCHES, EXTRA_STRETCHES, WARMUP_DRILLS, type Drill } from './mobility';
import { DYNAMIC_DRILLS, findDrill } from './stretches';

/** The area a stretch session can bias toward. */
export type StretchFocus =
	'general' | 'hips-glutes' | 'hamstrings-calves' | 'ankles' | 'upper-back';

/** Every focus, in the order used to break ties. */
export const STRETCH_FOCUSES: StretchFocus[] = [
	'hips-glutes',
	'hamstrings-calves',
	'ankles',
	'upper-back',
	'general',
];

/** A dose of dedicated mobility, keyed by the flexibility gap. */
export interface MobilityLevelRule {
	/** Smallest gap (goal minus current, both 1 to 5) that earns this dose. */
	minGap: number;
	/** Dedicated mobility sessions a week. */
	perWeek: number;
	/** Library workout the engine names when the focus is general. */
	libraryId: string;
}

/**
 * The gap decides the frequency, from one short session up to a session every
 * day. Above the ACSM floor of two to three days a week, frequency did not
 * clearly add range in general populations, so a bigger goal is met with a
 * longer routine and a steadier habit rather than more minutes piled on.
 */
export const MOBILITY_LEVELS: MobilityLevelRule[] = [
	{ minGap: 4, perWeek: 7, libraryId: 'mobility-build-general' },
	{ minGap: 3, perWeek: 3, libraryId: 'mobility-build-general' },
	{ minGap: 2, perWeek: 2, libraryId: 'mobility-stretch-12' },
	{ minGap: 1, perWeek: 1, libraryId: 'mobility-stretch-8' },
];

/** The thorough library workout for each focus, used once the gap is worth aiming. */
export const FOCUS_LIBRARY_ID: Record<StretchFocus, string> = {
	general: 'mobility-build-general',
	'hips-glutes': 'mobility-build-hips-glutes',
	'hamstrings-calves': 'mobility-build-hamstrings-calves',
	ankles: 'mobility-build-ankles',
	'upper-back': 'mobility-build-upper-back',
};

/** Terrain the runner mostly runs on points at the area that takes the load. */
export const TERRAIN_FOCUS: Record<TerrainPreference, StretchFocus> = {
	hilly: 'hamstrings-calves',
	flat: 'ankles',
	mixed: 'hips-glutes',
};

/**
 * Niggle keywords, matched in the runner's own words. A named niggle is the
 * strongest signal, so each match carries the most weight.
 */
export const NIGGLE_FOCUS: { keyword: string; focus: StretchFocus }[] = [
	{ keyword: 'knee', focus: 'hips-glutes' },
	{ keyword: 'itb', focus: 'hips-glutes' },
	{ keyword: 'iliotibial', focus: 'hips-glutes' },
	{ keyword: 'hip', focus: 'hips-glutes' },
	{ keyword: 'glute', focus: 'hips-glutes' },
	{ keyword: 'piriformis', focus: 'hips-glutes' },
	{ keyword: 'groin', focus: 'hips-glutes' },
	{ keyword: 'hamstring', focus: 'hamstrings-calves' },
	{ keyword: 'calf', focus: 'hamstrings-calves' },
	{ keyword: 'calves', focus: 'hamstrings-calves' },
	{ keyword: 'achilles', focus: 'hamstrings-calves' },
	{ keyword: 'quad', focus: 'hamstrings-calves' },
	{ keyword: 'ankle', focus: 'ankles' },
	{ keyword: 'foot', focus: 'ankles' },
	{ keyword: 'plantar', focus: 'ankles' },
	{ keyword: 'shin', focus: 'ankles' },
	{ keyword: 'back', focus: 'upper-back' },
	{ keyword: 'neck', focus: 'upper-back' },
	{ keyword: 'shoulder', focus: 'upper-back' },
	{ keyword: 'posture', focus: 'upper-back' },
];

/** Sports and cross-training the runner does, a lighter signal than a niggle. */
export const ACTIVITY_FOCUS: { keyword: string; focus: StretchFocus }[] = [
	{ keyword: 'bike', focus: 'hips-glutes' },
	{ keyword: 'cycle', focus: 'hips-glutes' },
	{ keyword: 'soccer', focus: 'hamstrings-calves' },
	{ keyword: 'football', focus: 'hamstrings-calves' },
	{ keyword: 'rugby', focus: 'hamstrings-calves' },
	{ keyword: 'run', focus: 'hamstrings-calves' },
	{ keyword: 'swim', focus: 'upper-back' },
	{ keyword: 'row', focus: 'upper-back' },
	{ keyword: 'tennis', focus: 'upper-back' },
	{ keyword: 'climb', focus: 'upper-back' },
];

/**
 * Pick the area to work on from the runner's answers. A named niggle counts for
 * three, the terrain for two and each sport for one, so a niggle wins unless the
 * runner has clearly stacked another signal against it. Values are added per
 * focus and the highest wins, with ties broken by STRETCH_FOCUSES order.
 */
function mobilityVotes(baseline: Baseline): Map<StretchFocus, number> {
	const votes = new Map<StretchFocus, number>();
	const add = (focus: StretchFocus, weight: number) =>
		votes.set(focus, (votes.get(focus) ?? 0) + weight);

	const niggles = (baseline.niggles ?? '').toLowerCase();
	for (const { keyword, focus } of NIGGLE_FOCUS) if (niggles.includes(keyword)) add(focus, 3);

	if (baseline.terrain) add(TERRAIN_FOCUS[baseline.terrain], 2);

	const activities = [
		...(baseline.crossTraining ?? []),
		...(baseline.crossTrainingSchedule ?? []).map((s) => s.activity),
		baseline.customActivity ?? '',
	]
		.join(' ')
		.toLowerCase();
	for (const { keyword, focus } of ACTIVITY_FOCUS) if (activities.includes(keyword)) add(focus, 1);

	return votes;
}

/**
 * Pick the area to work on from the runner's answers: the focus with the most
 * votes, ties broken by STRETCH_FOCUSES order, and general when nothing was
 * named.
 */
export function mobilityFocus(baseline: Baseline): StretchFocus {
	const votes = mobilityVotes(baseline);
	let best: StretchFocus = 'general';
	let bestScore = 0;
	for (const focus of STRETCH_FOCUSES) {
		const score = votes.get(focus) ?? 0;
		if (score > bestScore) {
			best = focus;
			bestScore = score;
		}
	}
	return best;
}

export interface MobilityPrescription {
	/** Dedicated sessions a week. */
	perWeek: number;
	/** Library workout the engine names for the session. */
	libraryId: string;
	/** The area the stretches target. */
	focus: StretchFocus;
}

/**
 * The dedicated mobility a runner earns from the flexibility gap: none when the
 * goal is already met, one short session for a small gap, up to a session every
 * day for the biggest. The focus comes from the runner's answers whenever they
 * named an area, at any gap, because the dose pays where they are tight (17b);
 * with nothing named it stays general.
 */
export function mobilityPrescription(
	gap: number,
	baseline: Baseline,
): MobilityPrescription | undefined {
	if (gap <= 0) return undefined;
	const level = MOBILITY_LEVELS.find((l) => gap >= l.minGap);
	if (!level) return undefined;
	const focus = mobilityFocus(baseline);
	return {
		perWeek: level.perWeek,
		libraryId: focus === 'general' ? level.libraryId : FOCUS_LIBRARY_ID[focus],
		focus,
	};
}

/** Two dynamic loosen-up drills per focus, run before the holds. */
export const FOCUS_DYNAMIC: Record<StretchFocus, string[]> = {
	general: ['Leg swings (front to back)', 'Hip circles'],
	'hips-glutes': ['Walking hip openers', 'Hip circles'],
	'hamstrings-calves': ['Ankling', 'Straight-leg runs'],
	ankles: ['Ankle rocks', 'Ankling'],
	'upper-back': ['Cat-cow', 'Arm circles'],
};

/**
 * The static holds per focus, in order. The thorough routine runs all of them
 * for two short rounds each, which meets the total time under stretch without a
 * single hold long enough to cost power (Konrad 2021).
 */
export const FOCUS_STRETCHES: Record<StretchFocus, string[]> = {
	general: [
		'Standing straight-knee calf stretch',
		'Standing hamstring stretch',
		'Kneeling hip flexor stretch',
		'Seated glute figure-4 stretch',
		'Open book thoracic rotation',
		'Doorway chest stretch',
		'Standing quad stretch',
		'Seated butterfly adductor stretch',
	],
	'hips-glutes': [
		'Seated glute figure-4 stretch',
		'Supine figure-4 piriformis stretch',
		'Seated pigeon-style hip stretch',
		'Kneeling hip flexor stretch',
		'Standing cross-over abductor stretch',
		'Seated butterfly adductor stretch',
		'Standing quad stretch',
		'Side lunge adductor rock',
	],
	'hamstrings-calves': [
		'Standing straight-knee calf stretch',
		'Bent-knee calf stretch (soleus)',
		'Standing hamstring stretch',
		'Supine hamstring stretch with strap',
		'Standing quad stretch',
		'Knee-to-wall ankle rock',
		'Seated butterfly adductor stretch',
		'Side lunge adductor rock',
	],
	ankles: [
		'Knee-to-wall ankle rock',
		'Standing straight-knee calf stretch',
		'Bent-knee calf stretch (soleus)',
		'Ankle circles and alphabet',
		'Seated butterfly adductor stretch',
		'Standing hamstring stretch',
		'Standing quad stretch',
		"World's greatest stretch",
	],
	'upper-back': [
		'Open book thoracic rotation',
		'Cat-cow thoracic mobility',
		'Kneeling lat stretch',
		'Doorway chest stretch',
		'Cross-body shoulder stretch',
		'Neck side bend (upper trapezius stretch)',
		'Sleeper shoulder internal rotation stretch',
		"World's greatest stretch",
	],
};

/**
 * The thorough routine for a focus: two dynamic drills, then every hold twice.
 * The first two entries are the dynamic block, the rest are the static holds,
 * matching mobilityWorkout's split.
 */
export function focusRoutine(focus: StretchFocus): Drill[] {
	const dynamic = FOCUS_DYNAMIC[focus]
		.map((name) => findDrill(name))
		.filter((d): d is Drill => Boolean(d))
		.slice(0, 2);
	const holds = FOCUS_STRETCHES[focus]
		.map((name) => findDrill(name))
		.filter((d): d is Drill => Boolean(d))
		.map((d) => ({ ...d, rounds: 2 }));
	return [...dynamic, ...holds];
}

/* ------------- anchor, roaming and dose (research/wave-7/17b) ------------- */

/** The area name a session title carries, matching the library's own wording. */
export const FOCUS_AREA_TITLE: Record<StretchFocus, string> = {
	general: 'Mobility and stretching',
	'hips-glutes': 'Hips and glutes',
	'hamstrings-calves': 'Hamstrings and calves',
	ankles: 'Ankles and feet',
	'upper-back': 'Upper back and shoulders',
};

/** The same areas, phrased to sit inside a sentence. */
export const FOCUS_AREA_PHRASE: Record<StretchFocus, string> = {
	general: 'the areas running tightens most',
	'hips-glutes': 'hips and glutes',
	'hamstrings-calves': 'hamstrings and calves',
	ankles: 'ankles and feet',
	'upper-back': 'the upper back and shoulders',
};

/**
 * The anchor: two static holds per focus that repeat unchanged at every session
 * (17b). Each pair is chosen so no target muscle appears in both, which keeps a
 * daily anchor at about nine minutes a week per muscle, just under the
 * ten-minute static plateau, so rotation never has to shorten the anchor to
 * respect it. The ankles pair uses the seated calf hold with the adductor hold,
 * both in the ankles routine list, so the two rocking and circling drills stay
 * in the dynamic portion instead of being timed as static holds.
 */
export const ANCHOR_STRETCHES: Record<StretchFocus, string[]> = {
	general: ['Standing straight-knee calf stretch', 'Kneeling hip flexor stretch'],
	'hips-glutes': ['Seated glute figure-4 stretch', 'Kneeling hip flexor stretch'],
	'hamstrings-calves': ['Standing straight-knee calf stretch', 'Standing hamstring stretch'],
	ankles: ['Bent-knee calf stretch (soleus)', 'Seated butterfly adductor stretch'],
	'upper-back': ['Open book thoracic rotation', 'Cross-body shoulder stretch'],
};

/** Sets per hold: the 17b prescription of two sets of 30 to 45 seconds. */
export const HOLD_ROUNDS = 2;

/** The static plateau: about ten minutes a week per target muscle (17b). */
export const WEEKLY_STRETCH_PLATEAU_SEC = 600;

/**
 * Routines list a few drills that are movements, not holds: a rocking or
 * circling drill belongs in the dynamic warm-up, so giving it hold rounds does
 * not make it a static stretch and it must never count toward the static dose
 * (17b measures static stretch time).
 */
export const MOVEMENT_DRILLS: string[] = [
	'Knee-to-wall ankle rock',
	'Ankle circles and alphabet',
	'Side lunge adductor rock',
	"World's greatest stretch",
	'Cat-cow thoracic mobility',
];

const MOVEMENT_SET = new Set(MOVEMENT_DRILLS);

/**
 * Every static common-area hold in one order, the backing list for the roaming
 * rotation. The pool is the whole mobility library: every static hold in the
 * focus routines plus the extra and cool-down holds the library carries, so the
 * roaming stretch covers all of it before it repeats. A session's candidates
 * are this list minus its own anchors, and the cursor walks the one order across
 * every session and every anchor, so a stretch never roams twice before the
 * whole list has cycled, even where a different anchor changes what a session
 * may pick.
 */
export const ROAMING_ORDER: string[] = (() => {
	const seen = new Set<string>();
	const order: string[] = [];
	const push = (name: string) => {
		if (MOVEMENT_SET.has(name) || seen.has(name) || !findDrill(name)) return;
		seen.add(name);
		order.push(name);
	};
	for (const focus of STRETCH_FOCUSES) for (const name of FOCUS_STRETCHES[focus]) push(name);
	// The extra and cool-down holds in the library widen the pool, so the
	// roaming stretch reaches the whole library before it repeats.
	for (const drill of [...COOLDOWN_STRETCHES, ...EXTRA_STRETCHES]) push(drill.name);
	return order;
})();

/**
 * One canonical key per muscle or structure. The stretch library names some
 * targets more precisely than the cool-down and extra holds do ('Achilles
 * tendon' beside 'Achilles', 'gastrocnemius' beside 'calves'), and the weekly
 * plateau is counted per target, so the aliases fold to one key before any dose
 * is counted. Without this a hold could read zero against a muscle the week has
 * already filled and slip past the plateau on an alias.
 */
const TARGET_ALIASES: Record<string, string> = {
	calves: 'gastrocnemius',
	calf: 'gastrocnemius',
	Achilles: 'Achilles tendon',
	'Achilles area': 'Achilles tendon',
	glutes: 'gluteus maximus',
	quads: 'quadriceps',
	'inner thigh': 'adductors',
	'mid-back': 'thoracic spine',
};

/** One target's canonical key: the alias table when it names an alias. */
export function canonicalTarget(target: string): string {
	return TARGET_ALIASES[target] ?? target;
}

/**
 * Every muscle and structure a stretch names, for the weekly dose ledger, folded
 * to canonical keys and deduped so an alias and its canonical name never count
 * the same seconds twice.
 */
export function stretchTargets(name: string): string[] {
	const targets = (findDrill(name)?.targets ?? []).map(canonicalTarget);
	return [...new Set(targets)];
}

/**
 * Add one stretch's seconds for a session to every target it names. A movement
 * drill never holds, so it adds nothing to the static dose.
 */
export function addHoldDose(ledger: Map<string, number>, name: string, seconds: number): void {
	if (MOVEMENT_SET.has(name)) return;
	for (const target of stretchTargets(name)) {
		ledger.set(target, (ledger.get(target) ?? 0) + seconds);
	}
}

/**
 * A stable 32-bit hash (FNV-1a) over the parts. The same parts always give the
 * same number, so the drill rotation is reproducible from the plan seed, the
 * week and the session index, and no two weeks fall in the same place.
 */
export function stableHash(...parts: (string | number)[]): number {
	let h = 0x811c9dc5;
	const text = parts.join('|');
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * The holds the second anchor can rotate to, one list per focus. Every option
 * sits in the same focus area and shares no target with the focus's first
 * anchor hold, so a session still anchors on the runner's stated area and the
 * weekly dose stays under the plateau whichever option the hash lands on. The
 * first anchor hold is the focus's signature and never changes.
 */
export const ANCHOR_SECOND_OPTIONS: Record<StretchFocus, string[]> = (() => {
	const out = {} as Record<StretchFocus, string[]>;
	for (const focus of STRETCH_FOCUSES) {
		const first = ANCHOR_STRETCHES[focus][0]!;
		const firstTargets = new Set(stretchTargets(first));
		out[focus] = FOCUS_STRETCHES[focus].filter(
			(name) =>
				!MOVEMENT_SET.has(name) &&
				name !== first &&
				Boolean(findDrill(name)) &&
				stretchTargets(name).every((target) => !firstTargets.has(target)),
		);
	}
	return out;
})();

/**
 * The two holds a session anchors on. The first is the focus's signature hold
 * and repeats at every session; the second rotates through the focus's other
 * holds by a stable hash of the plan seed, the week and the session index, so
 * the session changes while it keeps the runner's stated focus and the full
 * two-set dose (17b).
 */
export function anchorHolds(
	focus: StretchFocus,
	seed: string | number,
	week: number,
	sessionIndex: number,
): [string, string] {
	const first = ANCHOR_STRETCHES[focus][0]!;
	const options = ANCHOR_SECOND_OPTIONS[focus];
	const second =
		options.length > 0
			? options[stableHash(seed, week, sessionIndex) % options.length]!
			: ANCHOR_STRETCHES[focus][1]!;
	return [first, second];
}

/**
 * The index into ROAMING_ORDER of the roaming stretch for one session, or -1
 * when every candidate would push a muscle past the weekly plateau. The index
 * is a cursor: the caller moves it past the stretch this session took, skips
 * included, so the next session roams somewhere new. The scan walks the one
 * shared order, so the next pick never names the same stretch as the last even
 * when the anchor, and so the candidates, changed. The focus's fixed anchor pair
 * and any extra holds the session carries are held out, so the roam never
 * doubles an anchor hold.
 */
export function pickRoamingIndex(
	focus: StretchFocus,
	ledger: Map<string, number>,
	startIndex: number,
	exclude: string[] = [],
): number {
	const blocked = new Set([...ANCHOR_STRETCHES[focus], ...exclude]);
	for (let i = 0; i < ROAMING_ORDER.length; i++) {
		const index = (startIndex + i) % ROAMING_ORDER.length;
		const name = ROAMING_ORDER[index]!;
		if (blocked.has(name)) continue;
		const drill = findDrill(name);
		if (!drill) continue;
		const add = drill.durationSec * HOLD_ROUNDS;
		const fits = stretchTargets(name).every(
			(target) => (ledger.get(target) ?? 0) + add <= WEEKLY_STRETCH_PLATEAU_SEC,
		);
		if (fits) return index;
	}
	return -1;
}

/**
 * One session's routine: the focus's two dynamic drills, then the anchor holds
 * at two rounds each, then the roaming stretch when there is one. The anchors
 * default to the focus's fixed pair and are passed in when the second hold has
 * rotated. The anchor is never shortened; the roam only adds.
 */
export function mobilitySessionRoutine(
	focus: StretchFocus,
	roaming: string | undefined,
	anchors: [string, string] = [ANCHOR_STRETCHES[focus][0]!, ANCHOR_STRETCHES[focus][1]!],
): Drill[] {
	const dynamic = FOCUS_DYNAMIC[focus]
		.map((name) => findDrill(name))
		.filter((d): d is Drill => Boolean(d))
		.slice(0, 2);
	const holds = [...anchors, ...(roaming ? [roaming] : [])]
		.map((name) => findDrill(name))
		.filter((d): d is Drill => Boolean(d))
		.map((d) => ({ ...d, rounds: HOLD_ROUNDS }));
	return [...dynamic, ...holds];
}

/** The two areas a week's sessions anchor on: the top vote and the runner-up. */
export interface MobilityAnchorFocuses {
	primary: StretchFocus;
	secondary: StretchFocus;
}

/**
 * The areas the mobility sessions anchor on: the focus the runner's answers
 * voted highest, and the runner-up for the high-frequency swap. With no second
 * vote the swap borrows the first common runner area the primary is not, so the
 * swap always covers somewhere new.
 */
export function mobilityAnchorFocuses(baseline: Baseline): MobilityAnchorFocuses {
	const votes = mobilityVotes(baseline);
	// STRETCH_FOCUSES order is the tie-break, and sort is stable, so a filtered
	// pass keeps the same order mobilityFocus would pick with.
	const ranked = STRETCH_FOCUSES.filter((f) => (votes.get(f) ?? 0) > 0).sort(
		(a, b) => (votes.get(b) ?? 0) - (votes.get(a) ?? 0),
	);
	const primary = ranked[0] ?? 'general';
	const secondary =
		ranked[1] ?? STRETCH_FOCUSES.find((f) => f !== 'general' && f !== primary) ?? primary;
	return { primary, secondary };
}

/* ------------------- run warm-up and cool-down rotation ------------------ */

/**
 * The dynamic drills a run warm-up can rotate through. The pool is the warm-up
 * drills the library carries plus the dynamic joint-mobility drills, minus the
 * banded drills that need equipment, so every run can warm up from it anywhere.
 */
export const WARMUP_ROTATION_POOL: string[] = (() => {
	const equipment = new Set(['Monster walks (banded)', 'Clamshells (banded)', 'Lateral band walk']);
	const seen = new Set<string>();
	const out: string[] = [];
	for (const drill of [...WARMUP_DRILLS.slice(1), ...DYNAMIC_DRILLS]) {
		if (equipment.has(drill.name) || seen.has(drill.name)) continue;
		seen.add(drill.name);
		out.push(drill.name);
	}
	return out;
})();

/** The cool-down stretches: the whole static hold library, one order. */
export const COOLDOWN_ROTATION_POOL: string[] = ROAMING_ORDER;

/** The warm-up block keeps five drills; the cool-down block keeps four. */
export const WARMUP_DRILL_COUNT = 5;
export const COOLDOWN_DRILL_COUNT = 4;
/** The cool-down holds run 40 seconds each, as they always have. */
export const COOLDOWN_DRILL_SEC = 40;

/** A window of `count` names from the pool, starting at the hashed offset. */
function poolWindow(pool: string[], count: number, start: number): string[] {
	const out: string[] = [];
	for (let i = 0; i < count && i < pool.length; i++) out.push(pool[(start + i) % pool.length]!);
	return out;
}

/** Resolve a name window to drills, keeping the block's own duration and count. */
function drillsFrom(names: string[], durationSec: number): Drill[] {
	return names
		.map((name) => findDrill(name))
		.filter((d): d is Drill => Boolean(d))
		.map((d) => ({ ...d, durationSec, rounds: 1 }));
}

/**
 * The run warm-up drills for one session: a fixed count of dynamic drills from
 * the pool, chosen by a stable hash of the plan seed, the week and the session
 * index. Each drill takes the block's own duration, so the warm-up carries the
 * same number of drills for the same total time; only which drills change.
 */
export function rotatedWarmup(
	seed: string | number,
	week: number,
	index: number,
	durationSec: number,
): Drill[] {
	const start = stableHash(seed, week, index) % WARMUP_ROTATION_POOL.length;
	return drillsFrom(poolWindow(WARMUP_ROTATION_POOL, WARMUP_DRILL_COUNT, start), durationSec);
}

/**
 * The run cool-down stretches for one session: a fixed count of static holds
 * from the whole library, chosen by the same stable hash, each at 40 seconds,
 * so the cool-down keeps its count and its total time and only the stretches
 * change.
 */
export function rotatedCooldown(seed: string | number, week: number, index: number): Drill[] {
	const start = stableHash(seed, week, index) % COOLDOWN_ROTATION_POOL.length;
	return drillsFrom(
		poolWindow(COOLDOWN_ROTATION_POOL, COOLDOWN_DRILL_COUNT, start),
		COOLDOWN_DRILL_SEC,
	);
}

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
import type { Drill } from './mobility';
import { findDrill } from './stretches';

/** The area a stretch session can bias toward. */
export type StretchFocus = 'general' | 'hips-glutes' | 'hamstrings-calves' | 'ankles' | 'upper-back';

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
 * The anchor: two holds per focus that repeat unchanged at every session (17b).
 * Each pair is chosen so no target muscle appears in both, which keeps a daily
 * anchor at about nine minutes a week per muscle, just under the ten-minute
 * static plateau, so rotation never has to shorten the anchor to respect it.
 */
export const ANCHOR_STRETCHES: Record<StretchFocus, string[]> = {
	general: ['Standing straight-knee calf stretch', 'Kneeling hip flexor stretch'],
	'hips-glutes': ['Seated glute figure-4 stretch', 'Kneeling hip flexor stretch'],
	'hamstrings-calves': ['Standing straight-knee calf stretch', 'Standing hamstring stretch'],
	ankles: ['Knee-to-wall ankle rock', 'Ankle circles and alphabet'],
	'upper-back': ['Open book thoracic rotation', 'Cross-body shoulder stretch'],
};

/** Sets per hold: the 17b prescription of two sets of 30 to 45 seconds. */
export const HOLD_ROUNDS = 2;

/** The static plateau: about ten minutes a week per target muscle (17b). */
export const WEEKLY_STRETCH_PLATEAU_SEC = 600;

/** Every muscle and structure a stretch names, for the weekly dose ledger. */
export function stretchTargets(name: string): string[] {
	return findDrill(name)?.targets ?? [];
}

/** Add one stretch's seconds for a session to every target it names. */
export function addHoldDose(ledger: Map<string, number>, name: string, seconds: number): void {
	for (const target of stretchTargets(name)) {
		ledger.set(target, (ledger.get(target) ?? 0) + seconds);
	}
}

/**
 * The roaming candidates for a focus: every hold the other areas' routines
 * carry, minus this focus's own anchors, in a stable order that walks the
 * common runner areas. One of these rotates through each session.
 */
export function roamingPool(focus: StretchFocus): string[] {
	const anchors = new Set(ANCHOR_STRETCHES[focus]);
	const pool: string[] = [];
	const seen = new Set<string>();
	for (const other of STRETCH_FOCUSES) {
		if (other === focus) continue;
		for (const name of FOCUS_STRETCHES[other]) {
			if (anchors.has(name) || seen.has(name)) continue;
			seen.add(name);
			pool.push(name);
		}
	}
	return pool;
}

/**
 * The pool index of the roaming stretch for one session, or -1 when every
 * candidate would push a muscle past the weekly plateau. The index is a cursor:
 * the caller moves it past the stretch this session took, skips included, so
 * the next session roams somewhere new instead of replaying a skip's pick.
 */
export function pickRoamingIndex(
	focus: StretchFocus,
	ledger: Map<string, number>,
	startIndex: number,
): number {
	const pool = roamingPool(focus);
	for (let i = 0; i < pool.length; i++) {
		const index = (startIndex + i) % pool.length;
		const drill = findDrill(pool[index]!);
		if (!drill) continue;
		const add = drill.durationSec * HOLD_ROUNDS;
		const fits = stretchTargets(pool[index]!).every(
			(target) => (ledger.get(target) ?? 0) + add <= WEEKLY_STRETCH_PLATEAU_SEC,
		);
		if (fits) return index;
	}
	return -1;
}

/**
 * One session's routine: the focus's two dynamic drills, then the anchor holds
 * at two rounds each, then the roaming stretch when there is one. The anchor is
 * never shortened; the roam only adds.
 */
export function mobilitySessionRoutine(focus: StretchFocus, roaming: string | undefined): Drill[] {
	const dynamic = FOCUS_DYNAMIC[focus]
		.map((name) => findDrill(name))
		.filter((d): d is Drill => Boolean(d))
		.slice(0, 2);
	const holds = [...ANCHOR_STRETCHES[focus], ...(roaming ? [roaming] : [])]
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

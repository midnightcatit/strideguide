import type {
	EquipmentPreference,
	Intensity,
	SessionArchetype,
	SessionGoalContext,
	SessionWeekContext,
	StepBlock,
	StructuredWorkout,
	WorkoutStep,
} from '../types';
import { circuitFor, findMove, moveAvailable, strengthShape } from './catalog';
import type { MachineExercise } from './machines';
import {
	COOLDOWN_STRETCHES,
	QUALITY_WARMUP_DRILLS,
	STRIDES,
	WARMUP_DRILLS,
	drillBlock,
} from './mobility';
import { WORKOUT_LIBRARY, type LibraryWorkout } from './library';
import { mobilityPrescription } from './mobility-plan';
import { ageBuildFactor, suggestedWeeklyKm } from './recommend';
import { placeSessions, scheduleWarnings, type UnplacedSession } from './schedule';
import type {
	PlannedSession,
	PlannedWeek,
	PlanDraft,
	PlanInput,
	StrengthIntent,
	MobilityIntent,
	TrainingPaces,
} from './types';
import { composeSessionWhy } from './why';
import { VDOT_MAX, VDOT_MIN, pacesFromVdot, vdotFromBaseline } from './vdot';

/* ----------------------------- small helpers ----------------------------- */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

function isoToDate(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}
function dateToIso(d: Date): string {
	return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
	const d = isoToDate(iso);
	d.setUTCDate(d.getUTCDate() + n);
	return dateToIso(d);
}
function daysBetween(a: string, b: string): number {
	return Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / 86400000);
}
/** 0 = Monday … 6 = Sunday for an ISO date. */
function weekdayIndex(iso: string): number {
	return (isoToDate(iso).getUTCDay() + 6) % 7;
}

/** One-line, research-informed purpose per session archetype. */
const PURPOSE: Record<SessionArchetype, string> = {
	easy: 'Aerobic base: builds capillaries and mitochondria so faster running feels easier. You should feel conversational throughout.',
	recovery: 'Gentle blood flow to speed recovery between harder days. Keep it easy enough to chat.',
	long: 'Time on feet and fat oxidation, the single biggest driver of endurance. Stay relaxed and even.',
	tempo:
		'Raises lactate threshold so your goal pace feels easier to hold. You should feel "comfortably hard."',
	threshold:
		'Sustained work near threshold lifts the pace you can hold. Steady breathing, not gasping.',
	interval: 'Develops VO2max and top-end speed. Hard but controlled reps, full recovery between.',
	'race-pace':
		'Rehearsal at your goal pace. It makes race effort feel familiar, even and sustainable.',
	strides:
		'Short, fast, relaxed bursts that improve running economy and leg speed. Never straining.',
	hills: 'Strength-endurance: builds power and economy. Power up, control the descent.',
	fartlek: 'Unstructured speed play that teaches pace changes with less pressure.',
	race: 'Race day. Run your goal effort: controlled start, even middle, strong finish.',
	'machine-circuit': 'Builds the strength that protects joints and improves running economy.',
	'full-body-strength': 'Builds the strength that protects joints and improves running economy.',
	mobility: 'Range of motion and activation to keep the stride healthy.',
	'cross-train': 'Low-impact aerobic work that spares running legs while building fitness.',
};

const TITLE: Record<SessionArchetype, string> = {
	easy: 'Easy run',
	recovery: 'Recovery run',
	long: 'Long run',
	tempo: 'Tempo run',
	threshold: 'Threshold session',
	interval: 'Intervals',
	'race-pace': 'Goal-pace session',
	strides: 'Strides',
	hills: 'Hill reps',
	fartlek: 'Fartlek',
	race: 'Race',
	// Strength is labelled neutrally, since a session can mix machines, free
	// weights and bodyweight moves. The equipment wording lives in the summary and
	// the load note, which are built from the moves actually selected.
	'machine-circuit': 'Strength',
	'full-body-strength': 'Strength',
	mobility: 'Mobility',
	'cross-train': 'Cross-train',
};

/**
 * Per-equipment wording for the load note on a strength session. The session
 * archetype and noun are not here: they follow the moves actually selected, so a
 * machines-mode circuit that tops up with bodyweight never reads as machine-only.
 */
const MODE_COPY: Record<EquipmentPreference, { load: string }> = {
	machines: {
		load: 'Log weight per set; add load when you clear the top rep target.',
	},
	bodyweight: {
		load: 'Log reps. Make it harder with a slower lowering phase, a harder variation, or a longer hold.',
	},
	'bodyweight-dumbbells': {
		load: 'Log reps early, then weight once dumbbells enter. Progress with load or a slower lowering phase.',
	},
	dumbbells: {
		load: 'Log weight per set; add load when you clear the top reps with good form.',
	},
	barbell: {
		load: 'Log weight per set; add load when the top reps feel smooth and controlled.',
	},
	kettlebell: {
		load: 'Log weight per set; add load or reps while the swings stay crisp.',
	},
	bands: {
		load: 'Log reps; move to a harder band or slow the return when it gets easy.',
	},
	both: {
		load: 'Log weight per set on machines and reps on bodyweight moves.',
	},
	'full-gym': {
		load: 'Log weight per set; add load when you clear the top reps with good form.',
	},
};

const FOCUS: Record<string, string> = {
	base: 'Base: build aerobic volume',
	build: 'Build: add quality',
	peak: 'Peak: sharpen and rehearse goal pace',
	taper: 'Taper: freshen up, keep intensity',
	recovery: 'Recovery: easy running only',
};

/* ------------------------------- phases ---------------------------------- */

/**
 * The phase shape used when a profile ships no progression rules. A profile is
 * data, and a plan built from one that carries no rules should still have the
 * base, build, peak and taper arc the race profiles use, rather than a flat run
 * of base weeks that never tapers into the race. The week counts are
 * proportional, so the same shape scales to any plan length.
 */
const DEFAULT_PROGRESSION: PlanInput['profile']['progressionRules'] = [
	{ phase: 'base', weeks: 6, volumeStep: 0.08, deload: true },
	{ phase: 'build', weeks: 6, volumeStep: 0.08, deload: true },
	{ phase: 'peak', weeks: 3, volumeStep: 0.04, deload: false },
	{ phase: 'taper', weeks: 2, volumeStep: -0.25, deload: false },
];

function phaseSequence(
	rules: PlanInput['profile']['progressionRules'],
	totalWeeks: number,
): string[] {
	const effective = rules.length ? rules : DEFAULT_PROGRESSION;
	const sum = effective.reduce((s, r) => s + r.weeks, 0) || totalWeeks;
	const counts = effective.map((r) => Math.max(1, Math.floor((r.weeks / sum) * totalWeeks)));
	let assigned = counts.reduce((a, b) => a + b, 0);
	let i = 0;
	while (assigned < totalWeeks) {
		counts[i % Math.max(1, counts.length - 1)]!++;
		assigned++;
		i++;
	}
	for (let j = 0; j < counts.length - 1 && assigned > totalWeeks; j++) {
		while (counts[j]! > 1 && assigned > totalWeeks) {
			counts[j]!--;
			assigned--;
		}
	}
	const out: string[] = [];
	effective.forEach((r, idx) => {
		for (let k = 0; k < counts[idx]!; k++) out.push(r.phase);
	});
	return out.slice(0, totalWeeks);
}

/* ----------------------------- volume curve ------------------------------- */

function baseWeeklyKm(input: PlanInput): number {
	if (typeof input.baseline.weeklyKm === 'number' && input.baseline.weeklyKm > 0) {
		return input.baseline.weeklyKm;
	}
	return suggestedWeeklyKm(input.baseline.experience, input.profile.slug, input.baseline.age);
}

/** Default weekly reduction when a taper rule does not step volume down. */
const DEFAULT_TAPER_STEP = -0.2;
/** The lowest share of peak a taper week may fall to, so the last week is still real training. */
const TAPER_FLOOR = 0.4;

/**
 * A taper week's volume as a fraction of the peak. The rule's own negative
 * volumeStep sets how fast volume comes down, applied linearly against the peak
 * rather than compounding, so a three week taper does not collapse to a token
 * week. A rule that does not step down (zero or positive) is not a taper at
 * all, so a gentle default keeps it tapering, and a floor keeps the final week
 * a real week of training.
 */
function taperFraction(volumeStep: number, idx: number): number {
	const step = volumeStep < 0 ? volumeStep : DEFAULT_TAPER_STEP;
	return clamp(1 + step * (idx + 1), TAPER_FLOOR, 1);
}

/**
 * The week's volume across the plan.
 *
 * The shape comes from the profile's phase rules. When a `longFloorKm` is given,
 * a week that cannot hold its long run inside a sane share of itself is grown,
 * never past the weekly ceiling, and a deload week is left alone: its whole point
 * is to be lighter. The growth happens here, in the same pass as the taper, so a
 * taper is always computed from the peak the build actually reached.
 */
function volumeCurve(input: PlanInput, phases: string[], longFloorKm?: number[]): number[] {
	const base = baseWeeklyKm(input);
	const rules = input.profile.progressionRules;
	const byPhase = new Map(rules.map((r) => [r.phase, r]));
	// Level sets how fast the plan builds. Beginners build more gently, advanced
	// runners a little faster. The self-assessed build preference leans the whole
	// curve one way or the other. No positive step may exceed the ~10 percent
	// weekly ceiling that keeps injury risk down, and a stepback week still steps
	// down in base as well as build, so the shape is build three weeks, take a
	// lighter one, rather than a straight climb.
	const LEVEL_STEP: Record<string, number> = { beginner: 0.85, intermediate: 1, advanced: 1.15 };
	const BUILD: Record<string, { step: number; start: number }> = {
		'ease-in': { step: 0.8, start: 0.7 },
		steady: { step: 1, start: 0.9 },
		ambitious: { step: 1.2, start: 0.95 },
	};
	const build = BUILD[input.baseline.buildPreference ?? 'steady'] ?? BUILD.steady!;
	// Age eases the weekly growth rate for masters runners (see ageBuildFactor), so
	// an older runner's own starting volume is respected but the ramp is gentler.
	const levelStep =
		(LEVEL_STEP[input.baseline.experience ?? 'beginner'] ?? 1) *
		build.step *
		ageBuildFactor(input.baseline.age);
	const startFactor = build.start;
	// The most a week may grow to hold its long run, eased for older runners the
	// same way their build rate is. Level and preference shape the normal ramp, not
	// this catch-up, so a gentle ease-in plan can still lift a week to hold the goal.
	const arcCeiling = WEEKLY_STEP_CEILING * ageBuildFactor(input.baseline.age);
	const out: number[] = [];
	let prev = base;
	let peak = base;
	const withinPhase = new Map<string, number>();
	for (let w = 0; w < phases.length; w++) {
		const phase = phases[w]!;
		const rule = byPhase.get(phase) ?? { phase, weeks: 1, volumeStep: 0.05, deload: false };
		const idx = withinPhase.get(phase) ?? 0;
		withinPhase.set(phase, idx + 1);
		const isDeload = Boolean(rule.deload) && (idx + 1) % 4 === 0;
		let vol: number;
		if (w === 0) {
			// Ease in: the first week starts below the runner's current volume and
			// builds from there, so the plan never opens at a peak. A bolder build
			// opens closer to the current volume.
			vol = base * startFactor;
		} else if (phase === 'taper') {
			vol = peak * taperFraction(rule.volumeStep, idx);
		} else if (isDeload) {
			vol = prev * STEPBACK_FACTOR;
		} else {
			const step = Math.min(Math.max(0, rule.volumeStep * levelStep), WEEKLY_STEP_CEILING);
			vol = prev * (1 + step);
		}
		// Grow a week that is too light to hold the long run the plan is building
		// to. Never on a deload or taper week, and never past the safety ceiling.
		// The catch-up is eased for older runners the same way their build rate is,
		// so age still shows at the peak rather than being erased by the ceiling.
		const floor = longFloorKm?.[w];
		if (floor !== undefined && floor > 0 && !isDeload && phase !== 'taper' && phase !== 'recovery') {
			const need = floor / LONG_RUN_SHARE_CEILING;
			const ceiling = w === 0 ? need : prev * (1 + arcCeiling);
			vol = Math.max(vol, Math.min(need, Math.max(ceiling, vol)));
		}
		vol = clamp(round1(vol), 5, 160);
		if (phase !== 'taper') peak = Math.max(peak, vol);
		out.push(vol);
		prev = vol;
	}
	return out;
}

/** The peak long run a goal builds to, from the goal's own data. */
function peakLongKm(input: PlanInput): number | undefined {
	const longRun = input.profile.longRun;
	if (!longRun) return undefined;
	const raceKm = RACE_DISTANCE_KM[input.profile.slug];
	const fromRace =
		longRun.peakFractionOfRace !== undefined && raceKm
			? longRun.peakFractionOfRace * raceKm
			: undefined;
	const raw = longRun.peakKm ?? fromRace;
	if (raw === undefined) return undefined;
	return round1(clamp(raw, 3, longRun.maxKm));
}

/**
 * The plan's volume and long-run targets, week by week.
 *
 * For a goal with a peak long run, the long run is the anchor: it ramps from the
 * plan's own first week to that peak at the last week before the taper, and the
 * week grows only as far as it must to hold the long run inside a sane share of
 * it. Both are held to the ~10 percent weekly ceiling. When the runner's base
 * cannot reach the peak inside that ceiling, the long run stops where it safely
 * can and a warning says so, instead of the plan quietly shipping a short one.
 *
 * A goal with no peak of its own keeps the plain share-of-the-week rule, and a
 * recovery week is easy at any rate.
 */
function planTargets(
	input: PlanInput,
	phases: string[],
): { volumes: number[]; longKm: number[]; warnings: string[] } {
	const warnings: string[] = [];
	const buildWeeks = phases.filter((p) => p !== 'taper' && p !== 'recovery').length;
	const peak = peakLongKm(input);
	// The long run's share of the week falls as volume rises, so a light week is
	// still anchored by its long run and a heavy week spreads out around it.
	const shareOfWeek = (km: number) => round1(clamp(km * longRunShare(km), 3, 38));

	// The plain curve, which is also what a goal with no peak of its own keeps.
	const seedVolumes = volumeCurve(input, phases);
	if (peak === undefined || buildWeeks < 2) {
		const volumes = [...seedVolumes];
		const longKm = volumes.map((v, w) => (phases[w] === 'recovery' ? 0 : shareOfWeek(v)));
		return { volumes, longKm, warnings };
	}

	// The long run's arc: a geometric ramp from the plan's own first week to the
	// goal's peak at the last week before the taper, dipping on deload weeks and
	// never jumping over the weekly ceiling.
	const rampEnd = buildWeeks - 1;
	const start = shareOfWeek(seedVolumes[0]!);
	const reachable = round1(Math.min(peak, start * Math.pow(1 + WEEKLY_STEP_CEILING, rampEnd)));
	const ratio = Math.pow(reachable / start, 1 / rampEnd);
	const arc = seedVolumes.map((v) => shareOfWeek(v));
	let prev = start;
	for (let w = 0; w < buildWeeks; w++) {
		const dip = w > 0 && seedVolumes[w]! < seedVolumes[w - 1]!;
		let want = start * Math.pow(ratio, w);
		if (dip) want *= 0.85;
		if (w > 0) want = Math.min(want, prev * (1 + WEEKLY_STEP_CEILING));
		want = round1(clamp(Math.min(want, peak), 3, 38));
		arc[w] = want;
		prev = want;
	}

	// Grow the weeks the arc needs, in the same pass as the taper, so the taper
	// follows the peak the build actually reached.
	const volumes = volumeCurve(input, phases, arc);

	// The long run is the arc, held inside its week, but never less than the plain
	// share would give: an adequate plan is left as it was, and the arc only lifts
	// one that was falling short of its goal. It is capped at the goal's own peak,
	// so a big week can never push the long run past what the goal calls for.
	const longKm = phases.map((_, w) =>
		round1(
			clamp(
				Math.min(
					peak,
					Math.max(shareOfWeek(volumes[w]!), Math.min(arc[w]!, volumes[w]! * LONG_RUN_SHARE_CEILING)),
				),
				3,
				38,
			),
		),
	);

	// A taper week brings the long run down with the week, instead of holding the
	// peak flat into race week.
	const taperRule = input.profile.progressionRules.find((r) => r.phase === 'taper');
	const taperPeak = longKm[rampEnd]!;
	let taperIdx = 0;
	phases.forEach((phase, w) => {
		if (phase !== 'taper') return;
		longKm[w] = round1(
			clamp(
				Math.min(
					peak,
					shareOfWeek(volumes[w]!),
					taperPeak * taperFraction(taperRule?.volumeStep ?? 0, taperIdx),
				),
				3,
				38,
			),
		);
		taperIdx += 1;
	});
	// A recovery week carries no long run (its volume is set against the peak the
	// build actually reached, in generatePlan).
	phases.forEach((phase, w) => {
		if (phase === 'recovery') longKm[w] = 0;
	});

	// A goal with no race is never short of itself: it has all the time there is.
	const raceGoal = input.profile.longRun?.peakFractionOfRace !== undefined;
	const built = Math.max(...longKm.slice(0, buildWeeks));
	if (raceGoal && built < peak * 0.9) {
		// Unit-free on purpose: a distance here would be wrong for a mile reader.
		warnings.push(
			`Your plan builds to about ${Math.round((built / peak) * 100)}% of the long run a ${input.profile.name} wants in the weeks you have. A longer plan, or a few weeks of easy running before you start, would close the gap.`,
		);
	}
	return { volumes, longKm, warnings };
}

/* --------------------------- session allocation --------------------------- */

function estDuration(distanceKm: number, paceSecPerKm: number): number {
	return Math.round((distanceKm * paceSecPerKm) / 60);
}

/* ----------------------- structured workout builders ---------------------- */

const WARMUP_KM = 1.5;
const COOLDOWN_KM = 1.0;

/** Fallback paces (sec/km) when there is no VDOT baseline, so steps still get durations. */
const DEFAULT_PACES: TrainingPaces = {
	easy: [360, 390],
	marathon: 345,
	threshold: 330,
	interval: 300,
	repetition: 290,
};

/** Seconds to cover a distance at a pace (sec/km). */
function secsForM(meters: number, paceSecPerKm: number): number {
	return Math.round((meters / 1000) * paceSecPerKm);
}

function warmupStep(paces: TrainingPaces | undefined, km = WARMUP_KM): WorkoutStep {
	const p = paces ?? DEFAULT_PACES;
	return {
		kind: 'warmup',
		label: 'Warm-up jog',
		distanceM: Math.round(km * 1000),
		durationSec: secsForM(km * 1000, p.easy[1]),
		targetPaceSecPerKm: paces?.easy,
		targetZone: 'Z1–Z2',
		targetRpe: [2, 3],
		note: 'Easy and conversational. Extend if you need time to reach your route or hill.',
	};
}

function cooldownStep(paces: TrainingPaces | undefined, km = COOLDOWN_KM): WorkoutStep {
	const p = paces ?? DEFAULT_PACES;
	return {
		kind: 'cooldown',
		label: 'Cool-down jog',
		distanceM: Math.round(km * 1000),
		durationSec: secsForM(km * 1000, p.easy[1]),
		targetPaceSecPerKm: paces?.easy,
		targetRpe: [1, 3],
	};
}

/**
 * The run warm-up and cool-down for a quality session, scaled to the session so
 * a light week is not mostly warm-up. A short session gets short, easy bookends.
 */
function qualityWarmupCooldown(totalKm: number): { wu: number; cd: number } {
	const wu = clamp(round1(totalKm * 0.3), 0.6, 1.5);
	const cd = clamp(round1(totalKm * 0.2), 0.4, 1.0);
	return { wu, cd };
}

/** The raise: easy running that lifts heart rate before the drills. */
function raiseBlock(paces: TrainingPaces | undefined, km = WARMUP_KM): StepBlock {
	return { repeat: 1, label: 'Warm-up', steps: [warmupStep(paces, km)] };
}

/** Warm-up strides for a quality session: short accelerations with an easy jog back. */
const QUALITY_STRIDES = 3;

function stridesBlock(): StepBlock {
	const stride = STRIDES[0]!;
	const jogBack = STRIDES[1]!;
	return {
		repeat: QUALITY_STRIDES,
		label: 'Strides',
		steps: [
			{
				kind: 'warmup',
				label: stride.name,
				durationSec: stride.durationSec,
				targetRpe: [4, 5],
				note: stride.why,
			},
			{
				kind: 'recovery',
				label: jogBack.name,
				durationSec: jogBack.durationSec,
				targetRpe: [2, 3],
				note: jogBack.why,
			},
		],
	};
}

function singleRunWorkout(
	type: SessionArchetype,
	distanceKm: number,
	paces?: TrainingPaces,
): StructuredWorkout {
	const p = paces ?? DEFAULT_PACES;
	return {
		blocks: [
			drillBlock('Dynamic warm-up', WARMUP_DRILLS.slice(1), 'warmup'),
			{
				repeat: 1,
				steps: [
					{
						kind: 'work',
						label: TITLE[type],
						distanceM: Math.round(distanceKm * 1000),
						durationSec: secsForM(distanceKm * 1000, p.easy[1]),
						targetPaceSecPerKm: paces?.easy,
						targetZone: 'Z2',
						targetRpe: type === 'long' ? [4, 5] : [3, 4],
						note:
							type === 'long'
								? 'Keep the first 10 minutes relaxed; settle into an even, easy rhythm.'
								: undefined,
					},
				],
			},
			drillBlock('Cool-down stretches', COOLDOWN_STRETCHES, 'cooldown'),
		],
		totalDistanceKm: distanceKm,
	};
}

function tempoWorkout(
	workKm: number,
	wuKm: number,
	cdKm: number,
	paces?: TrainingPaces,
): StructuredWorkout {
	const blocks: StepBlock[] = [
		raiseBlock(paces, wuKm),
		drillBlock('Dynamic warm-up', QUALITY_WARMUP_DRILLS, 'warmup'),
		stridesBlock(),
		{
			repeat: 1,
			label: 'Set',
			steps: [
				{
					kind: 'work',
					label: 'Tempo',
					distanceM: Math.round(workKm * 1000),
					durationSec: secsForM(workKm * 1000, (paces ?? DEFAULT_PACES).threshold),
					targetPaceSecPerKm: paces ? [paces.threshold * 0.99, paces.threshold * 1.03] : undefined,
					targetZone: 'Z3–Z4',
					targetRpe: [6, 7],
					note: 'Comfortably hard, with steady breathing and not gasping.',
				},
			],
		},
		{ repeat: 1, steps: [cooldownStep(paces, cdKm)] },
		drillBlock('Cool-down stretches', COOLDOWN_STRETCHES, 'cooldown'),
	];
	return {
		blocks,
		totalDistanceKm: round1(wuKm + workKm + cdKm),
	};
}

/** Easy / steady / hard band per session type (research/wave-4). */
function intensityFor(type: SessionArchetype): Intensity {
	switch (type) {
		case 'easy':
		case 'recovery':
		case 'mobility':
		case 'strides':
			return 'easy';
		case 'interval':
		case 'race-pace':
		case 'hills':
		case 'fartlek':
		case 'race':
			return 'hard';
		default:
			return 'steady';
	}
}

/** Goal race pace (sec/km) derived from the VDOT paces, per profile. */
function goalPaceFor(slug: string, paces: TrainingPaces): number {
	switch (slug) {
		case 'marathon':
			return paces.marathon;
		case 'half-marathon':
			return (paces.marathon + paces.threshold) / 2;
		case '10k':
			return paces.threshold;
		case '5k':
			return (paces.threshold + paces.interval) / 2;
		default:
			return paces.threshold;
	}
}

/** Race distance in km per goal profile, used to size the race session. */
const RACE_DISTANCE_KM: Record<string, number> = {
	marathon: 42.2,
	'half-marathon': 21.1,
	'10k': 10,
	'5k': 5,
};

/**
 * The share of a week the long run may take. Past this the week is one big run
 * and almost nothing else, so the plan grows the week instead of the long run.
 * It is deliberately at the loose end of the usual 25-35 percent, because a
 * runner whose base is light needs the long run to carry more of the week.
 */
const LONG_RUN_SHARE_CEILING = 0.5;

/** The most the long run, or the week that carries it, may grow in one step. */
const WEEKLY_STEP_CEILING = 0.1;

/**
 * How far a stepback week drops from the week before. The ramp builds for about
 * three weeks, then takes a lighter one, in base as well as build. It is a
 * stepback, not a collapse: a gentle drop that a next week can climb back from
 * keeps the plan moving forward while giving the body an easier week.
 */
const STEPBACK_FACTOR = 0.9;

/**
 * How much of the week one quality day takes, by goal. A 5K leans on quality, a
 * marathon on the long run instead. The long run's own share is not fixed here:
 * it falls as the week's volume rises (see longRunShare).
 */
const SESSION_SHAPE: Record<string, { quality: number }> = {
	marathon: { quality: 0.17 },
	'half-marathon': { quality: 0.19 },
	'10k': { quality: 0.24 },
	'5k': { quality: 0.26 },
	'whole-fitness': { quality: 0.12 },
	default: { quality: 0.16 },
};

/**
 * The long run's share of the week as volume rises. Research (wave-6, section 5)
 * found the share is not fixed: about 35 to 50 percent at low beginner volume,
 * about 25 to 30 percent at moderate to high volume, with a hard ceiling near 50
 * percent. So the share falls as the week grows. The ceiling itself stays
 * LONG_RUN_SHARE_CEILING below; this only sets the share a week starts from and
 * the floor it is held above, so at low volume the long run dominates as the
 * sources show and at high volume the week spreads out around it.
 */
const LONG_SHARE_LOW_VOLUME_KM = 25;
const LONG_SHARE_HIGH_VOLUME_KM = 75;
const LONG_SHARE_AT_LOW_VOLUME = 0.45;
const LONG_SHARE_AT_HIGH_VOLUME = 0.27;

function longRunShare(volumeKm: number): number {
	const t = clamp(
		(volumeKm - LONG_SHARE_LOW_VOLUME_KM) /
			(LONG_SHARE_HIGH_VOLUME_KM - LONG_SHARE_LOW_VOLUME_KM),
		0,
		1,
	);
	return LONG_SHARE_AT_LOW_VOLUME + t * (LONG_SHARE_AT_HIGH_VOLUME - LONG_SHARE_AT_LOW_VOLUME);
}

/**
 * Weekly volume (km) at which a midweek medium-long run earns its place.
 * Pfitzinger and Douglas (Advanced Marathoning) pair the long run with a medium-
 * long run of about 11 to 15 miles once weekly volume is in the 55-mile region,
 * so no single day carries the whole week (research/wave-6, sections 4 and 5,
 * item 6). Below this the week is better left as one long run plus easy days.
 */
const MEDIUM_LONG_MIN_VOLUME_KM = 70;
/** The medium-long run's share of the week, kept clearly under the long run. */
const MEDIUM_LONG_SHARE = 0.2;
/** The shortest an easy or recovery run may be, so no token jog is ever planned. */
const MIN_EASY_KM = 3.5;
const MEDIUM_LONG_TITLE = 'Medium-long run';

/**
 * Leave at least `minRest` true rest days in the week. The runner's available days
 * are a ceiling, not a target, so a runner who offers all seven still gets a rest
 * day. Research (wave-6, section 7): one to two rest days a week for most runners,
 * more for beginners, and no source schedules a zero-rest week. Days are dropped
 * from the middle so the long run at the week's end, and the recovery day after
 * it, stay put. Never drops below two running days.
 */
function withRestGap(days: number[], activeCross: number, minRest: number): number[] {
	const out = [...days];
	const limit = 7 - minRest;
	while (out.length + activeCross > limit && out.length > 2) {
		out.splice(Math.floor(out.length / 2), 1);
	}
	return out;
}

/**
 * The most hard sessions a set of days can hold while keeping two easy days
 * between each pair. Research (wave-6, section 1): hard sessions want two or
 * three easy days between them (Daniels: "2 or 3 E days between Q days"), so k
 * hard days need 3k-2 training days.
 */
function hardCapacity(dayCount: number): number {
	if (dayCount <= 0) return 0;
	return Math.floor((dayCount + 2) / 3);
}

/**
 * Choose a week's hard-session days from the non-long-run days. The set is spread
 * as widely as the week allows, keeping two easy days between hard sessions. The
 * day before the long run is avoided when the week still has room, since the long
 * run is already the heaviest single session (wave-6, section 3); when it does not,
 * the session is kept and stacked, which Higdon's Intermediate 1 does on purpose.
 * Returns at most hardCapacity(pool.length) days, so a short week holds fewer
 * hard sessions rather than crowding them together.
 */
function pickHardDays(pool: number[], count: number, longDay: number): number[] {
	const n = Math.min(count, hardCapacity(pool.length));
	if (n <= 0 || !pool.length) return [];
	// Prefer days that are not the day before the long run, when enough remain.
	const avoided = pool.filter((d) => d !== longDay - 1);
	const source = hardCapacity(avoided.length) >= n ? avoided : pool;
	if (n === 1) return [source[Math.floor((source.length - 1) / 2)]!];
	const out: number[] = [];
	for (let i = 0; i < n; i++) {
		out.push(source[Math.round((i * (source.length - 1)) / (n - 1))]!);
	}
	return [...new Set(out)];
}

/**
 * The goal race itself, on the race date: a short warm-up, the race at goal
 * pace, then a cool-down. This is the fixed event the whole plan points at, so
 * it is a session in its own right rather than a rehearsal in the last week.
 */
function raceSession(
	day: number,
	raceKm: number,
	goalPace: number,
	paces?: TrainingPaces,
): PlannedSession {
	const raceM = Math.round(raceKm * 1000);
	const workout: StructuredWorkout = {
		blocks: [
			raiseBlock(paces, 1),
			{
				repeat: 1,
				steps: [
					{
						kind: 'work',
						label: TITLE.race,
						distanceM: raceM,
						durationSec: secsForM(raceM, goalPace),
						targetPaceSecPerKm: [goalPace * 0.99, goalPace * 1.01],
						targetRpe: [8, 9],
						note: 'Hold your goal pace. Start controlled and finish strong.',
					},
				],
			},
			{ repeat: 1, steps: [cooldownStep(paces, 1)] },
			drillBlock('Cool-down stretches', COOLDOWN_STRETCHES, 'cooldown'),
		],
		totalDistanceKm: raceKm,
	};
	return {
		day,
		slot: 'AM',
		modality: 'running',
		type: 'race',
		title: TITLE.race,
		purpose: PURPOSE.race,
		prescription: {
			summary: `Race day: ${round1(raceKm)} km at your goal pace.`,
			targetDistanceKm: raceKm,
			targetPaceSecPerKm: [goalPace * 0.99, goalPace * 1.01],
			targetZone: 'Race effort',
			targetRpe: [8, 9],
			notes: 'Start controlled, settle into goal pace, finish strong.',
			workout,
		},
		durationMin: estDuration(raceKm, goalPace),
	};
}

/** Race-pace rep shape per profile (metres per rep; reps by phase). */
const RACE_PACE_SHAPE: Record<string, { distanceM: number; build: number; peak: number }> = {
	marathon: { distanceM: 5000, build: 2, peak: 3 },
	'half-marathon': { distanceM: 3000, build: 2, peak: 3 },
	'10k': { distanceM: 2000, build: 3, peak: 4 },
	'5k': { distanceM: 1000, build: 4, peak: 6 },
};

/** A repeated-rep running workout (warm-up → N × [work + recovery] → cool-down → stretches). */
function repWorkout(opts: {
	reps: number;
	distanceM: number;
	wuKm: number;
	cdKm: number;
	pace?: [number, number];
	fallbackPace: number;
	label: string;
	note: string;
	recoveryM?: number;
	recoveryPace?: [number, number];
	paces?: TrainingPaces;
}): StructuredWorkout {
	const recoveryM = opts.recoveryM ?? opts.distanceM;
	const workPace = opts.pace ? (opts.pace[0] + opts.pace[1]) / 2 : opts.fallbackPace;
	const recoveryPace = opts.recoveryPace
		? (opts.recoveryPace[0] + opts.recoveryPace[1]) / 2
		: (opts.paces ?? DEFAULT_PACES).easy[1];
	const blocks: StepBlock[] = [
		raiseBlock(opts.paces, opts.wuKm),
		drillBlock('Dynamic warm-up', QUALITY_WARMUP_DRILLS, 'warmup'),
		stridesBlock(),
		{
			repeat: opts.reps,
			label: 'Set',
			steps: [
				{
					kind: 'work',
					label: opts.label,
					distanceM: opts.distanceM,
					durationSec: secsForM(opts.distanceM, workPace),
					targetPaceSecPerKm: opts.pace,
					targetRpe: [8, 9],
					note: opts.note,
				},
				{
					kind: 'recovery',
					label: 'Recovery jog',
					distanceM: recoveryM,
					durationSec: secsForM(recoveryM, recoveryPace),
					targetPaceSecPerKm: opts.recoveryPace,
					targetRpe: [2, 3],
					note: 'Jog easily, or walk if you need more recovery.',
				},
			],
		},
		{ repeat: 1, steps: [cooldownStep(opts.paces, opts.cdKm)] },
		drillBlock('Cool-down stretches', COOLDOWN_STRETCHES, 'cooldown'),
	];
	return {
		blocks,
		totalDistanceKm: round1(
			opts.wuKm + opts.reps * ((opts.distanceM + recoveryM) / 1000) + opts.cdKm,
		),
	};
}

/**
 * A rep count and rep distance that fit a rep session inside its work budget, so
 * a quality day never overtakes the long run. When even one nominal rep does not
 * fit, the recovery and the rep shrink to fill the budget.
 */
function sizeReps(
	workBudgetKm: number,
	repM: number,
	recM: number,
	maxReps: number,
): { reps: number; repM: number; recM: number } {
	const perRep = (repM + recM) / 1000;
	const fit = Math.floor(workBudgetKm / perRep);
	if (fit >= 1) return { reps: Math.min(fit, maxReps), repM, recM };
	const slotM = Math.max(200, Math.round(workBudgetKm * 1000));
	const rec = Math.min(recM, Math.round(slotM * 0.4));
	const work = Math.max(200, slotM - rec);
	return { reps: 1, repM: work, recM: rec };
}

function intervalWorkout(
	reps: number,
	repM: number,
	recM: number,
	wuKm: number,
	cdKm: number,
	paces?: TrainingPaces,
): StructuredWorkout {
	return repWorkout({
		reps,
		distanceM: repM,
		wuKm,
		cdKm,
		pace: paces ? [paces.interval * 0.98, paces.interval * 1.02] : undefined,
		fallbackPace: (paces ?? DEFAULT_PACES).interval,
		label: 'Interval',
		note: 'Even, controlled reps. Stop the set if form breaks down.',
		recoveryM: recM,
		recoveryPace: paces?.easy,
		paces,
	});
}

function racePaceWorkout(
	profileSlug: string,
	reps: number,
	repM: number,
	recM: number,
	wuKm: number,
	cdKm: number,
	goalPace: number,
	paces?: TrainingPaces,
): StructuredWorkout {
	return repWorkout({
		reps,
		distanceM: repM,
		wuKm,
		cdKm,
		pace: [goalPace * 0.99, goalPace * 1.01],
		fallbackPace: goalPace,
		label: 'Goal pace',
		note: 'At your goal pace, with even splits and relaxed effort. This is what race day should feel like.',
		recoveryM: recM,
		recoveryPace: paces?.easy,
		paces,
	});
}

function hillsWorkout(
	reps: number,
	repM: number,
	recM: number,
	wuKm: number,
	cdKm: number,
	paces?: TrainingPaces,
): StructuredWorkout {
	return repWorkout({
		reps,
		distanceM: repM,
		wuKm,
		cdKm,
		pace: paces ? [paces.interval * 1.03, paces.interval * 1.12] : undefined,
		fallbackPace: (paces ?? DEFAULT_PACES).interval * 1.05,
		label: 'Hill rep',
		note: 'Power up with short, quick steps, then jog or walk down to recover.',
		recoveryM: recM,
		recoveryPace: paces?.easy,
		paces,
	});
}

function strengthWorkout(
	circuit: MachineExercise[],
	reps: number,
	sets: number,
): StructuredWorkout {
	const blocks: StepBlock[] = [
		drillBlock('Warm-up', WARMUP_DRILLS, 'warmup'),
		{
			repeat: 1,
			label: 'Circuit',
			steps: circuit.map<WorkoutStep>((m) => ({
				kind: 'work',
				label: m.name,
				machine: m.name,
				sets,
				reps,
				restSec: 75,
				targetRpe: [7, 8],
				note:
					m.pattern === 'plyometric'
						? `Explosive: stop the set when your speed drops. ${m.muscles.join(', ')}.`
						: `Rest ~60–90s between sets. ${m.muscles.join(', ')}.`,
			})),
		},
		drillBlock('Cool-down', COOLDOWN_STRETCHES, 'cooldown'),
	];
	return { blocks, estimatedDurationMin: 50 };
}

/* ------------------------------- engine ---------------------------------- */

/** The runner's own name for a sport or activity, e.g. "bike" becomes "Bike". */
function activityLabel(slug: string): string {
	return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * The runner's first favorite library workout of a modality, in the order they
 * listed them, so a favorite only applies where it fits the slot. A favorite of
 * another modality is not suitable and the engine keeps its own pick.
 */
function favoriteWorkout(
	input: PlanInput,
	modality: LibraryWorkout['modality'],
): LibraryWorkout | undefined {
	if (!input.favoriteWorkouts?.length) return undefined;
	for (const id of input.favoriteWorkouts) {
		const workout = WORKOUT_LIBRARY.find((w) => w.id === id);
		if (workout && workout.modality === modality) return workout;
	}
	return undefined;
}

/** A favorite library workout of a modality and a type, so a run or cross-train
 * session only borrows a favorite that matches what the slot is for. */
function favoriteWorkoutFor(
	input: PlanInput,
	modality: LibraryWorkout['modality'],
	type: string,
): LibraryWorkout | undefined {
	if (!input.favoriteWorkouts?.length) return undefined;
	for (const id of input.favoriteWorkouts) {
		const workout = WORKOUT_LIBRARY.find((w) => w.id === id);
		if (workout && workout.modality === modality && workout.type === type) return workout;
	}
	return undefined;
}

/**
 * Use the runner's favorite library workout for a run or cross-train session
 * when one matches the session's type, so favorites reach those sessions too and
 * not only strength and mobility. The session's own distance and pace targets
 * stay with the plan; only the shape, title and summary come from the favorite.
 */
function withFavoriteWorkout(session: PlannedSession, input: PlanInput): PlannedSession {
	const isRun = session.modality === 'running';
	const isCross = session.modality === 'recovery' && session.type === 'cross-train';
	if (!isRun && !isCross) return session;
	const favorite = favoriteWorkoutFor(input, session.modality, session.type);
	if (!favorite) return session;
	return {
		...session,
		title: favorite.title,
		purpose: favorite.purpose,
		durationMin: favorite.durationMin,
		prescription: {
			...session.prescription,
			summary: favorite.summary,
			targetRpe: favorite.targetRpe ?? session.prescription.targetRpe,
			workout: favorite.workout,
		},
	};
}

/**
 * The moves of a favorite strength workout, when the runner has one and every
 * move fits their kit. Undefined means the favorite is missing or not suitable,
 * so the caller falls back to the generated circuit.
 */
function favoriteStrengthMoves(input: PlanInput): MachineExercise[] | undefined {
	const favorite = favoriteWorkout(input, 'strength');
	if (!favorite) return undefined;
	const names = favorite.workout.blocks
		.flatMap((b) => b.steps)
		.filter((s) => s.kind === 'work')
		.map((s) => s.label);
	const seen = new Set<string>();
	const moves: MachineExercise[] = [];
	for (const name of names) {
		if (seen.has(name)) continue;
		const move = findMove(name);
		if (!move || !moveAvailable(move, input.equipment, input.machines)) return undefined;
		seen.add(name);
		moves.push(move);
	}
	return moves.length ? moves : undefined;
}

export function generatePlan(input: PlanInput): PlanDraft {
	// The runner's available training days, 0 = Monday. Sorted and deduped, with a
	// sensible Mon/Wed/Fri default when none are given.
	const allDays = (
		[...new Set(input.availableDays)].length ? [...new Set(input.availableDays)] : [0, 2, 4]
	).sort((a, b) => a - b);
	const startWeekday = weekdayIndex(input.startDate);
	// Week one begins on the start day and every later week follows it, so a
	// Wednesday start reads Wednesday to Tuesday. A session carries a day offset
	// from its week's first day, mapped once from the runner's weekday choices at
	// the end, so the same weekday lands on the same real weekday in every week
	// whatever day the plan starts on.
	const toOffset = (weekday: number) => (weekday - startWeekday + 7) % 7;

	// The race date drives the length: the final week's last day lands on or after
	// it, so the last week always covers race day. Without a race the profile's
	// default length applies. Below four weeks the plan is still extended to four,
	// and past thirty it is cut to thirty; both surface a warning rather than
	// changing length silently.
	const warnings: string[] = [];
	let buildWeeks: number;
	let raceWeekIndex: number | undefined;
	if (input.targetDate) {
		const spanDays = daysBetween(input.startDate, input.targetDate);
		const rawWeeks = Math.ceil((spanDays + 1) / 7);
		// A short run-in keeps its own length rather than being padded out before
		// the race, because padding there would put the taper after the finish. A
		// very long run-in is cut at thirty weeks, and the race falls past the plan.
		buildWeeks = clamp(rawWeeks, 1, 30);
		raceWeekIndex = Math.floor(spanDays / 7);
		if (rawWeeks < 4) {
			warnings.push(
				'Your race is under four weeks away, so this plan runs for four. Treat it as a sharpening block more than a build.',
			);
		} else if (rawWeeks > 30) {
			warnings.push(
				'Your race is over thirty weeks away, so this plan stops at thirty. The final weeks before race day are not covered.',
			);
		}
	} else {
		buildWeeks = clamp(input.profile.defaultWeeks, 4, 30);
	}
	// The build ends at the race. The easy weeks the goal asks for follow it, so the
	// plan does not stop dead at the finish line. They are added only when the plan
	// actually covers the race, and a short run-in gets its padding to four weeks as
	// easy weeks too, not as training before the start.
	const raceCovered =
		raceWeekIndex !== undefined && raceWeekIndex >= 0 && raceWeekIndex < buildWeeks;
	const recoveryWeeks =
		input.targetDate && raceCovered
			? (input.profile.recoveryWeeks ?? 0) + Math.max(0, 4 - buildWeeks)
			: 0;
	const totalWeeks = buildWeeks + recoveryWeeks;
	const phases = [
		...phaseSequence(input.profile.progressionRules, buildWeeks),
		...Array.from({ length: recoveryWeeks }, () => 'recovery'),
	];
	const { volumes, longKm: longTargets, warnings: shapeWarnings } = planTargets(input, phases);
	warnings.push(...shapeWarnings);

	// A given race time is the most trustworthy anchor. Failing that, an effective
	// VDOT read from the runner's own logged hard efforts, so paces follow what
	// they have actually been running.
	const measured = vdotFromBaseline(input.baseline.recentTimes);
	const derived = input.baseline.effectiveVdot;
	const vdot =
		measured ??
		(typeof derived === 'number' && derived >= VDOT_MIN && derived <= VDOT_MAX
			? derived
			: undefined);
	const paces: TrainingPaces | undefined = vdot ? pacesFromVdot(vdot) : undefined;
	const easyPace = paces ? (paces.easy[0] + paces.easy[1]) / 2 : 360; // ~6:00/km fallback

	// Each sport or activity on its own days: the running keeps off them, and a
	// named cross-training session takes their place.
	const crossPairs: { day: number; activity: string }[] = [];
	for (const entry of input.baseline.crossTrainingSchedule ?? []) {
		for (const d of entry.days ?? []) {
			if (allDays.includes(d)) crossPairs.push({ day: d, activity: entry.activity });
		}
	}
	const crossDays = [...new Set(crossPairs.map((p) => p.day))].sort((a, b) => a - b);
	const runDays = allDays.filter((d) => !crossDays.includes(d));
	const rawDays = runDays.length >= 2 ? runDays : allDays;
	// Keep at least one true rest day, and two for beginners (research/wave-6,
	// section 7: no source schedules a zero-rest week).
	const minRestDays = (input.baseline.experience ?? 'beginner') === 'beginner' ? 2 : 1;
	const days = withRestGap(rawDays, crossDays.length, minRestDays);
	const longDay = days[days.length - 1]!;
	const rest = days.slice(0, -1);

	const requestedStrength = input.baseline.strengthDays;
	const strengthCount =
		requestedStrength && requestedStrength > 0
			? clamp(Math.round(requestedStrength), 1, 3)
			: input.profile.slug === 'whole-fitness'
				? Math.min(3, Math.max(1, Math.floor(days.length / 2)))
				: 2;

	// Goal race pace, and the weekday the race falls on, shared by every week's
	// quality picks and by the race session itself.
	const goalPace = goalPaceFor(input.profile.slug, paces ?? DEFAULT_PACES);
	const raceDay = input.targetDate ? weekdayIndex(input.targetDate) : undefined;

	const weeks: PlannedWeek[] = [];
	// The same window problem repeats every week, so placement notes are gathered
	// here and deduped into one warning each before they reach meta.warnings.
	const unplacedSessions: UnplacedSession[] = [];
	let noWindowsOnTrainingDays = false;
	// The biggest long run the build reaches, so a week can say where its long
	// run sits on the plan's arc. The taper is left out of the peak.
	const peakLongKm = Math.max(...longTargets.slice(0, Math.max(1, buildWeeks)));
	let prevVolumeKm: number | undefined;
	for (let w = 0; w < totalWeeks; w++) {
		const phase = phases[w]!;
		const isRecovery = phase === 'recovery';
		// The model may hold or ease a single week (a coach-like microcycle). The
		// numbers stay deterministic: an intent only scales or holds the plan's own
		// curve, never sets a distance, and a taper or recovery week is left alone.
		const intent = input.weekShapes?.[w]?.volumeIntent;
		// The model may lean the week's strength and mobility in the same bounded
		// way. Each only nudges the engine's own plan for that modality: strength
		// moves its sets by one notch and mobility its frequency by one session, and
		// neither touches a running distance or the week's structure.
		const strengthIntent = input.weekShapes?.[w]?.strengthIntent;
		const mobilityIntent = input.weekShapes?.[w]?.mobilityIntent;
		const shaped = phase !== 'taper' && !isRecovery;
		let volume = volumes[w]!;
		if (shaped && intent === 'ease') volume = volume * 0.9;
		else if (shaped && intent === 'hold') {
			volume = Math.min(volumes[w - 1] ?? volume, volume);
		}
		if (isRecovery) {
			// The easy weeks that follow the race come down from the peak the
			// build actually reached, not the internal curve. When the prescribed
			// weeks run lighter than the curve, the curve peak would make a
			// recovery week heavier than any real week. The first is the lightest
			// and none is heavier than the plan's own best week.
			const buildPeak = Math.max(
				5,
				...weeks
					.filter(
						(wk) => wk.phase === 'base' || wk.phase === 'build' || wk.phase === 'peak',
					)
					.map((wk) => wk.targetVolumeKm),
			);
			const recoveryIdx = phases.slice(0, w).filter((p) => p === 'recovery').length;
			volume = clamp(round1(buildPeak * (0.3 + 0.15 * recoveryIdx)), 5, buildPeak);
		}
		volume = clamp(round1(volume), 5, 160);
		// Each week is seven days from the start day: week one runs from the chosen
		// start date, and every later week follows it, so the stored dates roll with
		// the start day rather than snapping to a Monday.
		const weekStart = addDays(input.startDate, w * 7);
		const weekEnd = addDays(weekStart, 6);
		let strengthLeft = strengthCount;

		// A profile with no hard session types (general fitness) never gets a
		// quality day. Every other profile keeps a constant number of quality slots
		// across the whole plan, so the week's run days never change shape: in base
		// and taper one slot runs hard (the rest stay easy), and the first week eases
		// in with every slot easy. A constant shape means the week's volume follows
		// the plan curve instead of jumping the week quality starts.
		const hasQuality = input.profile.sessionTypes.some((t) =>
			['tempo', 'interval', 'hills', 'race-pace', 'threshold', 'strides', 'fartlek'].includes(t),
		);
		// Beginners get at most one hard session a week, everyone else up to two:
		// the research ceiling for 5K and 10K and for intermediate runners
		// (research/wave-6, section 1 and the constants list).
		const experience = input.baseline.experience ?? 'beginner';
		const qualityCap = hasQuality ? (experience === 'beginner' ? 1 : 2) : 0;
		// The day after the long run is the recovery day. When the long run sits on
		// the week's last day and the first run day follows it directly, that first
		// day is kept off the hard work (research/wave-6, sections 2 and 3: the day
		// after a long run is rest, easy or cross-training, not a hard session).
		const recoveryDay = !isRecovery && longDay === 6 && days.includes(0) ? 0 : undefined;
		// Hard sessions are chosen from the non-long-run days, keeping two easy days
		// between them and staying off the recovery day.
		const hardPool = rest.filter((d) => d !== recoveryDay);
		const qualitySlots = Math.min(qualityCap, hardCapacity(hardPool.length));
		const hardCount = isRecovery
			? 0
			: w === 0
				? 0
				: phase === 'base' || phase === 'taper'
					? Math.min(1, qualitySlots)
					: Math.min(2, qualitySlots);
		const slotDays = pickHardDays(hardPool, qualitySlots, longDay);
		const qualityDays = slotDays.slice(0, hardCount);
		const softDays = slotDays.filter((d) => !qualityDays.includes(d));
		// The long run is its own arc: the goal-aware target the plan worked out for
		// this week, held inside a sane share of the week so a light week is never
		// one long run and little else. A recovery week carries no long run. An eased
		// week dips it too, the way a deload does, so easing a week lowers what it
		// prescribes rather than leaving the long run at the plan's full arc.
		const longEase = shaped && intent === 'ease' ? 0.9 : 1;
		let longKm = isRecovery
			? 0
			: round1(
					clamp(Math.min(longTargets[w]! * longEase, volume * LONG_RUN_SHARE_CEILING), 3, 38),
				);
		// A recovery week carries no long run, so the long-run day is not reserved:
		// it can take an easy run, so the easy runs cover the whole week rather than
		// leaving that day empty. Otherwise the long run, the quality slots and the
		// recovery day are reserved for running, so strength never takes them.
		const reservedRunDays = isRecovery
			? [...slotDays]
			: [longDay, ...slotDays, ...(recoveryDay !== undefined ? [recoveryDay] : [])];
		const usedForRun = new Set(reservedRunDays);
		const runFree = days.filter((d) => !usedForRun.has(d));

		// Strength gets its own days, never sharing with a run, and takes them before
		// the remaining days become easy runs. A week with a long run still needs an
		// easy run to hold the other half of it: when the quality slots are the only
		// other runs, the long run would be well over half of what the runner sees,
		// so a strength day yields to an easy run instead.
		const wantStrength = isRecovery ? 0 : Math.min(strengthLeft, runFree.length);
		let strengthDays = runFree.slice(0, wantStrength);
		let easyDays = [
			...softDays,
			...(recoveryDay !== undefined ? [recoveryDay] : []),
			...runFree.slice(wantStrength),
		];
		const nonLongRuns =
			qualityDays.length +
			softDays.length +
			(recoveryDay !== undefined ? 1 : 0) +
			(runFree.length - wantStrength);
		if (
			longKm > 0 &&
			nonLongRuns <= 1 &&
			strengthDays.length >= 1 &&
			(hasQuality || strengthDays.length >= 2)
		) {
			strengthDays = strengthDays.slice(0, -1);
			easyDays = [
				...softDays,
				...(recoveryDay !== undefined ? [recoveryDay] : []),
				...runFree.slice(strengthDays.length),
			];
		}
		strengthLeft -= strengthDays.length;

		const load = sportLoad(input);
		const qualityShare = SESSION_SHAPE[input.profile.slug]?.quality ?? SESSION_SHAPE.default!.quality;
		// One quality day's whole distance, held under the long run so the long run
		// is always the longest run and a light week is not one giant quality day.
		const qualityRaw = clamp(volume * qualityShare, 1.6, 16);
		const qualityDayKm = round1(Math.min(qualityRaw, longKm * 0.85));
		// A very heavy sport week takes a slice off the quality work. The long run
		// is left whole, since endurance is the point.
		const qualityKm = round1(load.veryHeavy ? qualityDayKm * 0.85 : qualityDayKm);
		const qualityWhy = load.veryHeavy
			? `Shortened by about 15 percent. In the last week you logged ${load.describe}, and the long run stays whole.`
			: undefined;
		// At higher volume a midweek medium-long run spreads the aerobic work so no
		// single day carries the week. Pfitzinger and Douglas pair it with the long
		// run once weekly volume is around 55 miles (research/wave-6, sections 4 and
		// 5, item 6); below that the week is one long run plus easy days, and the day
		// after the long run is kept light.
		const mediumLongCandidates = easyDays.filter(
			(d) => d !== recoveryDay && d !== longDay - 1 && d !== longDay,
		);
		const mediumLongDay =
			!isRecovery && volume >= MEDIUM_LONG_MIN_VOLUME_KM && mediumLongCandidates.length
				? mediumLongCandidates[mediumLongCandidates.length - 1]
				: undefined;
		const mediumLongKm =
			mediumLongDay !== undefined
				? round1(clamp(volume * MEDIUM_LONG_SHARE, 8, Math.min(longKm - 0.5, 24)))
				: 0;
		// A recovery week has no long run, so its easy runs take the whole week.
		// Otherwise an easy run may reach just under the long run, so a week with
		// few other runs (a short week, or a cross-heavy one) can still hold the
		// long run to half of what the runner sees. The long run stays the longest.
		const easyCap = isRecovery
			? Math.max(1, round1(volume))
			: Math.max(1, round1(longKm - 0.1));
		const otherEasyDays = easyDays.filter((d) => d !== mediumLongDay);
		// Quality bookends scale with the session, and the reps fill what is left.
		const { wu: qWu, cd: qCd } = qualityWarmupCooldown(qualityKm);
		const qualityWorkKm = Math.max(0.6, round1(qualityKm - qWu - qCd));

		const sessions: PlannedSession[] = [];

		// long run
		if (!isRecovery) {
			sessions.push({
				day: longDay,
				slot: 'AM',
				modality: 'running',
				type: 'long',
				title: TITLE.long,
				purpose: PURPOSE.long,
				prescription: {
					summary: 'Long run, easy and even.',
					targetDistanceKm: longKm,
					targetPaceSecPerKm: paces ? paces.easy : undefined,
					targetZone: 'Z2',
					targetRpe: [4, 5],
					workout: singleRunWorkout('long', longKm, paces),
				},
				durationMin: estDuration(longKm, paces ? paces.easy[1] : easyPace + 15),
			});
		}

		// quality sessions
		qualityDays.forEach((day, qi) => {
			let kind: 'race-pace' | 'interval' | 'tempo' | 'hills';
			const shaped = input.weekShapes?.[w]?.qualityKind;
			if (shaped && input.profile.sessionTypes.includes(shaped)) {
				// The model's choice, when the profile allows it.
				kind = shaped;
			} else if (
				(phase === 'build' || phase === 'peak') &&
				qi === 1 &&
				input.profile.slug !== 'whole-fitness' &&
				input.profile.sessionTypes.includes('race')
			) {
				kind = 'race-pace';
			} else if (
				phase !== 'base' &&
				phase !== 'taper' &&
				input.profile.sessionTypes.includes('interval')
			) {
				kind = 'interval';
			} else if (
				input.baseline.terrain === 'hilly' &&
				qi === 0 &&
				input.profile.sessionTypes.includes('hills')
			) {
				kind = 'hills';
			} else {
				// A gentle base or taper session, or the default. Pick a kind the
				// profile actually lists, so a profile is never handed a hard session
				// it does not allow (a 5K, for example, lists no tempo work).
				kind =
					(['tempo', 'hills', 'interval', 'race-pace'] as const).find((k) =>
						input.profile.sessionTypes.includes(k),
					) ?? 'tempo';
			}

			// A gentle nudge from the runner's own feedback: if the kind the engine
			// landed on is one they rated down, and one they rated up is allowed here,
			// prefer the liked kind. The model's choice, when it made one, stands.
			if (!shaped && input.baseline.dislikedTypes?.includes(kind)) {
				const liked = (['tempo', 'hills', 'interval', 'race-pace'] as const).find(
					(k) => input.profile.sessionTypes.includes(k) && input.baseline.likedTypes?.includes(k),
				);
				if (liked) kind = liked;
			}

			if (kind === 'race-pace') {
				const rpShape = RACE_PACE_SHAPE[input.profile.slug] ?? RACE_PACE_SHAPE['half-marathon']!;
				const maxReps = phase === 'peak' ? rpShape.peak : rpShape.build;
				const { reps, repM, recM } = sizeReps(
					qualityWorkKm,
					rpShape.distanceM,
					Math.min(800, rpShape.distanceM),
					maxReps,
				);
				const workout = racePaceWorkout(
					input.profile.slug,
					reps,
					repM,
					recM,
					qWu,
					qCd,
					goalPace,
					paces,
				);
				const total = workout.totalDistanceKm ?? qualityKm;
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'race-pace',
					title: TITLE['race-pace'],
					purpose: PURPOSE['race-pace'],
					prescription: {
						summary: 'Goal-pace reps at your target pace.',
						targetDistanceKm: total,
						targetPaceSecPerKm: [goalPace * 0.99, goalPace * 1.01],
						targetRpe: [7, 8],
						notes: 'Even splits at goal pace. Rehearsal for race day.',
						workout,
						why: qualityWhy,
					},
					durationMin: Math.round((total * goalPace) / 60),
				});
			} else if (kind === 'interval') {
				const { reps, repM, recM } = sizeReps(qualityWorkKm, 800, 400, 12);
				const workout = intervalWorkout(reps, repM, recM, qWu, qCd, paces);
				const total = workout.totalDistanceKm ?? qualityKm;
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'interval',
					title: TITLE.interval,
					purpose: PURPOSE.interval,
					prescription: {
						summary: 'Interval reps at interval pace, with easy recovery between.',
						targetDistanceKm: total,
						targetPaceSecPerKm: paces ? [paces.interval * 0.98, paces.interval * 1.02] : undefined,
						targetRpe: [8, 9],
						notes: 'Even reps; stop the set if form breaks down.',
						workout,
						why: qualityWhy,
					},
					durationMin: estDuration(total, paces ? paces.interval : easyPace - 60) + 10,
				});
			} else if (kind === 'hills') {
				const { reps, repM, recM } = sizeReps(qualityWorkKm, 400, 400, 16);
				const workout = hillsWorkout(reps, repM, recM, qWu, qCd, paces);
				const total = workout.totalDistanceKm ?? qualityKm;
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'hills',
					title: TITLE.hills,
					purpose: PURPOSE.hills,
					prescription: {
						summary: 'Hill reps at hard effort, jog or walk down to recover.',
						targetDistanceKm: total,
						targetRpe: [8, 9],
						notes: 'Power up with short, quick steps. Relax on the way down.',
						workout,
						why: qualityWhy,
					},
					durationMin: estDuration(total, paces ? paces.interval : easyPace - 60) + 10,
				});
			} else {
				const workout = tempoWorkout(qualityWorkKm, qWu, qCd, paces);
				const total = workout.totalDistanceKm ?? qualityKm;
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'tempo',
					title: TITLE.tempo,
					purpose: PURPOSE.tempo,
					prescription: {
						summary: 'Continuous work at threshold pace.',
						targetDistanceKm: total,
						targetPaceSecPerKm: paces
							? [paces.threshold * 0.99, paces.threshold * 1.03]
							: undefined,
						targetZone: 'Z3–Z4',
						targetRpe: [6, 7],
						workout,
						why: qualityWhy,
					},
					durationMin: estDuration(total, paces ? paces.threshold : easyPace - 30),
				});
			}
		});

		// Easy runs take what is left, never a token jog: the shortest is a real
		// recovery run of about MIN_EASY_KM, and the day after the long run is one
		// of these (research/wave-6, section 2). Sizing from the quality work that
		// was actually built, not its target, keeps the long run at or under half
		// of the week the runner sees.
		const qualitySum = round1(
			sessions
				.filter((s) => s.modality === 'running' && s.type !== 'long')
				.reduce((sum, s) => sum + (s.prescription.targetDistanceKm ?? 0), 0),
		);
		const leftover = Math.max(0, round1(volume - longKm - qualitySum - mediumLongKm));
		const easyPer =
			otherEasyDays.length && leftover > 0
				? round1(
						clamp(leftover / otherEasyDays.length, Math.min(MIN_EASY_KM, easyCap), easyCap),
					)
				: 0;

		// easy runs: the midweek medium-long run at higher volume, the short recovery
		// run the day after the long run, and the rest as plain easy runs
		easyDays.forEach((day) => {
			if (day === mediumLongDay && mediumLongKm > 0) {
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'easy',
					title: MEDIUM_LONG_TITLE,
					purpose: PURPOSE.long,
					prescription: {
						summary: 'A longer midweek easy run, steady and comfortable.',
						targetDistanceKm: mediumLongKm,
						targetPaceSecPerKm: paces ? paces.easy : undefined,
						targetZone: 'Z2',
						targetRpe: [4, 5],
						workout: singleRunWorkout('easy', mediumLongKm, paces),
					},
					durationMin: estDuration(mediumLongKm, easyPace),
				});
				return;
			}
			if (easyPer > 0) {
				const afterLongRun = day === recoveryDay;
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'easy',
					title: TITLE.easy,
					purpose: PURPOSE.easy,
					prescription: {
						summary: afterLongRun
							? 'Easy recovery run, short and very easy.'
							: 'Easy run, conversational.',
						targetDistanceKm: easyPer,
						targetPaceSecPerKm: paces ? paces.easy : undefined,
						targetZone: 'Z2',
						targetRpe: [3, 4],
						notes: afterLongRun
							? 'The day after your long run. If you are sore, rest or cross-train easily for 30 to 60 minutes instead.'
							: undefined,
						workout: singleRunWorkout('easy', easyPer, paces),
					},
					durationMin: estDuration(easyPer, easyPace),
				});
			}
		});

		// Strength on its own days, in the morning.
		for (const day of strengthDays) {
			sessions.push(strengthSession(day, 'AM', phase, input, strengthIntent));
		}

		// Cross-training: when the user has it and the profile allows it, swap the
		// last easy run for a low-impact session, sparing the running legs.
		if (
			!crossDays.length &&
			input.baseline.crossTraining?.length &&
			input.profile.sessionTypes.includes('cross-train')
		) {
			const idx = [...sessions]
				.reverse()
				.findIndex((s) => s.type === 'easy' && s.title !== MEDIUM_LONG_TITLE);
			if (idx >= 0) {
				const realIdx = sessions.length - 1 - idx;
				const easy = sessions[realIdx]!;
				// Name the sport the runner actually picked, so the added session
				// reads as their workout rather than the bare type label.
				const title = activityLabel(input.baseline.crossTraining[0]!);
				sessions[realIdx] = {
					...easy,
					modality: 'recovery',
					type: 'cross-train',
					title,
					purpose: PURPOSE['cross-train'],
					prescription: {
						summary: 'Low-impact aerobic work: bike, pool or rower, easy and continuous.',
						intensity: 'easy',
						targetRpe: [3, 4],
						notes: `Use what you have (${input.baseline.crossTraining.join(', ')}). Keep it easy.`,
					},
				};
			}
		}

		// Mobility / stretching on a rest day, when the user asked for it there.
		// The sport itself, on its day, named.
		for (const { day: d, activity } of crossPairs) {
			const title = activityLabel(activity);
			sessions.push({
				day: d,
				slot: 'AM',
				modality: 'recovery',
				type: 'cross-train',
				title,
				purpose: PURPOSE['cross-train'],
				prescription: {
					summary: 'The sport you play, as part of the week.',
					intensity: 'steady',
					targetRpe: [4, 7],
					notes: `Play as you normally would. We keep the running off ${title} day so it does not stack.`,
				},
				durationMin: 45,
			});
		}

		// Mobility follows the flexibility gap. The gap sets how often and how much
		// (one short session for a small gap, a session every day for the biggest),
		// and a big gap also aims the routine at the runner's terrain, niggles and
		// sports. The rules and the routine data live in mobility-plan.ts.
		const flex = input.baseline.flexibility;
		const flexGap = flex ? Math.max(0, flex.goal - flex.current) : 0;
		const mobility = mobilityPrescription(flexGap, input.baseline);
		if (mobility && phase !== 'taper') {
			// The gap sets how often the runner stretches; the model may lean that
			// frequency by one session either way, kept inside the week. A favorite
			// mobility workout sets which routine, so the plan names the one they chose.
			const perWeek = clamp(
				mobility.perWeek + (mobilityIntent === 'build' ? 1 : mobilityIntent === 'ease' ? -1 : 0),
				0,
				7,
			);
			const routineId = favoriteWorkout(input, 'mobility')?.id ?? mobility.libraryId;
			// Mobility is short, so it pairs with a day that already has a session,
			// easing onto an easy or strength day first. A rest day is the fallback.
			const rank = (d: number) => {
				const types = sessions.filter((s) => s.day === d).map((s) => s.type);
				if (types.some((t) => t === 'easy')) return 0;
				if (types.some((t) => t === 'machine-circuit' || t === 'full-body-strength')) return 1;
				if (types.length) return 2;
				return 3;
			};
			const candidates = [2, 4, 1, 3, 0, 5, 6].sort((a, b) => rank(a) - rank(b));
			let added = 0;
			for (const d of candidates) {
				if (added >= perWeek) break;
				const slot = sessions.some((s) => s.day === d) ? 'PM' : 'AM';
				sessions.push(mobilitySession(d, routineId, slot));
				added++;
			}
		}

		// The goal race itself, on the target weekday of the week that holds it.
		// The race is a fixed calendar event, so it sits on that weekday even when
		// it is not one of the runner's usual training days, and any session that
		// would otherwise land on race day steps aside.
		if (
			raceWeekIndex !== undefined &&
			raceWeekIndex >= 0 &&
			raceDay !== undefined &&
			w === raceWeekIndex &&
			input.profile.sessionTypes.includes('race')
		) {
			const raceKm = RACE_DISTANCE_KM[input.profile.slug];
			if (raceKm) {
				for (let i = sessions.length - 1; i >= 0; i--) {
					if (sessions[i]!.day === raceDay) sessions.splice(i, 1);
				}
				sessions.push(raceSession(raceDay, raceKm, goalPace, paces));
			}
		}

		// The long run is held to half the week's curve, but the race can push a
		// training session off its day, leaving the long run most of a lighter
		// week. On that week the long run gives way to whatever runs are left, so
		// it is never more than half of what the runner sees.
		if (longKm > 0) {
			const otherRunKm = round1(
				sessions
					.filter((s) => s.modality === 'running' && s.type !== 'long' && s.type !== 'race')
					.reduce((sum, s) => sum + (s.prescription.targetDistanceKm ?? 0), 0),
			);
			if (otherRunKm + 0.1 < longKm) {
				const longIdx = sessions.findIndex((s) => s.type === 'long');
				// A run left under MIN_EASY_KM is a token jog, not a long run, so the
				// week simply carries none.
				if (longIdx >= 0 && otherRunKm >= MIN_EASY_KM) {
					const long = sessions[longIdx]!;
					long.prescription.targetDistanceKm = otherRunKm;
					long.prescription.workout = singleRunWorkout('long', otherRunKm, paces);
					long.durationMin = estDuration(otherRunKm, paces ? paces.easy[1] : easyPace + 15);
					longKm = otherRunKm;
				} else if (longIdx >= 0) {
					sessions.splice(longIdx, 1);
					longKm = 0;
				} else {
					longKm = otherRunKm;
				}
			}
		}

		// Fit the week's sessions into the runner's blocked-out windows, when they
		// gave any. This only sets a start time, and moves a session to another day
		// only when its own day has windows that cannot hold it. With no schedule
		// it is a no-op, so the plan is exactly what it is without one.
		const placement = placeSessions(sessions, input.schedule, allDays);
		unplacedSessions.push(...placement.unplaced);
		noWindowsOnTrainingDays ||= placement.noWindowsOnTrainingDays;

		// Sessions were placed on weekdays above. Store each one as an offset from
		// its week's first day, so the same offset names the same date and the week
		// rolls with the start day.
		const withIntensity = placement.sessions.map((s) => {
			const withFavorite = withFavoriteWorkout(s, input);
			return {
				...withFavorite,
				day: toOffset(withFavorite.day),
				prescription: {
					...withFavorite.prescription,
					intensity: withFavorite.prescription.intensity ?? intensityFor(withFavorite.type),
				},
			};
		});

		// Explain each session from what the plan actually decided. The composition
		// is pure (see why.ts): it reads the phase and week focus, the goal and how
		// far the race is, where the week sits on the long-run arc, the week's volume
		// intent and the sessions on the days either side. It never changes a
		// distance, a day or a start time.
		const weekWhy: SessionWeekContext = {
			weekNumber: w + 1,
			totalWeeks,
			phase,
			focus: FOCUS[phase] ?? phase,
			volumeKm: volume,
			prevVolumeKm,
			longKm,
			peakLongKm,
			longRunDips: w > 0 && longTargets[w]! < longTargets[w - 1]!,
			volumeIntent: input.weekShapes?.[w]?.volumeIntent,
			loadNote: input.weekShapes?.[w]?.loadNote,
		};
		const goalWhy: SessionGoalContext | undefined = input.targetDate
			? {
					name: input.profile.name,
					weeksToRace: Math.round(daysBetween(weekStart, input.targetDate) / 7),
				}
			: undefined;
		const explained = withIntensity.map((s) => {
			const whyStructured = composeSessionWhy({
				session: s,
				weekSessions: withIntensity,
				week: weekWhy,
				goal: goalWhy,
			});
			return whyStructured ? { ...s, prescription: { ...s.prescription, whyStructured } } : s;
		});
		prevVolumeKm = volume;

		weeks.push({
			weekNumber: w + 1,
			phase,
			focus: FOCUS[phase] ?? phase,
			startDate: weekStart,
			endDate: weekEnd,
			// The week's training distance, summed from the sessions as planned. The
			// race is the goal, not training load, so it is left out of the number.
			targetVolumeKm: round1(
				explained
					.filter((s) => s.modality === 'running' && s.type !== 'race')
					.reduce((sum, s) => sum + (s.prescription.targetDistanceKm ?? 0), 0),
			),
			sessions: explained.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot)),
		});
	}

	warnings.push(...scheduleWarnings(unplacedSessions, noWindowsOnTrainingDays));

	return {
		profileSlug: input.profile.slug,
		weeks,
		meta: {
			totalWeeks,
			startDate: input.startDate,
			targetDate: input.targetDate,
			vdot,
			baseWeeklyKm: baseWeeklyKm(input),
			...(warnings.length ? { warnings } : {}),
		},
	};
}

/**
 * The sets a strength session runs, from the runner's level, nudged one notch by
 * the model's week emphasis. The model only names an intent; the engine owns the
 * count and keeps it in a sane band, so a shaped week never writes a number.
 */
function strengthSetCount(level: string, intent?: StrengthIntent): number {
	const base = level === 'beginner' ? 2 : level === 'advanced' ? 4 : 3;
	const delta = intent === 'build' ? 1 : intent === 'ease' ? -1 : 0;
	return clamp(base + delta, 2, 5);
}

function strengthSession(
	day: number,
	slot: string,
	phase: string,
	input: PlanInput,
	strengthIntent?: StrengthIntent,
): PlannedSession {
	const mode = input.baseline.equipment ?? 'machines';
	const level = input.baseline.experience ?? 'beginner';
	const load = sportLoad(input);
	const heavySport = load.heavy;
	const loaded = phase !== 'base';
	// A favorite strength workout wins when the runner has one and it fits, since
	// it is their own choice of session. Otherwise the generated circuit prefers
	// their favorite machines, then falls back to the usual balanced pick.
	const fullCircuit =
		favoriteStrengthMoves(input) ??
		circuitFor(
			mode,
			input.baseline.sessionMinutes,
			input.equipment,
			loaded,
			level,
			input.machines,
			input.favoriteMachines,
		);
	// A heavy sport week already carries load, so the circuit comes down a size.
	const circuit = heavySport ? fullCircuit.slice(0, 4) : fullCircuit;
	const reps = phase === 'base' ? 10 : phase === 'peak' ? 6 : 8;
	// Level sets the volume: a beginner does fewer sets, an advanced runner more.
	// The model's week emphasis may lean it one notch up or down.
	const setCount = strengthSetCount(level, strengthIntent);
	const sets = circuit.map((m) => ({
		machine: m.name,
		sets: Array.from({ length: setCount }, () => ({ reps, weightKg: 0 })),
	}));
	const copy = MODE_COPY[mode];
	// The label and noun follow the moves actually selected, not the equipment
	// mode, so a machine session that tops up with bodyweight reads honestly.
	const shape = strengthShape(circuit);
	const type: SessionArchetype = shape === 'machines' ? 'machine-circuit' : 'full-body-strength';
	const noun = shape === 'machines' ? 'machines' : 'moves';
	const why = heavySport
		? `Trimmed to ${circuit.length} ${noun}. In the last week you logged ${load.describe}, which already counts as training.`
		: undefined;
	return {
		day,
		slot,
		modality: 'strength',
		type,
		title: TITLE[type],
		purpose: PURPOSE[type],
		prescription: {
			summary: `${sets.length} ${noun} · ${setCount} × ${reps}, control the lowering phase.`,
			blocks: sets,
			targetRpe: [7, 8],
			notes: copy.load,
			why,
			workout: strengthWorkout(circuit, reps, setCount),
		},
		durationMin: input.baseline.sessionMinutes ?? 45,
	};
}

/** Cross-training load tiers, from the last seven days of logged sports. */
function sportLoad(input: PlanInput): {
	sessions: number;
	minutes: number;
	hard: number;
	heavy: boolean;
	veryHeavy: boolean;
	describe: string;
} {
	const l = input.crossLoad;
	const sessions = l?.sessions ?? 0;
	const minutes = l?.minutes ?? 0;
	const hard = l?.highEffort ?? 0;
	const describe =
		`${sessions} sports session${sessions === 1 ? '' : 's'}` +
		(minutes ? ` and ${minutes} minutes of sport` : '');
	return {
		sessions,
		minutes,
		hard,
		heavy: sessions >= 3 || minutes >= 180 || hard >= 2,
		veryHeavy: sessions >= 4 || minutes >= 240 || hard >= 3,
		describe,
	};
}

function mobilitySession(day: number, libraryId: string, slot = 'AM'): PlannedSession {
	// The routine the runner gets is a library workout, chosen in mobility-plan
	// from their flexibility gap and answers, so a generated session names a
	// workout that also exists in the picker.
	const workout = WORKOUT_LIBRARY.find((w) => w.id === libraryId);
	if (!workout) throw new Error(`mobility workout missing from library: ${libraryId}`);
	return {
		day,
		slot,
		modality: 'mobility',
		type: 'mobility',
		title: workout.title,
		purpose: workout.purpose,
		prescription: {
			summary: workout.summary,
			intensity: workout.intensity,
			targetRpe: workout.targetRpe,
			workout: workout.workout,
			libraryId: workout.id,
			// The engine's own session, not one the runner added, so the rebuild
			// does not treat it as an added workout to repeat.
			added: false,
		},
		durationMin: workout.durationMin,
	};
}

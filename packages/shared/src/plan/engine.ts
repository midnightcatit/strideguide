import type {
	EquipmentPreference,
	Intensity,
	SessionArchetype,
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
import type { PlannedSession, PlannedWeek, PlanDraft, PlanInput, TrainingPaces } from './types';
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
function weeksBetween(a: string, b: string): number {
	return Math.max(
		1,
		Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / (7 * 86400000)),
	);
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
	race: 'Rehearsal at goal effort. Treat as a hard, purposeful effort.',
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
};

/* ------------------------------- phases ---------------------------------- */

function phaseSequence(
	rules: PlanInput['profile']['progressionRules'],
	totalWeeks: number,
): string[] {
	if (rules.length === 0) return Array.from({ length: totalWeeks }, () => 'base');
	const sum = rules.reduce((s, r) => s + r.weeks, 0) || totalWeeks;
	const counts = rules.map((r) => Math.max(1, Math.floor((r.weeks / sum) * totalWeeks)));
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
	rules.forEach((r, idx) => {
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

function volumeCurve(input: PlanInput, phases: string[]): number[] {
	const base = baseWeeklyKm(input);
	const rules = input.profile.progressionRules;
	const byPhase = new Map(rules.map((r) => [r.phase, r]));
	// Level sets how fast the plan builds. Beginners build more gently, advanced
	// runners a little faster. The self-assessed build preference leans the whole
	// curve one way or the other. No positive step may exceed the ~10 percent
	// weekly ceiling that keeps injury risk down, and deload weeks still step back.
	const LEVEL_STEP: Record<string, number> = { beginner: 0.85, intermediate: 1, advanced: 1.15 };
	const BUILD: Record<string, { step: number; start: number }> = {
		'ease-in': { step: 0.8, start: 0.85 },
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
	const out: number[] = [];
	let prev = base;
	let peak = base;
	const withinPhase = new Map<string, number>();
	for (let w = 0; w < phases.length; w++) {
		const phase = phases[w]!;
		const rule = byPhase.get(phase) ?? { phase, weeks: 1, volumeStep: 0.05, deload: false };
		const idx = withinPhase.get(phase) ?? 0;
		withinPhase.set(phase, idx + 1);
		let vol: number;
		if (w === 0) {
			// Ease in: the first week starts below the runner's current volume and
			// builds from there, so the plan never opens at a peak. A bolder build
			// opens closer to the current volume.
			vol = base * startFactor;
		} else if (phase === 'taper') {
			vol = peak * Math.pow(1 + Math.min(0, rule.volumeStep), idx + 1);
		} else if (rule.deload && (idx + 1) % 4 === 0) {
			vol = prev * 0.7;
		} else {
			const step = Math.min(Math.max(0, rule.volumeStep * levelStep), 0.1);
			vol = prev * (1 + step);
		}
		vol = clamp(round1(vol), 5, 160);
		if (phase !== 'taper') peak = Math.max(peak, vol);
		out.push(vol);
		prev = vol;
	}
	return out;
}

/* --------------------------- session allocation --------------------------- */

function pickSpaced(days: number[], count: number): number[] {
	if (count <= 0 || days.length === 0) return [];
	if (count >= days.length) return [...days];
	const out: number[] = [];
	const step = days.length / count;
	for (let i = 0; i < count; i++) out.push(days[Math.floor(i * step)]!);
	return [...new Set(out)];
}

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
	const totalWeeks = clamp(
		input.targetDate ? weeksBetween(input.startDate, input.targetDate) : input.profile.defaultWeeks,
		4,
		30,
	);
	const phases = phaseSequence(input.profile.progressionRules, totalWeeks);
	const volumes = volumeCurve(input, phases);
	// The weekday the plan starts on. Week one is anchored to the Monday on or
	// before it, and its earlier days are dropped, so a mid-week start keeps the
	// same weekday mapping as a Monday start.
	const startWeekday = weekdayIndex(input.startDate);

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

	const allDays = (
		[...new Set(input.availableDays)].length ? [...new Set(input.availableDays)] : [0, 2, 4]
	).sort((a, b) => a - b);
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
	const days = runDays.length >= 2 ? runDays : allDays;
	const longDay = days[days.length - 1]!;
	const rest = days.slice(0, -1);

	const requestedStrength = input.baseline.strengthDays;
	const strengthCount =
		requestedStrength && requestedStrength > 0
			? clamp(Math.round(requestedStrength), 1, 3)
			: input.profile.slug === 'whole-fitness'
				? Math.min(3, Math.max(1, Math.floor(days.length / 2)))
				: 2;

	const weeks: PlannedWeek[] = [];
	for (let w = 0; w < totalWeeks; w++) {
		const phase = phases[w]!;
		// The model may hold or ease a single week (a coach-like microcycle). The
		// numbers stay deterministic: an intent only scales or holds the plan's own
		// curve, never sets a distance, and a taper week is left untouched.
		const intent = input.weekShapes?.[w]?.volumeIntent;
		let volume = volumes[w]!;
		if (phase !== 'taper' && intent === 'ease') volume = volume * 0.9;
		else if (phase !== 'taper' && intent === 'hold') {
			volume = Math.min(volumes[w - 1] ?? volume, volume);
		}
		volume = clamp(round1(volume), 5, 160);
		// Every week is anchored to its Monday, and a session's day is a weekday
		// index (0 = Monday). So the same weekday index lands on the same real
		// weekday in every week, whatever day the plan starts on. Week one is the
		// calendar week that holds the chosen start date, and any of its days that
		// fall before that date are dropped below, so the plan never schedules a
		// session before it begins.
		const weekStart = addDays(input.startDate, w * 7 - startWeekday);
		const weekEnd = addDays(weekStart, 6);
		let strengthLeft = strengthCount;

		// A profile with no hard session types (general fitness) never gets a
		// quality day. Every other profile keeps a constant number of quality slots
		// across the whole plan, so the week's run days never change shape: in base
		// and taper fewer of those slots run hard (the rest run easy), and the first
		// week eases in with every slot easy. A constant shape means the week's
		// volume follows the plan curve instead of jumping the week quality starts.
		const hasQuality = input.profile.sessionTypes.some((t) =>
			['tempo', 'interval', 'hills', 'race-pace', 'threshold', 'strides', 'fartlek'].includes(t),
		);
		const qualitySlots = Math.min(hasQuality ? 2 : 0, Math.max(0, rest.length - 1));
		const hardCount = !hasQuality ? 0 : w === 0 ? 0 : phase === 'base' || phase === 'taper' ? 1 : 2;
		const slotDays = pickSpaced(rest, qualitySlots);
		const qualityDays = slotDays.slice(0, Math.min(hardCount, slotDays.length));
		const softDays = slotDays.filter((d) => !qualityDays.includes(d));
		const usedForRun = new Set([longDay, ...slotDays]);
		const runFree = days.filter((d) => !usedForRun.has(d));

		// Strength gets its own days, never sharing with a run, and takes them before
		// the remaining days become easy runs.
		const wantStrength = Math.min(strengthLeft, runFree.length);
		const strengthDays = runFree.slice(0, wantStrength);
		const easyDays = [...softDays, ...runFree.slice(wantStrength)];
		strengthLeft -= wantStrength;

		const load = sportLoad(input);
		// Session shape by goal: the long run's share of the week, and how much of
		// the week one quality day takes (its whole distance, bookends included).
		// A 5K leans on quality with a shorter long run; a marathon leans on a
		// genuinely long, progressive long run.
		const SHAPE: Record<string, { long: number; quality: number }> = {
			marathon: { long: 0.34, quality: 0.17 },
			'half-marathon': { long: 0.33, quality: 0.19 },
			'10k': { long: 0.3, quality: 0.24 },
			'5k': { long: 0.3, quality: 0.26 },
			'whole-fitness': { long: 0.3, quality: 0.12 },
		};
		const shape = SHAPE[input.profile.slug] ?? { long: 0.3, quality: 0.16 };
		// The long run is its own arc: a goal-aware share of the week that grows as
		// the week grows, with a small floor so a light week still has one.
		const longKm = round1(clamp(volume * shape.long, 3, 38));
		// One quality day's whole distance, held under the long run so the long run
		// is always the longest run and a light week is not one giant quality day.
		const qualityRaw = clamp(volume * shape.quality, 1.6, 16);
		const qualityDayKm = round1(Math.min(qualityRaw, longKm * 0.85));
		// A very heavy sport week takes a slice off the quality work. The long run
		// is left whole, since endurance is the point.
		const qualityKm = round1(load.veryHeavy ? qualityDayKm * 0.85 : qualityDayKm);
		const qualityWhy = load.veryHeavy
			? `Shortened by about 15 percent. In the last week you logged ${load.describe}, and the long run stays whole.`
			: undefined;
		// Easy runs take what is left, never as long as the long run (at most 80
		// percent of it) and never below a small floor, so the long run always reads
		// as the long run while both still progress together across the plan.
		const leftover = Math.max(0, round1(volume - longKm - qualityKm * qualityDays.length));
		const easyCap = Math.max(1, round1(longKm * 0.8));
		const easyPer =
			easyDays.length && leftover > 0
				? round1(clamp(leftover / easyDays.length, Math.min(2, leftover), easyCap))
				: 0;
		// Quality bookends scale with the session, and the reps fill what is left.
		const { wu: qWu, cd: qCd } = qualityWarmupCooldown(qualityKm);
		const qualityWorkKm = Math.max(0.6, round1(qualityKm - qWu - qCd));

		const sessions: PlannedSession[] = [];

		// long run
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

		// quality sessions
		const goalPace = goalPaceFor(input.profile.slug, paces ?? DEFAULT_PACES);
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

		// easy runs (+ strength as a second slot)
		easyDays.forEach((day) => {
			if (easyPer > 0) {
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'easy',
					title: TITLE.easy,
					purpose: PURPOSE.easy,
					prescription: {
						summary: 'Easy run, conversational.',
						targetDistanceKm: easyPer,
						targetPaceSecPerKm: paces ? paces.easy : undefined,
						targetZone: 'Z2',
						targetRpe: [3, 4],
						workout: singleRunWorkout('easy', easyPer, paces),
					},
					durationMin: estDuration(easyPer, easyPace),
				});
			}
		});

		// Strength on its own days, in the morning.
		for (const day of strengthDays) {
			sessions.push(strengthSession(day, 'AM', phase, input));
		}

		// Cross-training: when the user has it and the profile allows it, swap the
		// last easy run for a low-impact session, sparing the running legs.
		if (
			!crossDays.length &&
			input.baseline.crossTraining?.length &&
			input.profile.sessionTypes.includes('cross-train')
		) {
			const idx = [...sessions].reverse().findIndex((s) => s.type === 'easy');
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
			// The gap sets how often the runner stretches; a favorite mobility
			// workout sets which routine, so the plan names the one they chose.
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
				if (added >= mobility.perWeek) break;
				const slot = sessions.some((s) => s.day === d) ? 'PM' : 'AM';
				sessions.push(mobilitySession(d, routineId, slot));
				added++;
			}
		}

		// Week one is anchored to its Monday, which may sit before the chosen start
		// date. Keep only the days on or after the start, so the plan never places a
		// session before it begins. Later weeks are whole and unaffected.
		const inWeek = w === 0 ? sessions.filter((s) => s.day >= startWeekday) : sessions;

		const withIntensity = inWeek.map((s) => {
			const withFavorite = withFavoriteWorkout(s, input);
			return {
				...withFavorite,
				prescription: {
					...withFavorite.prescription,
					intensity: withFavorite.prescription.intensity ?? intensityFor(withFavorite.type),
				},
			};
		});

		weeks.push({
			weekNumber: w + 1,
			phase,
			focus: FOCUS[phase] ?? phase,
			startDate: weekStart,
			endDate: weekEnd,
			// The week's running distance, summed from the sessions as planned, so
			// the number on the card matches what the sessions add up to.
			targetVolumeKm: round1(
				withIntensity
					.filter((s) => s.modality === 'running')
					.reduce((sum, s) => sum + (s.prescription.targetDistanceKm ?? 0), 0),
			),
			sessions: withIntensity.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot)),
		});
	}

	return {
		profileSlug: input.profile.slug,
		weeks,
		meta: {
			totalWeeks,
			startDate: input.startDate,
			targetDate: input.targetDate,
			vdot,
			baseWeeklyKm: baseWeeklyKm(input),
		},
	};
}

function strengthSession(
	day: number,
	slot: string,
	phase: string,
	input: PlanInput,
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
	const setCount = level === 'beginner' ? 2 : level === 'advanced' ? 4 : 3;
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

import type {
	Baseline,
	Intensity,
	SessionArchetype,
	StepBlock,
	StepKind,
	StructuredWorkout,
	WorkoutStep,
} from '../types';
import { circuitFor } from './catalog';
import type { MachineExercise } from './machines';
import { COOLDOWN_STRETCHES, WARMUP_DRILLS, mobilityRoutine, type Drill } from './mobility';
import type { PlannedSession, PlannedWeek, PlanDraft, PlanInput, TrainingPaces } from './types';
import { pacesFromVdot, vdotFromBaseline } from './vdot';

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
	return Math.max(1, Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / (7 * 86400000)));
}

/** One-line, research-informed purpose per session archetype. */
const PURPOSE: Record<SessionArchetype, string> = {
	easy: 'Aerobic base: builds capillaries and mitochondria so faster running feels easier. You should feel conversational throughout.',
	recovery: 'Gentle blood flow to speed recovery between harder days. Keep it easy enough to chat.',
	long: 'Time on feet and fat oxidation, the single biggest driver of endurance. Stay relaxed and even.',
	tempo: 'Raises lactate threshold so your goal pace feels easier to hold. You should feel "comfortably hard."',
	threshold: 'Sustained work near threshold lifts the pace you can hold. Steady breathing, not gasping.',
	interval: 'Develops VO2max and top-end speed. Hard but controlled reps, full recovery between.',
	'race-pace': 'Rehearsal at your goal pace. It makes race effort feel familiar, even and sustainable.',
	strides: 'Short, fast, relaxed bursts that improve running economy and leg speed. Never straining.',
	hills: 'Strength-endurance: builds power and economy. Power up, control the descent.',
	fartlek: 'Unstructured speed play that teaches pace changes with less pressure.',
	race: 'Rehearsal at goal effort. Treat as a hard, purposeful effort.',
	'machine-circuit': 'Full-body strength circuit: supports running economy and injury resistance.',
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
	'machine-circuit': 'Machine circuit',
	'full-body-strength': 'Full-body strength',
	mobility: 'Mobility',
	'cross-train': 'Cross-train',
};

const FOCUS: Record<string, string> = {
	base: 'Base: build aerobic volume',
	build: 'Build: add quality',
	peak: 'Peak: sharpen and rehearse goal pace',
	taper: 'Taper: freshen up, keep intensity',
};

/* ------------------------------- phases ---------------------------------- */

function phaseSequence(rules: PlanInput['profile']['progressionRules'], totalWeeks: number): string[] {
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
	const expFactor = { beginner: 0.55, intermediate: 1, advanced: 1.5 }[
		input.baseline.experience ?? 'beginner'
	];
	const profileFactor: Record<string, number> = {
		marathon: 1.15,
		'half-marathon': 1,
		'10k': 0.8,
		'5k': 0.65,
		'whole-fitness': 0.7,
	};
	return round1(20 * expFactor * (profileFactor[input.profile.slug] ?? 0.8));
}

function volumeCurve(input: PlanInput, phases: string[]): number[] {
	const base = baseWeeklyKm(input);
	const rules = input.profile.progressionRules;
	const byPhase = new Map(rules.map((r) => [r.phase, r]));
	const out: number[] = [];
	let prev = base;
	let peak = base;
	let phaseIdx = 0;
	const withinPhase = new Map<string, number>();
	for (let w = 0; w < phases.length; w++) {
		const phase = phases[w]!;
		const rule = byPhase.get(phase) ?? { phase, weeks: 1, volumeStep: 0.05, deload: false };
		const idx = withinPhase.get(phase) ?? 0;
		withinPhase.set(phase, idx + 1);
		let vol: number;
		if (phase === 'taper') {
			vol = peak * Math.pow(1 + rule.volumeStep, idx + 1);
		} else if (rule.deload && (idx + 1) % 4 === 0) {
			vol = prev * 0.7;
		} else {
			vol = prev * (1 + rule.volumeStep);
		}
		vol = clamp(round1(vol), 5, 160);
		if (phase !== 'taper') peak = Math.max(peak, vol);
		out.push(vol);
		prev = vol;
		phaseIdx++;
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

function warmupStep(paces?: TrainingPaces): WorkoutStep {
	const p = paces ?? DEFAULT_PACES;
	return {
		kind: 'warmup',
		label: 'Warm-up jog',
		distanceM: Math.round(WARMUP_KM * 1000),
		durationSec: secsForM(WARMUP_KM * 1000, p.easy[1]),
		targetPaceSecPerKm: paces?.easy,
		targetZone: 'Z1–Z2',
		targetRpe: [2, 3],
		note: 'Easy and conversational. Extend if you need time to reach your route or hill.',
	};
}

function cooldownStep(paces?: TrainingPaces): WorkoutStep {
	const p = paces ?? DEFAULT_PACES;
	return {
		kind: 'cooldown',
		label: 'Cool-down jog',
		distanceM: Math.round(COOLDOWN_KM * 1000),
		durationSec: secsForM(COOLDOWN_KM * 1000, p.easy[1]),
		targetPaceSecPerKm: paces?.easy,
		targetRpe: [1, 3],
	};
}

function drillBlock(label: string, drills: Drill[], kind: StepKind): StepBlock {
	return {
		repeat: 1,
		label,
		steps: drills.map<WorkoutStep>((d) => ({
			kind,
			label: d.name,
			durationSec: d.durationSec,
			targetRpe: kind === 'warmup' ? [2, 3] : [1, 2],
			note: d.why,
		})),
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

function tempoWorkout(qualityKm: number, paces?: TrainingPaces): StructuredWorkout {
	const blocks: StepBlock[] = [
		drillBlock('Dynamic warm-up', WARMUP_DRILLS.slice(1), 'warmup'),
		{ repeat: 1, steps: [warmupStep(paces)] },
		{
			repeat: 1,
			label: 'Set',
			steps: [
				{
					kind: 'work',
					label: 'Tempo',
					distanceM: Math.round(qualityKm * 1000),
					durationSec: secsForM(qualityKm * 1000, (paces ?? DEFAULT_PACES).threshold),
					targetPaceSecPerKm: paces ? [paces.threshold * 0.99, paces.threshold * 1.03] : undefined,
					targetZone: 'Z3–Z4',
					targetRpe: [6, 7],
					note: 'Comfortably hard, with steady breathing and not gasping.',
				},
			],
		},
		{ repeat: 1, steps: [cooldownStep(paces)] },
		drillBlock('Cool-down stretches', COOLDOWN_STRETCHES, 'cooldown'),
	];
	return {
		blocks,
		totalDistanceKm: round1(WARMUP_KM + qualityKm + COOLDOWN_KM),
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
		drillBlock('Dynamic warm-up', WARMUP_DRILLS.slice(1), 'warmup'),
		{ repeat: 1, steps: [warmupStep(opts.paces)] },
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
		{ repeat: 1, steps: [cooldownStep(opts.paces)] },
		drillBlock('Cool-down stretches', COOLDOWN_STRETCHES, 'cooldown'),
	];
	return {
		blocks,
		totalDistanceKm: round1(WARMUP_KM + opts.reps * ((opts.distanceM + recoveryM) / 1000) + COOLDOWN_KM),
	};
}

function intervalWorkout(reps: number, paces?: TrainingPaces): StructuredWorkout {
	return repWorkout({
		reps,
		distanceM: 800,
		pace: paces ? [paces.interval * 0.98, paces.interval * 1.02] : undefined,
		fallbackPace: (paces ?? DEFAULT_PACES).interval,
		label: 'Interval',
		note: 'Even, controlled reps. Stop the set if form breaks down.',
		recoveryM: 800,
		recoveryPace: paces?.easy,
		paces,
	});
}

function racePaceWorkout(
	profileSlug: string,
	phase: string,
	goalPace: number,
	paces?: TrainingPaces,
): StructuredWorkout {
	const shape = RACE_PACE_SHAPE[profileSlug] ?? RACE_PACE_SHAPE['half-marathon']!;
	const reps = phase === 'peak' ? shape.peak : shape.build;
	return repWorkout({
		reps,
		distanceM: shape.distanceM,
		pace: [goalPace * 0.99, goalPace * 1.01],
		fallbackPace: goalPace,
		label: 'Goal pace',
		note: 'At your goal pace, with even splits and relaxed effort. This is what race day should feel like.',
		recoveryM: Math.min(800, shape.distanceM),
		recoveryPace: paces?.easy,
		paces,
	});
}

function hillsWorkout(reps: number, paces?: TrainingPaces): StructuredWorkout {
	return repWorkout({
		reps,
		distanceM: 400,
		pace: paces ? [paces.interval * 1.03, paces.interval * 1.12] : undefined,
		fallbackPace: (paces ?? DEFAULT_PACES).interval * 1.05,
		label: 'Hill rep',
		note: 'Power up with short, quick steps, then jog or walk down to recover.',
		recoveryM: 400,
		recoveryPace: paces?.easy,
		paces,
	});
}

function strengthWorkout(circuit: MachineExercise[], reps: number): StructuredWorkout {
	const blocks: StepBlock[] = [
		drillBlock('Dynamic warm-up', WARMUP_DRILLS, 'warmup'),
		{
			repeat: 1,
			label: 'Circuit',
			steps: circuit.map<WorkoutStep>((m) => ({
				kind: 'work',
				label: m.name,
				machine: m.name,
				sets: 3,
				reps,
				restSec: 75,
				targetRpe: [7, 8],
				note: `Rest ~60–90s between sets. ${m.muscles.join(', ')}.`,
			})),
		},
		drillBlock('Cool-down', COOLDOWN_STRETCHES, 'cooldown'),
	];
	return { blocks, estimatedDurationMin: 50 };
}

/* ------------------------------- engine ---------------------------------- */

export function generatePlan(input: PlanInput): PlanDraft {
	const totalWeeks = clamp(
		input.targetDate ? weeksBetween(input.startDate, input.targetDate) : input.profile.defaultWeeks,
		4,
		30,
	);
	const phases = phaseSequence(input.profile.progressionRules, totalWeeks);
	const volumes = volumeCurve(input, phases);

	const vdot = vdotFromBaseline(input.baseline.recentTimes);
	const paces: TrainingPaces | undefined = vdot ? pacesFromVdot(vdot) : undefined;
	const easyPace = paces ? (paces.easy[0] + paces.easy[1]) / 2 : 360; // ~6:00/km fallback

	const allDays = ([...new Set(input.availableDays)].length
		? [...new Set(input.availableDays)]
		: [0, 2, 4]
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
		const volume = volumes[w]!;
		const weekStart = addDays(input.startDate, w * 7);
		const weekEnd = addDays(weekStart, 6);
		let strengthLeft = strengthCount;

		// Ease in: the first week is easy running and strength only.
		const qualityCount = w === 0 ? 0 : phase === 'taper' || phase === 'base' ? 1 : 2;
		const qualityDays = pickSpaced(rest, Math.min(qualityCount, rest.length));
		const usedForRun = new Set([longDay, ...qualityDays]);
		const runFree = days.filter((d) => !usedForRun.has(d));

		// Strength gets its own days, never sharing with a run. Keep at least one day
		// for an easy run when there is one, so a week is never a single run.
		const wantStrength = Math.min(strengthLeft, Math.max(0, runFree.length - 1));
		const strengthDays = runFree.slice(runFree.length - wantStrength);
		const easyDays = runFree.slice(0, runFree.length - wantStrength);
		strengthLeft -= wantStrength;

		const load = sportLoad(input);
		const qualityRaw = clamp(volume * 0.16, 3, 14);
		// A very heavy sport week takes a slice off the quality work. The long run
		// is left whole, since endurance is the point.
		const qualityKm = round1(load.veryHeavy ? qualityRaw * 0.85 : qualityRaw);
		const qualityWhy = load.veryHeavy
			? `Shortened by about 15 percent. In the last week you logged ${load.describe}, and the long run stays whole.`
			: undefined;
		// The long run is the longest run, never a third of nothing and never most
		// of the week. An easy run is capped at the long run's length, so a week
		// with few running days plans less instead of one giant run.
		const longKm = round1(clamp(volume * 0.32, 4, 38));
		const remaining = Math.max(0, round1(volume - longKm - qualityKm * qualityDays.length));
		const easyPer = easyDays.length ? Math.min(longKm, round1(remaining / easyDays.length)) : 0;

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
				kind = 'tempo';
			}

			if (kind === 'race-pace') {
				const shape = RACE_PACE_SHAPE[input.profile.slug] ?? RACE_PACE_SHAPE['half-marathon']!;
				const reps = phase === 'peak' ? shape.peak : shape.build;
				const rpKm = round1((reps * shape.distanceM) / 1000);
				const workout = racePaceWorkout(input.profile.slug, phase, goalPace, paces);
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'race-pace',
					title: TITLE['race-pace'],
					purpose: PURPOSE['race-pace'],
					prescription: {
						summary: 'Goal-pace reps at your target pace.',
						targetDistanceKm: workout.totalDistanceKm ?? rpKm,
						targetPaceSecPerKm: [goalPace * 0.99, goalPace * 1.01],
						targetRpe: [7, 8],
						notes: 'Even splits at goal pace. Rehearsal for race day.',
						workout,
						why: qualityWhy,
					},
					durationMin: Math.round(((workout.totalDistanceKm ?? rpKm) * goalPace) / 60),
				});
			} else if (kind === 'interval') {
				const reps = clamp(Math.round(qualityKm / 0.8 / 2) * 2, 4, 10);
				const workout = intervalWorkout(reps, paces);
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'interval',
					title: TITLE.interval,
					purpose: PURPOSE.interval,
					prescription: {
						summary: 'Interval reps at interval pace, with equal-time recovery.',
						targetDistanceKm: workout.totalDistanceKm ?? round1((reps * 800) / 1000),
						targetPaceSecPerKm: paces ? [paces.interval * 0.98, paces.interval * 1.02] : undefined,
						targetRpe: [8, 9],
						notes: 'Even reps; stop the set if form breaks down.',
						workout,
						why: qualityWhy,
					},
					durationMin: estDuration((reps * 800) / 1000, paces ? paces.interval : easyPace - 60) + 15,
				});
			} else if (kind === 'hills') {
				const reps = clamp(Math.round(qualityKm / 0.4 / 2) * 2, 4, 10);
				const workout = hillsWorkout(reps, paces);
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'hills',
					title: TITLE.hills,
					purpose: PURPOSE.hills,
					prescription: {
						summary: 'Hill reps at hard effort, jog or walk down to recover.',
						targetDistanceKm: workout.totalDistanceKm ?? round1((reps * 400) / 1000),
						targetRpe: [8, 9],
						notes: 'Power up with short, quick steps. Relax on the way down.',
						workout,
						why: qualityWhy,
					},
					durationMin: estDuration((reps * 400) / 1000, paces ? paces.interval : easyPace - 60) + 20,
				});
			} else {
				const workout = tempoWorkout(qualityKm, paces);
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'tempo',
					title: TITLE.tempo,
					purpose: PURPOSE.tempo,
					prescription: {
						summary: 'Continuous work at threshold pace.',
						targetDistanceKm: workout.totalDistanceKm ?? qualityKm,
						targetPaceSecPerKm: paces
							? [paces.threshold * 0.99, paces.threshold * 1.03]
							: undefined,
						targetZone: 'Z3–Z4',
						targetRpe: [6, 7],
						workout,
						why: qualityWhy,
					},
					durationMin: estDuration(qualityKm, paces ? paces.threshold : easyPace - 30),
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
				sessions[realIdx] = {
					...easy,
					modality: 'recovery',
					type: 'cross-train',
					title: TITLE['cross-train'],
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
			const title = activity.charAt(0).toUpperCase() + activity.slice(1);
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

		// Mobility follows the flexibility gap: a goal above where you are today
		// earns one or two dedicated sessions a week, on rest days.
		const flex = input.baseline.flexibility;
		const flexGap = flex ? Math.max(0, flex.goal - flex.current) : 0;
		if (flexGap > 0 && phase !== 'taper') {
			const wanted = flexGap >= 2 ? 2 : 1;
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
				if (added >= wanted) break;
				const slot = sessions.some((s) => s.day === d) ? 'PM' : 'AM';
				sessions.push(mobilitySession(d, input.baseline, slot));
				added++;
			}
		}

		const withIntensity = sessions.map((s) => ({
			...s,
			prescription: { ...s.prescription, intensity: s.prescription.intensity ?? intensityFor(s.type) },
		}));

		weeks.push({
			weekNumber: w + 1,
			phase,
			focus: FOCUS[phase] ?? phase,
			startDate: weekStart,
			endDate: weekEnd,
			targetVolumeKm: round1(
				longKm + qualityKm * qualityDays.length + easyPer * easyDays.length,
			),
			sessions: withIntensity.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot)),
		});
	}

	return {
		profileSlug: input.profile.slug,
		weeks,
		meta: { totalWeeks, startDate: input.startDate, targetDate: input.targetDate, vdot, baseWeeklyKm: baseWeeklyKm(input) },
	};
}

function strengthSession(day: number, slot: string, phase: string, input: PlanInput): PlannedSession {
	const mode = input.baseline.equipment ?? 'machines';
	const load = sportLoad(input);
	const heavySport = load.heavy;
	const loaded = phase !== 'base';
	const fullCircuit = circuitFor(mode, input.baseline.sessionMinutes, input.equipment, loaded);
	// A heavy sport week already carries load, so the circuit comes down a size.
	const circuit = heavySport ? fullCircuit.slice(0, 4) : fullCircuit;
	const reps = phase === 'base' ? 10 : phase === 'peak' ? 6 : 8;
	const sets = circuit.map((m) => ({
		machine: m.name,
		sets: [
			{ reps, weightKg: 0 },
			{ reps, weightKg: 0 },
			{ reps, weightKg: 0 },
		],
	}));
	const type: SessionArchetype = mode === 'machines' ? 'machine-circuit' : 'full-body-strength';
	const noun = mode === 'machines' ? 'machines' : mode === 'both' ? 'exercises' : 'moves';
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
			summary: `${sets.length} ${noun} · 3 × ${reps}, control the lowering phase.`,
			blocks: sets,
			targetRpe: [7, 8],
			notes:
				mode === 'machines'
					? 'Log weight per set; add load when you clear the top rep target.'
					: 'Log reps. Make it harder with a slower lowering phase, a harder variation, or a longer hold.',
			why,
			workout: strengthWorkout(circuit, reps),
		},
		durationMin: input.baseline.sessionMinutes ?? 45,
	};
}

function mobilityWorkout(routine: Drill[]): StructuredWorkout {
	const dynamic = routine.slice(0, 2);
	const statics = routine.slice(2);
	return {
		blocks: [
			drillBlock('Loosen up', dynamic, 'warmup'),
			drillBlock('Mobility stretches', statics, 'cooldown'),
		],
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

function mobilitySession(day: number, baseline: Baseline, slot = 'AM'): PlannedSession {
	// A bigger stretch (two or more points) gets the fuller routine; a small
	// stretch keeps the short maintenance one.
	const building = (baseline.flexibility?.goal ?? 0) - (baseline.flexibility?.current ?? 0) >= 2;
	const routine = mobilityRoutine(building);
	const totalSec = routine.reduce((s, d) => s + d.durationSec, 0);
	return {
		day,
		slot,
		modality: 'mobility',
		type: 'mobility',
		title: TITLE.mobility,
		purpose: PURPOSE.mobility,
		prescription: {
			summary: building
				? 'A short mobility session, with a little more work toward your flexibility goal.'
				: 'A short mobility session to keep the range you already have.',
			intensity: 'easy',
			targetRpe: [1, 3],
			workout: mobilityWorkout(routine),
		},
		durationMin: Math.max(8, Math.round(totalSec / 60)),
	};
}

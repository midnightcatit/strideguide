import type {
	Intensity,
	SessionArchetype,
	StepBlock,
	StepKind,
	StructuredWorkout,
	WorkoutStep,
} from '../types';
import { defaultCircuit } from './machines';
import { COOLDOWN_STRETCHES, WARMUP_DRILLS, type Drill } from './mobility';
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
		label: 'Warm-up',
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
		label: 'Cool-down',
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
		],
		totalDistanceKm: distanceKm,
	};
}

function tempoWorkout(qualityKm: number, paces?: TrainingPaces): StructuredWorkout {
	const blocks: StepBlock[] = [
		drillBlock('Warm-up drills', WARMUP_DRILLS.slice(1), 'warmup'),
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
		drillBlock('Stretches', COOLDOWN_STRETCHES, 'cooldown'),
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
		drillBlock('Warm-up drills', WARMUP_DRILLS.slice(1), 'warmup'),
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
					label: 'Recovery',
					distanceM: recoveryM,
					durationSec: secsForM(recoveryM, recoveryPace),
					targetPaceSecPerKm: opts.recoveryPace,
					targetRpe: [2, 3],
					note: 'Jog easily, or walk if you need more recovery.',
				},
			],
		},
		{ repeat: 1, steps: [cooldownStep(opts.paces)] },
		drillBlock('Stretches', COOLDOWN_STRETCHES, 'cooldown'),
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

function strengthWorkout(
	circuit: ReturnType<typeof defaultCircuit>,
	reps: number,
): StructuredWorkout {
	const blocks: StepBlock[] = [
		drillBlock('Warm-up drills', WARMUP_DRILLS, 'warmup'),
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

	const allDays = [...new Set(input.availableDays)].sort((a, b) => a - b);
	const days = allDays.length ? allDays : [0, 2, 4];
	const longDay = days[days.length - 1]!;
	const rest = days.slice(0, -1);

	const strengthCount =
		input.profile.slug === 'whole-fitness' ? Math.min(3, Math.max(1, Math.floor(days.length / 2))) : 2;

	const weeks: PlannedWeek[] = [];
	for (let w = 0; w < totalWeeks; w++) {
		const phase = phases[w]!;
		const volume = volumes[w]!;
		const weekStart = addDays(input.startDate, w * 7);
		const weekEnd = addDays(weekStart, 6);

		const qualityCount = phase === 'taper' || phase === 'base' ? 1 : 2;
		const qualityDays = pickSpaced(rest, Math.min(qualityCount, rest.length));
		const usedForRun = new Set([longDay, ...qualityDays]);
		const easyDays = days.filter((d) => !usedForRun.has(d));

		const longKm = round1(clamp(volume * 0.3, 4, 38));
		const qualityKm = round1(clamp(volume * 0.16, 3, 14));
		const easyTotal = Math.max(0, round1(volume - longKm - qualityKm * qualityDays.length));
		const easyPer = easyDays.length ? round1(easyTotal / easyDays.length) : 0;

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
			let kind: 'race-pace' | 'interval' | 'tempo';
			if (
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
						targetDistanceKm: rpKm,
						targetPaceSecPerKm: [goalPace * 0.99, goalPace * 1.01],
						targetRpe: [7, 8],
						notes: 'Even splits at goal pace. Rehearsal for race day.',
						workout,
					},
					durationMin: Math.round(((workout.totalDistanceKm ?? rpKm) * goalPace) / 60),
				});
			} else if (kind === 'interval') {
				const reps = clamp(Math.round(qualityKm / 0.8 / 2) * 2, 4, 10);
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'interval',
					title: TITLE.interval,
					purpose: PURPOSE.interval,
					prescription: {
						summary: 'Interval reps at interval pace, with equal-time recovery.',
						targetDistanceKm: round1((reps * 800) / 1000),
						targetPaceSecPerKm: paces ? [paces.interval * 0.98, paces.interval * 1.02] : undefined,
						targetRpe: [8, 9],
						notes: 'Even reps; stop the set if form breaks down.',
						workout: intervalWorkout(reps, paces),
					},
					durationMin: estDuration((reps * 800) / 1000, paces ? paces.interval : easyPace - 60) + 15,
				});
			} else {
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'tempo',
					title: TITLE.tempo,
					purpose: PURPOSE.tempo,
					prescription: {
						summary: 'Continuous work at threshold pace.',
						targetDistanceKm: qualityKm,
						targetPaceSecPerKm: paces
							? [paces.threshold * 0.99, paces.threshold * 1.03]
							: undefined,
						targetZone: 'Z3–Z4',
						targetRpe: [6, 7],
						workout: tempoWorkout(qualityKm, paces),
					},
					durationMin: estDuration(qualityKm, paces ? paces.threshold : easyPace - 30),
				});
			}
		});

		// easy runs (+ strength as a second slot)
		let strengthLeft = strengthCount;
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
			if (strengthLeft > 0) {
				sessions.push(strengthSession(day, 'PM', phase, input.equipment));
				strengthLeft--;
			}
		});

		// any strength still unplaced → attach to quality days in the evening
		for (const day of qualityDays) {
			if (strengthLeft <= 0) break;
			sessions.push(strengthSession(day, 'PM', phase, input.equipment));
			strengthLeft--;
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
			targetVolumeKm: volume,
			sessions: withIntensity.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot)),
		});
	}

	return {
		profileSlug: input.profile.slug,
		weeks,
		meta: { totalWeeks, startDate: input.startDate, targetDate: input.targetDate, vdot, baseWeeklyKm: baseWeeklyKm(input) },
	};
}

function strengthSession(
	day: number,
	slot: string,
	phase: string,
	equipment?: string[],
): PlannedSession {
	const circuit = defaultCircuit(equipment);
	const reps = phase === 'base' ? 10 : phase === 'peak' ? 6 : 8;
	const sets = circuit.slice(0, 6).map((m) => ({
		machine: m.name,
		sets: [
			{ reps, weightKg: 0 },
			{ reps, weightKg: 0 },
			{ reps, weightKg: 0 },
		],
	}));
	return {
		day,
		slot,
		modality: 'strength',
		type: 'machine-circuit',
		title: TITLE['machine-circuit'],
		purpose: PURPOSE['machine-circuit'],
		prescription: {
			summary: `${sets.length} machines · 3 × ${reps}, control the lowering phase.`,
			blocks: sets,
			targetRpe: [7, 8],
			notes: 'Log weight per set; add load when you clear the top rep target.',
			workout: strengthWorkout(circuit, reps),
		},
		durationMin: 45,
	};
}

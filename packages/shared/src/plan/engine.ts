import type { SessionArchetype, StepBlock, StructuredWorkout, WorkoutStep } from '../types';
import { defaultCircuit } from './machines';
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
	long: 'Time on feet and fat oxidation — the single biggest driver of endurance. Stay relaxed and even.',
	tempo: 'Raises lactate threshold so your goal pace feels easier to hold. You should feel "comfortably hard."',
	threshold: 'Sustained work near threshold lifts the pace you can hold. Steady breathing, not gasping.',
	interval: 'Develops VO2max and top-end speed. Hard but controlled reps, full recovery between.',
	strides: 'Short, fast, relaxed bursts that improve running economy and leg speed. Never straining.',
	hills: 'Strength-endurance: builds power and economy. Power up, control the descent.',
	fartlek: 'Unstructured speed play — teaches pace changes with less pressure.',
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
	base: 'Base — build aerobic volume',
	build: 'Build — add quality',
	peak: 'Peak — sharpen and rehearse goal pace',
	taper: 'Taper — freshen up, keep intensity',
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

function warmupStep(paces?: TrainingPaces): WorkoutStep {
	return {
		kind: 'warmup',
		label: 'Warm-up',
		distanceM: Math.round(WARMUP_KM * 1000),
		targetPaceSecPerKm: paces?.easy,
		targetZone: 'Z1–Z2',
		targetRpe: [2, 3],
		note: 'Easy and conversational. Extend if you need time to reach your route or hill.',
	};
}

function cooldownStep(paces?: TrainingPaces): WorkoutStep {
	return {
		kind: 'cooldown',
		label: 'Cool-down',
		distanceM: Math.round(COOLDOWN_KM * 1000),
		targetPaceSecPerKm: paces?.easy,
		targetRpe: [1, 3],
	};
}

function singleRunWorkout(
	type: SessionArchetype,
	distanceKm: number,
	paces?: TrainingPaces,
): StructuredWorkout {
	return {
		blocks: [
			{
				repeat: 1,
				steps: [
					{
						kind: 'work',
						label: TITLE[type],
						distanceM: Math.round(distanceKm * 1000),
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
		{ repeat: 1, steps: [warmupStep(paces)] },
		{
			repeat: 1,
			label: 'Set',
			steps: [
				{
					kind: 'work',
					label: 'Tempo',
					distanceM: Math.round(qualityKm * 1000),
					targetPaceSecPerKm: paces ? [paces.threshold * 0.99, paces.threshold * 1.03] : undefined,
					targetZone: 'Z3–Z4',
					targetRpe: [6, 7],
					note: 'Comfortably hard — steady breathing, not gasping.',
				},
			],
		},
		{ repeat: 1, steps: [cooldownStep(paces)] },
	];
	return {
		blocks,
		totalDistanceKm: round1(WARMUP_KM + qualityKm + COOLDOWN_KM),
	};
}

function intervalWorkout(reps: number, paces?: TrainingPaces): StructuredWorkout {
	const blocks: StepBlock[] = [
		{ repeat: 1, steps: [warmupStep(paces)] },
		{
			repeat: reps,
			label: 'Set',
			steps: [
				{
					kind: 'work',
					label: 'Interval',
					distanceM: 800,
					targetPaceSecPerKm: paces
						? [paces.interval * 0.98, paces.interval * 1.02]
						: undefined,
					targetRpe: [8, 9],
					note: 'Even, controlled reps — stop the set if form breaks down.',
				},
				{
					kind: 'recovery',
					label: 'Recovery',
					distanceM: 800,
					targetPaceSecPerKm: paces?.easy,
					targetRpe: [2, 3],
					note: 'Jog easily, or walk if you need more recovery.',
				},
			],
		},
		{ repeat: 1, steps: [cooldownStep(paces)] },
	];
	return {
		blocks,
		totalDistanceKm: round1(WARMUP_KM + reps * 1.6 + COOLDOWN_KM),
	};
}

function strengthWorkout(
	circuit: ReturnType<typeof defaultCircuit>,
	reps: number,
): StructuredWorkout {
	const blocks: StepBlock[] = [
		{
			repeat: 1,
			label: 'Warm-up',
			steps: [
				{
					kind: 'warmup',
					label: 'Activation',
					durationSec: 300,
					targetRpe: [2, 3],
					note: '5 min easy cardio, then dynamic drills (leg swings, hip openers, glute bridges).',
				},
			],
		},
		{
			repeat: 1,
			label: 'Circuit',
			steps: circuit.map<WorkoutStep>((m) => ({
				kind: 'work',
				label: m.name,
				machine: m.name,
				sets: 3,
				reps,
				targetRpe: [7, 8],
				note: `${m.muscles.join(', ')} — ${m.feel} Rest ~60–90s between sets.`,
			})),
		},
		{
			repeat: 1,
			label: 'Cool-down',
			steps: [
				{
					kind: 'cooldown',
					label: 'Stretch',
					durationSec: 300,
					note: 'Gentle stretches for the muscles you trained.',
				},
			],
		},
	];
	return { blocks, estimatedDurationMin: 45 };
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
				summary: `Long run ${longKm} km, easy and even.`,
				targetDistanceKm: longKm,
				targetPaceSecPerKm: paces ? paces.easy : undefined,
				targetZone: 'Z2',
				targetRpe: [4, 5],
				workout: singleRunWorkout('long', longKm, paces),
			},
			durationMin: estDuration(longKm, paces ? paces.easy[1] : easyPace + 15),
		});

		// quality sessions
		qualityDays.forEach((day, qi) => {
			const isInterval = input.profile.sessionTypes.includes('interval') && (qi % 2 === 1 || !input.profile.sessionTypes.includes('tempo'));
			if (isInterval) {
				const reps = clamp(Math.round(qualityKm / 0.8 / 2) * 2, 4, 10);
				sessions.push({
					day,
					slot: 'AM',
					modality: 'running',
					type: 'interval',
					title: `${reps} × 800 m`,
					purpose: PURPOSE.interval,
					prescription: {
						summary: `${reps} × 800 m at interval pace, equal-time recovery.`,
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
					title: `Tempo ${qualityKm} km`,
					purpose: PURPOSE.tempo,
					prescription: {
						summary: `${qualityKm} km continuous at threshold pace.`,
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
					title: `Easy ${easyPer} km`,
					purpose: PURPOSE.easy,
					prescription: {
						summary: `Easy run ${easyPer} km, conversational.`,
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

		weeks.push({
			weekNumber: w + 1,
			phase,
			focus: FOCUS[phase] ?? phase,
			startDate: weekStart,
			endDate: weekEnd,
			targetVolumeKm: volume,
			sessions: sessions.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot)),
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

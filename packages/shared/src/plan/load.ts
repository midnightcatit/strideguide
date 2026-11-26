/**
 * The fitness and fatigue load model: a pure, deterministic lens.
 *
 * It scores one session's load, builds fitness (slow), fatigue (fast) and form
 * (fitness minus fatigue) as exponentially weighted moving averages, reads a
 * phase fitness target and an experience-scaled form floor from the plan's own
 * curve, and turns the recovery read into a continuous readiness score. It can
 * only ever ease or hold load. It never builds, never sets a distance, and never
 * overrides a safety ceiling the engine owns.
 *
 * Design: research/wave-6/load-model-design.md. The conventional 42 and 7 day
 * constants are TrainingPeaks/Coggan convention, not fitted truth, so they are
 * tunables with those defaults and are never presented as fixed.
 *
 * On the measure. The design names session-RPE as the primary measure, but sRPE
 * needs a completed log with an RPE, so it cannot score a prescribed session, and
 * scoring prescribed sessions is what a phase fitness target needs. So the
 * pace-based measure (an rTSS-lite, average pace against the VDOT threshold pace)
 * is primary for a planned session, session-RPE refines a completed session when
 * an RPE exists, and an estimated hrTSS is the optional last resort when an
 * average heart rate is present. The three are normalised to the same load-point
 * scale (an hour at threshold effort is 100 points) so the daily series has one
 * scale, and each session records which measure it used. See the design's data
 * reality table for why each measure is or is not available to us.
 *
 * This module is I/O-free and has no runtime imports: it is cheap to test, which
 * is what the testing philosophy wants for decision logic.
 */

import { epochMs } from '../dates';
import type { Prefs } from '../units';
import type { RecoverySignal } from './recovery';

/** Whether the model runs, and how far its decisions are allowed to reach. */
export type LoadMode = 'off' | 'shadow' | 'advisory' | 'apply';

/** Which measure scored a session. Recorded so a curve can be audited. */
export type LoadMethod = 'pace' | 'srpe' | 'hr';

/**
 * The Conventional RPE anchor mapped to "threshold effort". The engine's own
 * tempo target is RPE 6 to 7, so 6 is the fatigue-neutral anchor for an hour at
 * threshold, which makes an sRPE hour land near the 100-point pace scale.
 */
const SRPE_THRESHOLD_RPE = 6;

/** The reserve fraction an hour at threshold sits near, for the hr estimate. */
const HR_THRESHOLD_RESERVE = 0.86;

/** The pace intensity factor is held inside a plausible band, since a logged
 * distance or duration can be wrong (a paused watch, a treadmill). */
const PACE_IF_MIN = 0.4;
const PACE_IF_MAX = 1.8;

export interface LoadTunables {
	/** Fitness time constant in days. 42 is convention, not fitted truth. */
	fitnessDays: number;
	/** Fatigue time constant in days. 7 is convention, not fitted truth. */
	fatigueDays: number;
}

export interface LoadConfig {
	mode: LoadMode;
	tunables: LoadTunables;
	/** Form (TSB) at or below this triggers an ease. Undefined uses the floor by
	 * experience, so a runner's own value wins only when one is stored. */
	formFloor?: number;
	/** Form within this many points above the floor triggers a hold, not an ease. */
	easeMargin: number;
	/** The most a week's volume may be eased, as a fraction. Kept at the engine's
	 * own 10 percent weekly bound so the model works inside the existing ceiling. */
	maxEase: number;
	/** Readiness at or below this eases the next week. */
	readinessEaseBelow: number;
	/** Below this many logged sessions the model stays silent. */
	minSamples: number;
}

export const LOAD_DEFAULTS: LoadConfig = {
	mode: 'off',
	tunables: { fitnessDays: 42, fatigueDays: 7 },
	formFloor: -25,
	easeMargin: 10,
	maxEase: 0.1,
	readinessEaseBelow: 0.6,
	minSamples: 6,
};

/** Form floor by experience: shallower for beginners, deeper for advanced runners. */
const FORM_FLOOR_BY_EXPERIENCE: Record<string, number> = {
	beginner: -15,
	intermediate: -25,
	advanced: -35,
};

export function formFloorFor(experience: string | undefined): number {
	return FORM_FLOOR_BY_EXPERIENCE[experience ?? ''] ?? -25;
}

/** Resolve a runner's stored prefs into a load config, with safe defaults. */
export function resolveLoadConfig(prefs?: Partial<Prefs> | null): LoadConfig {
	const stored = prefs?.loadModel;
	const mode = stored?.mode ?? LOAD_DEFAULTS.mode;
	const fitnessDays = positiveOr(stored?.fitnessDays, LOAD_DEFAULTS.tunables.fitnessDays);
	const fatigueDays = positiveOr(stored?.fatigueDays, LOAD_DEFAULTS.tunables.fatigueDays);
	const formFloor =
		typeof stored?.formFloor === 'number' && Number.isFinite(stored.formFloor)
			? stored.formFloor
			: undefined;
	return {
		...LOAD_DEFAULTS,
		mode: MODES.includes(mode) ? mode : 'off',
		tunables: { fitnessDays, fatigueDays },
		formFloor,
	};
}

const MODES: LoadMode[] = ['off', 'shadow', 'advisory', 'apply'];

function positiveOr(value: number | undefined, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

/* ------------------------------ scoring a session ------------------------------ */

export interface SessionLoadInput {
	/** Running is the only modality the measures cover. Others score nothing. */
	modality?: string | null;
	distanceKm?: number | null;
	/** Duration in seconds. For a planned session this is durationMin times 60. */
	durationSec?: number | null;
	rpe?: number | null;
	avgHr?: number | null;
	/** True for a logged session, so sRPE may refine it. */
	completed?: boolean;
	thresholdPaceSecPerKm?: number | null;
	restHr?: number | null;
	age?: number | null;
}

export interface SessionLoad {
	/** Load points: an hour at threshold effort is 100. */
	load: number;
	method: LoadMethod;
}

/** Load points for an intensity factor over a duration. */
export function loadPoints(intensityFactor: number, durationSec: number): number {
	if (!(durationSec > 0) || !(intensityFactor > 0)) return 0;
	return intensityFactor * intensityFactor * (durationSec / 3600) * 100;
}

function isRunning(input: SessionLoadInput): boolean {
	if (input.modality != null) return input.modality === 'running' || input.modality === 'walking';
	// Unknown modality: only a distance makes it read as a run.
	return (input.distanceKm ?? 0) > 0;
}

/**
 * Score one session's load. Returns null when nothing scores it, so the session
 * contributes nothing to the curve rather than a false zero that would read as a
 * rest day. A planned run scores on pace; a completed run with an RPE scores on
 * sRPE; a completed run with neither falls back to pace, then to the hr estimate.
 */
export function scoreSession(input: SessionLoadInput): SessionLoad | null {
	if (!isRunning(input)) return null;
	const distanceKm = input.distanceKm ?? 0;
	const durationSec = input.durationSec ?? 0;

	// sRPE, for a completed session the runner rated. One method, one scale.
	if (input.completed && durationSec > 0 && typeof input.rpe === 'number' && input.rpe > 0 && input.rpe <= 10) {
		const factor = input.rpe / SRPE_THRESHOLD_RPE;
		return { load: round(loadPoints(factor, durationSec)), method: 'srpe' };
	}

	// Pace (rTSS-lite): average pace against the VDOT threshold pace.
	const threshold = input.thresholdPaceSecPerKm ?? 0;
	if (threshold > 0 && distanceKm > 0 && durationSec > 0) {
		const avgPace = durationSec / distanceKm;
		const factor = clamp(threshold / avgPace, PACE_IF_MIN, PACE_IF_MAX);
		return { load: round(loadPoints(factor, durationSec)), method: 'pace' };
	}

	// Estimated hrTSS, the optional last resort when an average heart rate reads.
	const age = input.age ?? 0;
	const restHr = input.restHr ?? 0;
	if (input.avgHr && age > 0 && restHr > 0 && durationSec > 0) {
		// Tanaka estimate, uncertain by roughly ten beats per minute.
		const maxHr = 208 - 0.7 * age;
		if (maxHr > restHr) {
			const reserve = (input.avgHr - restHr) / (maxHr - restHr);
			const factor = clamp(reserve / HR_THRESHOLD_RESERVE, PACE_IF_MIN, PACE_IF_MAX);
			return { load: round(loadPoints(factor, durationSec)), method: 'hr' };
		}
	}

	return null;
}

/* --------------------------------- the curves --------------------------------- */

export interface DailyLoad {
	/** ISO yyyy-mm-dd. */
	date: string;
	load: number;
}

export interface LoadPoint {
	date: string;
	load: number;
	fitness: number;
	fatigue: number;
	form: number;
}

/**
 * Build the daily fitness, fatigue and form series from a sparse set of daily
 * loads. Gaps are filled with zero so the moving averages advance every day.
 * Fitness and fatigue are rooted at a seed (zero by default), so the curve is
 * honest about a cold start rather than anchored at a false floor.
 */
export function loadCurve(
	daily: DailyLoad[],
	tunables: LoadTunables = LOAD_DEFAULTS.tunables,
	seed: { fitness: number; fatigue: number } = { fitness: 0, fatigue: 0 },
): LoadPoint[] {
	const byDate = new Map<string, number>();
	for (const d of daily) {
		if (!d.date) continue;
		byDate.set(d.date, (byDate.get(d.date) ?? 0) + (Number.isFinite(d.load) ? d.load : 0));
	}
	if (!byDate.size) return [];
	const dates = [...byDate.keys()].sort();
	const first = dates[0]!;
	const last = dates[dates.length - 1]!;
	const out: LoadPoint[] = [];
	let fitness = seed.fitness;
	let fatigue = seed.fatigue;
	for (let iso = first; iso <= last; iso = addDays(iso, 1)) {
		const load = byDate.get(iso) ?? 0;
		fitness += (load - fitness) / tunables.fitnessDays;
		fatigue += (load - fatigue) / tunables.fatigueDays;
		out.push({ date: iso, load, fitness: round(fitness), fatigue: round(fatigue), form: round(fitness - fatigue) });
	}
	return out;
}

/** The curve point for a date, or undefined when the date is outside the span. */
export function pointAt(points: LoadPoint[], iso: string): LoadPoint | undefined {
	return points.find((p) => p.date === iso);
}

/** The latest point at or before an ISO date. */
function latestOnOrBefore(points: LoadPoint[], iso: string): LoadPoint | undefined {
	let found: LoadPoint | undefined;
	for (const p of points) {
		if (p.date <= iso) found = p;
		else break;
	}
	return found;
}

/* --------------------------- inputs from logs and plans --------------------------- */

/** One logged session, enough to score it. */
export interface LoadEntry {
	date?: string | number | null;
	modality?: string | null;
	distanceKm?: number | null;
	durationSec?: number | null;
	avgPaceSecPerKm?: number | null;
	rpe?: number | null;
	avgHr?: number | null;
}

/** The daily loads from logged sessions, scored with the best available measure. */
export function loggedDailyLoads(
	entries: LoadEntry[],
	opts: { thresholdPaceSecPerKm?: number; restHr?: number; age?: number } = {},
): DailyLoad[] {
	const out: DailyLoad[] = [];
	for (const e of entries) {
		const date = isoDay(e.date);
		if (!date) continue;
		const durationSec =
			e.durationSec ?? (e.distanceKm && e.avgPaceSecPerKm ? e.avgPaceSecPerKm * e.distanceKm : 0);
		const scored = scoreSession({
			modality: e.modality,
			distanceKm: e.distanceKm,
			durationSec,
			rpe: e.rpe,
			avgHr: e.avgHr,
			completed: true,
			thresholdPaceSecPerKm: opts.thresholdPaceSecPerKm,
			restHr: opts.restHr,
			age: opts.age,
		});
		if (scored) out.push({ date, load: scored.load });
	}
	return out;
}

/** A week as the load model reads it: its dates and its planned running sessions. */
export interface LoadWeek {
	weekNumber: number;
	phase?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	sessions: {
		day: number;
		modality: string;
		durationMin?: number;
		prescription?: { targetDistanceKm?: number | null } | null;
	}[];
}

/**
 * The daily loads from planned sessions after a cutoff date, scored on pace.
 * Only sessions after the cutoff count: a session already logged (or missed) is
 * represented by its log, so counting the plan too would double the load.
 */
export function plannedDailyLoads(
	weeks: LoadWeek[],
	thresholdPaceSecPerKm: number,
	afterIso: string,
): DailyLoad[] {
	const out: DailyLoad[] = [];
	for (const w of weeks) {
		if (!w.startDate) continue;
		for (const s of w.sessions) {
			if (s.modality !== 'running' && s.modality !== 'walking') continue;
			const distanceKm = s.prescription?.targetDistanceKm ?? 0;
			const durationSec = (s.durationMin ?? 0) * 60;
			const date = addDays(w.startDate, s.day);
			if (date <= afterIso || distanceKm <= 0 || durationSec <= 0) continue;
			const scored = scoreSession({ modality: 'running', distanceKm, durationSec, thresholdPaceSecPerKm });
			if (scored) out.push({ date, load: scored.load });
		}
	}
	return out;
}

/** The threshold pace from a VDOT, or undefined when the VDOT is missing. */
export function thresholdPaceFromVdot(vdot: number | undefined | null): number | undefined {
	if (typeof vdot !== 'number' || !Number.isFinite(vdot) || vdot <= 0) return undefined;
	// Local import avoided: the formula is tiny and keeps this module import-light.
	// pacesFromVdot(vdot).threshold, inlined for the inv(VO2) step at 86 percent.
	const vo2 = vdot * 0.86;
	const a = 0.000104;
	const b = 0.182258;
	const c = -4.6 - vo2;
	const disc = b * b - 4 * a * c;
	if (disc < 0) return undefined;
	const v = (-b + Math.sqrt(disc)) / (2 * a);
	return v > 0 ? (1000 / v) * 60 : undefined;
}

/* --------------------------------- readiness --------------------------------- */

export interface ReadinessScore {
	/** 1 is fully ready, 0 is heavily strained. */
	score: number;
	/** Plain phrases for the signals that lowered the score, if any. */
	factors: string[];
}

/** How much each recovery flag lowers the readiness score. */
const READINESS_WEIGHT: { key: keyof RecoverySignal; weight: number; phrase: string }[] = [
	{ key: 'restingHrElevated', weight: 0.2, phrase: 'resting heart rate is up' },
	{ key: 'hrvSuppressed', weight: 0.25, phrase: 'HRV is down' },
	{ key: 'shortSleep', weight: 0.2, phrase: 'sleep has been short' },
	{ key: 'lowSpo2', weight: 0.15, phrase: 'oxygen saturation has dipped' },
	{ key: 'respiratoryRateElevated', weight: 0.15, phrase: 'breathing rate is up' },
	{ key: 'sleepTempElevated', weight: 0.15, phrase: 'night temperature is up' },
];

/**
 * Turn the binary recovery flags into a continuous 0 to 1 readiness score. The
 * score can only lower load, so a runner with no flags reads 1 (no change) and
 * each flagged signal lowers it.
 */
export function readinessScore(signal?: RecoverySignal | null): ReadinessScore {
	if (!signal) return { score: 1, factors: [] };
	let penalty = 0;
	const factors: string[] = [];
	for (const { key, weight, phrase } of READINESS_WEIGHT) {
		if (signal[key] === true) {
			penalty += weight;
			factors.push(phrase);
		}
	}
	return { score: round2(clamp(1 - penalty, 0, 1)), factors };
}

/* ------------------------------ the model's read ------------------------------ */

export interface LoadWeekIntent {
	weekNumber: number;
	/** The engine's own vocabulary: the model may only ease or hold. */
	intent: 'ease' | 'hold';
	/** Plain reason with the modelled numbers, for the read-out and the record. */
	reason: string;
	/**
	 * A plain, number-free sentence for the session "why". It carries no distance,
	 * unit, pace or figure, so the reason rephrase gate never has to reject it.
	 */
	note: string;
	/** Modelled form at the end of this week. */
	form: number;
	/** Modelled fitness (the phase fitness target this week reaches). */
	targetFitness: number;
}

/** One change the model would make in shadow mode, recorded and not applied. */
export interface LoadShadowChange {
	weekNumber: number;
	fromVolumeKm: number;
	toVolumeKm: number;
	intent: 'ease' | 'hold';
	reason: string;
}

export interface LoadRead {
	/** False when there is not enough to go on; the plan is then untouched. */
	available: boolean;
	mode: LoadMode;
	/** Today's modelled numbers, when available. */
	fitness: number;
	fatigue: number;
	form: number;
	readiness: ReadinessScore;
	/** The daily series, for the read-out. */
	points: LoadPoint[];
	/** The ease or hold the model wants per future week. Empty when it is silent. */
	weekIntents: LoadWeekIntent[];
	/** What those intents would change, for the shadow record. */
	shadow: LoadShadowChange[];
	/** A short plain status line, or undefined when the model has nothing to say. */
	note?: string;
}

export interface LoadReadInput {
	weeks: LoadWeek[];
	/** Today, ISO yyyy-mm-dd. */
	today: string;
	logged: LoadEntry[];
	thresholdPaceSecPerKm?: number;
	experience?: string;
	recovery?: RecoverySignal | null;
	config: LoadConfig;
	restHr?: number;
	age?: number;
}

/**
 * The whole read: score what was logged, extend it with the plan's own planned
 * load, build the curve, and decide where to ease or hold. Everything here is
 * derived from the plan's own curve and the runner's own logs, so it can only
 * ever suggest easing or holding, and a thin history leaves the plan untouched.
 */
export function readLoad(input: LoadReadInput): LoadRead {
	const { config } = input;
	const readiness = readinessScore(input.recovery);
	const silent: LoadRead = {
		available: false,
		mode: config.mode,
		fitness: 0,
		fatigue: 0,
		form: 0,
		readiness,
		points: [],
		weekIntents: [],
		shadow: [],
	};
	if (config.mode === 'off') return silent;
	if (!(input.thresholdPaceSecPerKm && input.thresholdPaceSecPerKm > 0)) return silent;

	const actual = loggedDailyLoads(input.logged, {
		thresholdPaceSecPerKm: input.thresholdPaceSecPerKm,
		restHr: input.restHr,
		age: input.age,
	});
	if (actual.length < config.minSamples) return silent;

	const planned = plannedDailyLoads(input.weeks, input.thresholdPaceSecPerKm, input.today);
	const points = loadCurve([...actual, ...planned], config.tunables);
	if (!points.length) return silent;

	const todayPoint = latestOnOrBefore(points, input.today) ?? points[points.length - 1]!;
	const floor = config.formFloor ?? formFloorFor(input.experience);
	const futureWeeks = input.weeks
		.filter((w) => w.startDate && w.startDate > input.today)
		.sort((a, b) => a.weekNumber - b.weekNumber);

	const weekIntents: LoadWeekIntent[] = [];
	const shadow: LoadShadowChange[] = [];
	futureWeeks.forEach((w, i) => {
		const endIso = w.endDate ?? addDays(w.startDate!, 6);
		const endPoint = latestOnOrBefore(points, endIso);
		if (!endPoint) return;
		// Sustained, not a single day: form must sit below the floor for at least
		// three days of the week, so a normal peak-week trough does not trigger an ease.
		const weekPoints = points.filter((p) => p.date >= w.startDate! && p.date <= endIso);
		const belowDays = weekPoints.filter((p) => p.form < floor).length;
		const nearDays = weekPoints.filter((p) => p.form < floor + config.easeMargin).length;

		let intent: 'ease' | 'hold' | undefined;
		let reason = '';
		let note = '';
		if (belowDays >= 3) {
			intent = 'ease';
			reason = `Modelled form drops to ${Math.round(endPoint.form)} by the end of this week, below your floor of ${floor}.`;
			note = 'This week eases back because modelled form is running below your floor.';
		} else if (nearDays >= 4) {
			intent = 'hold';
			reason = `Modelled form is near your floor of ${floor} this week, so it holds rather than builds.`;
			note = 'This week holds rather than building, because modelled form is near your floor.';
		}
		// Readiness only ever lowers load, and it acts on the nearest week ahead.
		if (i === 0 && readiness.score < config.readinessEaseBelow && intent !== 'ease') {
			intent = 'ease';
			reason = `Readiness is low (${Math.round(readiness.score * 100)} percent)${readiness.factors.length ? `: ${readiness.factors.join(', ')}` : ''}.`;
			note = 'This week eases back because your recent recovery signals are low.';
		}
		if (!intent) return;

		weekIntents.push({
			weekNumber: w.weekNumber,
			intent,
			reason,
			note,
			form: endPoint.form,
			targetFitness: endPoint.fitness,
		});
		const plannedKm = plannedVolume(w);
		const toKm = intent === 'ease' ? round(plannedKm * (1 - config.maxEase)) : plannedKm;
		shadow.push({ weekNumber: w.weekNumber, fromVolumeKm: plannedKm, toVolumeKm: toKm, intent, reason });
	});

	const note = weekIntents.length
		? `Form is ${Math.round(todayPoint.form)} today; the model would ${weekIntents.length === 1 ? 'ease or hold one week' : `ease or hold ${weekIntents.length} weeks`} ahead.`
		: undefined;

	return {
		available: true,
		mode: config.mode,
		fitness: todayPoint.fitness,
		fatigue: todayPoint.fatigue,
		form: todayPoint.form,
		readiness,
		points,
		weekIntents,
		shadow,
		note,
	};
}

function plannedVolume(w: LoadWeek): number {
	return round(
		w.sessions
			.filter((s) => s.modality === 'running' || s.modality === 'walking')
			.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0),
	);
}

/**
 * Apply the model's read to the engine's own per-week shapes, keeping only the
 * easing and holding it is allowed. The result never raises a week above the
 * engine's curve: it only ever lowers the intent. This is the never-build rule
 * enforced in one place. It returns nothing unless the mode is `apply`, so a
 * shadow or advisory run changes no week.
 */
export function loadWeekShapes(read?: LoadRead | null): Map<number, { volumeIntent: 'ease' | 'hold' }> {
	const out = new Map<number, { volumeIntent: 'ease' | 'hold' }>();
	if (!read || read.mode !== 'apply') return out;
	for (const w of read.weekIntents) out.set(w.weekNumber, { volumeIntent: w.intent });
	return out;
}

/** The stricter of two volume intents, so a lower intent always wins. */
export function stricterIntent(
	a: 'ease' | 'hold' | 'build' | undefined,
	b: 'ease' | 'hold',
): 'ease' | 'hold' {
	if (a === undefined) return b;
	return a === 'ease' ? 'ease' : b === 'ease' ? 'ease' : 'hold';
}

/**
 * Fold the load model's easing and holding onto an existing per-week shape list,
 * aligned by index to `weekNumbers`, using the never-build rule. A no-op unless
 * the mode is `apply`, so shadow and advisory runs leave the shapes exactly as
 * they were. The result is always a new array, safe to hand to the engine.
 */
export function applyLoadToShapes<T extends { volumeIntent?: 'ease' | 'hold' | 'build'; loadNote?: string }>(
	shapes: (T | undefined)[],
	read: LoadRead | undefined,
	weekNumbers: number[],
): (T | undefined)[] {
	if (!read || read.mode !== 'apply' || !read.weekIntents.length) return shapes;
	const byWeek = new Map(read.weekIntents.map((w) => [w.weekNumber, w]));
	return shapes.map((shape, i) => {
		const week = byWeek.get(weekNumbers[i]!);
		if (!week) return shape;
		const base = (shape ?? {}) as T;
		return {
			...base,
			volumeIntent: stricterIntent(base.volumeIntent, week.intent),
			loadNote: week.reason,
		};
	});
}

/* -------------------------------- the read-out -------------------------------- */

export interface LoadReadout {
	fitness: number;
	fatigue: number;
	form: number;
	/** Plain one-line status, grounded in the numbers. Never a promise. */
	status: string;
}

/**
 * A small read-out: the current fitness, fatigue and form, with a plain line.
 * Descriptive only, never a prediction. The wording avoids promising that the
 * model improves performance, because the measured benefit is small.
 */
export function loadReadout(read: LoadRead): LoadReadout | null {
	if (!read.available) return null;
	const { fitness, fatigue, form } = read;
	let status: string;
	if (form <= -30) status = 'Fatigue is running well ahead of fitness, a good week to take it easier.';
	else if (form < 0) status = 'You are carrying some fatigue, which is normal in a build.';
	else if (form < 15) status = 'You have built fitness and are close to fresh.';
	else status = 'You look fresh, with more fitness than fatigue.';
	return { fitness, fatigue, form, status };
}

/* --------------------------------- helpers --------------------------------- */

function isoDay(value: string | number | null | undefined): string | undefined {
	const ms = epochMs(value);
	if (ms === undefined) return undefined;
	return new Date(ms).toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
	const d = new Date(`${iso}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

function clamp(n: number, lo: number, hi: number): number {
	return Math.min(hi, Math.max(lo, n));
}

function round(n: number): number {
	return Math.round(n * 10) / 10;
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

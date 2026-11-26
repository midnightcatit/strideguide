/**
 * The one pipeline every plan change goes through.
 *
 * A change is described by a context (the goal, the previous plan
 * configuration, the runner's history and the intent) and answered by a set of
 * typed, confidence-scored decisions: the week's volume intent, the number of
 * quality days, and the long-run delta. Each decision is an enum with a
 * confidence, never a free-form instruction, so the engine still computes every
 * distance and pace. The AI decides what to change and why; the numbers stay the
 * engine's.
 *
 * This module is pure and I/O-free: it holds the decision vocabulary, the
 * mapping from a model answer to a typed decision, the mapping from decisions to
 * the engine's own per-week shape, and the reasons composition. The model call
 * itself (Jev) lives in the API layer. Every function here is testable without a
 * live model, and the caller falls back to the deterministic plan whenever a
 * decision is missing.
 *
 * The same shape serves every path that changes a plan. Only the context's
 * `intent` and which weeks it names as affected differ:
 *  - `adapt`: the runner asked to bring the plan in line with their recent
 *    training. Affected weeks are the ones ahead.
 *  - `missed-week`: a specific week was missed. Affected weeks are the next one
 *    or two, and the history carries the missed count.
 *  - `goal-change`: the race or target moved. The context's goal and the
 *    affected weeks run from the change forward.
 *  - `equipment-change`: the runner's kit changed. The affected weeks are the
 *    ones ahead, and the decisions are the same three, read against the new kit.
 */
import { epochMs } from '../dates';
import type { LongRunDelta, QualityDayCount, VolumeIntent, WeekShape } from './types';
import type { FitnessState } from './fitness';
import type { AdaptLog, AdaptWeek } from './adapt';

/** What triggered the change. The decisions are the same for every path. */
export type PlanChangeIntent = 'adapt' | 'goal-change' | 'equipment-change' | 'missed-week';

export const VOLUME_INTENTS: readonly VolumeIntent[] = ['ease', 'hold', 'build'];
export const LONG_RUN_DELTAS: readonly LongRunDelta[] = ['ease', 'hold', 'build'];

/** The option names Jev answers with, and the count each stands for. */
export const QUALITY_COUNT_OPTIONS = ['none', 'one', 'two'] as const;
export type QualityCountOption = (typeof QUALITY_COUNT_OPTIONS)[number];

/** Option wording handed to Jev, kept as data so it reads the same everywhere. */
export const VOLUME_INTENT_OPTIONS: Record<VolumeIntent, string> = {
	ease: 'Ease the running volume back below the plan curve.',
	hold: 'Hold the running volume at about the plan curve.',
	build: 'Build the running volume on the plan curve.',
};

export const QUALITY_COUNT_LABELS: Record<QualityCountOption, string> = {
	none: 'No hard quality day this week.',
	one: 'One hard quality day this week.',
	two: 'Two hard quality days this week.',
};

export const LONG_RUN_DELTA_OPTIONS: Record<LongRunDelta, string> = {
	ease: 'Ease the long run back below the plan.',
	hold: 'Hold the long run at about the plan.',
	build: 'Build the long run on the plan.',
};

/** A typed decision: a value from a closed set, with the model's confidence. */
export interface ChangeDecision<T> {
	value: T;
	/** Calibrated confidence in the decision, 0 to 1. */
	confidence: number;
}

/** One week's decisions. Any part may be missing when that call did not answer. */
export interface WeekChangeDecision {
	weekNumber: number;
	volumeIntent?: ChangeDecision<VolumeIntent>;
	qualityDayCount?: ChangeDecision<QualityDayCount>;
	longRunDelta?: ChangeDecision<LongRunDelta>;
}

export interface PlanChangeDecisions {
	weeks: WeekChangeDecision[];
}

/** The plan's configuration for one week, as the pipeline reads it back. */
export interface PreviousWeek {
	weekNumber: number;
	phase: string;
	/** Planned running volume, in km. Engine-internal; never printed. */
	volumeKm: number;
	/** Planned long-run distance, in km; 0 when the week has none. */
	longKm: number;
	/** Planned hard running sessions this week. */
	qualityCount: number;
}

/**
 * The runner's history, compact enough to hand to the model and to reason from.
 * Every field is read from what the runner actually logged; nothing is guessed.
 */
export interface ChangeHistory {
	/** Average running distance per week over the recent window, in km. */
	recentWeeklyKm: number;
	/** How many logged sessions the read is based on. */
	samples: number;
	/** Whether effort has drifted up, down or held. */
	rpeTrend?: 'rising' | 'steady' | 'falling';
	/** Session types the runner rated up more than down. */
	likedTypes: string[];
	/** Session types the runner rated down more than up. */
	dislikedTypes: string[];
	/** Past running sessions that were never logged. */
	missedSessions: number;
	/** The most recent completed week's actual over planned running volume. */
	lastWeekAdherence?: number;
	/** Consecutive most recent logged sessions at RPE 8 or above. */
	hardStreak: number;
}

export interface PlanChangeGoal {
	slug: string;
	name: string;
	/** Whole weeks from today to race day, when the goal has a race. */
	weeksToRace?: number;
}

/** Everything the pipeline is handed before it decides anything. */
export interface PlanChangeContext {
	intent: PlanChangeIntent;
	goal: PlanChangeGoal;
	previous: PreviousWeek[];
	history: ChangeHistory;
	/** The weeks the change applies to, ascending. */
	affectedWeekNumbers: number[];
}

/* ------------------------------ model answers ------------------------------ */

/** One raw answer from Jev: the chosen option name and its confidence. */
export interface RawDecision {
	value: string;
	confidence: number;
}

function validConfidence(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function decideEnum<T extends string>(
	raw: RawDecision | null | undefined,
	allowed: readonly T[],
): ChangeDecision<T> | undefined {
	if (!raw || !validConfidence(raw.confidence)) return undefined;
	const value = allowed.find((v) => v === raw.value);
	return value === undefined ? undefined : { value, confidence: raw.confidence };
}

/** Map a quality-count option name to the count it stands for. */
export function qualityCountFromOption(option: string): QualityDayCount | undefined {
	switch (option) {
		case 'none':
			return 0;
		case 'one':
			return 1;
		case 'two':
			return 2;
		default:
			return undefined;
	}
}

/**
 * Turn one week's raw model answers into typed decisions. An answer outside the
 * closed set, or with an out-of-range confidence, is dropped rather than trusted.
 * Returns null when no answer for the week is usable, so the week keeps the
 * engine's own shape.
 */
export function buildWeekDecision(
	weekNumber: number,
	raw: {
		volume?: RawDecision | null;
		quality?: RawDecision | null;
		longRun?: RawDecision | null;
	},
): WeekChangeDecision | null {
	const volumeIntent = decideEnum(raw.volume, VOLUME_INTENTS);
	const qualityValue = raw.quality ? qualityCountFromOption(raw.quality.value) : undefined;
	const qualityDayCount: ChangeDecision<QualityDayCount> | undefined =
		raw.quality && qualityValue !== undefined && validConfidence(raw.quality.confidence)
			? { value: qualityValue, confidence: raw.quality.confidence }
			: undefined;
	const longRunDelta = decideEnum(raw.longRun, LONG_RUN_DELTAS);

	if (!volumeIntent && !qualityDayCount && !longRunDelta) return null;
	return {
		weekNumber,
		...(volumeIntent ? { volumeIntent } : {}),
		...(qualityDayCount ? { qualityDayCount } : {}),
		...(longRunDelta ? { longRunDelta } : {}),
	};
}

/* --------------------------- decisions to engine --------------------------- */

/**
 * Map the typed decisions onto the engine's per-week shape, keyed by week number.
 * A week with no decision is left out, so the engine keeps its own curve for it.
 * Only the decisions themselves are written: no distance or pace is ever set.
 */
export function decisionsToWeekShapes(decisions: PlanChangeDecisions): Map<number, WeekShape> {
	const out = new Map<number, WeekShape>();
	for (const week of decisions.weeks) {
		const shape: WeekShape = {};
		if (week.volumeIntent) shape.volumeIntent = week.volumeIntent.value;
		if (week.qualityDayCount) shape.qualityDayCount = week.qualityDayCount.value;
		if (week.longRunDelta) shape.longRunDelta = week.longRunDelta.value;
		if (Object.keys(shape).length) out.set(week.weekNumber, shape);
	}
	return out;
}

/* -------------------------------- reasons --------------------------------- */

/** A reason per decision for one week. A part with nothing true to say is absent. */
export interface WeekChangeReason {
	weekNumber: number;
	volume?: string;
	quality?: string;
	longRun?: string;
}

function volumeReason(value: VolumeIntent, ctx: PlanChangeContext): string | undefined {
	const h = ctx.history;
	if (value === 'ease') {
		if (h.missedSessions >= 3) {
			return 'Three sessions went unlogged last week, so this week eases back rather than stacking them up.';
		}
		if (h.missedSessions >= 1) {
			return 'A session went unlogged, so this week eases back a little.';
		}
		if (h.rpeTrend === 'rising') {
			return 'Effort has been climbing, so this week eases the volume to help you absorb the work.';
		}
		if (h.lastWeekAdherence !== undefined && h.lastWeekAdherence < 0.6) {
			return 'You logged well under plan last week, so this week eases back in rather than jumping straight up.';
		}
		return undefined;
	}
	if (value === 'hold') {
		if (h.lastWeekAdherence !== undefined && h.lastWeekAdherence < 0.8) {
			return 'You logged under plan last week, so this week holds the volume instead of building on it.';
		}
		if (h.rpeTrend === 'rising') {
			return 'Effort has been rising, so this week holds the volume where it is.';
		}
		return undefined;
	}
	// build: only worth saying when the history supports it, otherwise stay quiet.
	if (
		h.missedSessions === 0 &&
		h.rpeTrend !== 'rising' &&
		h.lastWeekAdherence !== undefined &&
		h.lastWeekAdherence >= 0.95
	) {
		return 'You hit plan last week and effort held, so this week builds on it.';
	}
	return undefined;
}

function qualityReason(count: QualityDayCount, ctx: PlanChangeContext): string | undefined {
	if (count === 0 && ctx.history.hardStreak >= 3) {
		return 'Three hard sessions in a row, so the hard work comes out of this week.';
	}
	return undefined;
}

function longRunReason(
	value: LongRunDelta,
	ctx: PlanChangeContext,
	volume: VolumeIntent | undefined,
	volumeHasReason: boolean,
): string | undefined {
	// When the volume note already says the same thing, do not repeat it.
	if (volumeHasReason && value === volume) return undefined;
	const h = ctx.history;
	if (value === 'ease') {
		if (h.missedSessions >= 1) return 'The long run eases back with the week.';
		if (h.lastWeekAdherence !== undefined && h.lastWeekAdherence < 0.8) {
			return 'The long run eases back with the week.';
		}
		return undefined;
	}
	if (
		value === 'build' &&
		h.missedSessions === 0 &&
		h.rpeTrend !== 'rising' &&
		h.lastWeekAdherence !== undefined &&
		h.lastWeekAdherence >= 0.95
	) {
		return 'You have kept to plan, so the long run builds on last week.';
	}
	return undefined;
}

/**
 * Compose a grounded reason for each decision. Every sentence follows from a
 * history signal the context actually carries, so nothing is invented: a
 * decision with no supporting input is left without a reason.
 */
export function composeChangeReasons(
	decisions: PlanChangeDecisions,
	ctx: PlanChangeContext,
): WeekChangeReason[] {
	return decisions.weeks.map((week) => {
		const volume = week.volumeIntent?.value;
		const volumeText = volume ? volumeReason(volume, ctx) : undefined;
		const qualityText = week.qualityDayCount
			? qualityReason(week.qualityDayCount.value, ctx)
			: undefined;
		const longRunText = week.longRunDelta
			? longRunReason(week.longRunDelta.value, ctx, volume, !!volumeText)
			: undefined;
		return {
			weekNumber: week.weekNumber,
			...(volumeText ? { volume: volumeText } : {}),
			...(qualityText ? { quality: qualityText } : {}),
			...(longRunText ? { longRun: longRunText } : {}),
		};
	});
}

/** One short note for a week, joining its reasons, or undefined when there are none. */
export function weekChangeNote(reason: WeekChangeReason): string | undefined {
	const parts = [reason.volume, reason.quality, reason.longRun].filter(
		(p): p is string => typeof p === 'string' && p.length > 0,
	);
	return parts.length ? parts.join(' ') : undefined;
}

/* ---------------------------- reading the past ----------------------------- */

const QUALITY_TYPES = new Set([
	'tempo',
	'threshold',
	'interval',
	'race-pace',
	'strides',
	'hills',
	'fartlek',
]);

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

/** Read the plan's own configuration back, week by week, for the context. */
export function summarizePreviousWeeks(weeks: AdaptWeek[]): PreviousWeek[] {
	return weeks.map((w) => {
		const running = w.sessions.filter((s) => s.modality === 'running' && s.type !== 'race');
		const volumeKm = running.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0);
		const longKm =
			w.sessions.find((s) => s.type === 'long')?.prescription?.targetDistanceKm ?? 0;
		const qualityCount = w.sessions.filter(
			(s) => s.modality === 'running' && QUALITY_TYPES.has(s.type),
		).length;
		return {
			weekNumber: w.weekNumber,
			phase: w.phase ?? 'base',
			volumeKm: Math.round(volumeKm * 10) / 10,
			longKm: Math.round(longKm * 10) / 10,
			qualityCount,
		};
	});
}

/**
 * Read the runner's history from their own logs and plan. The volume, effort
 * trend and feedback come from the fitness read; the missed count, adherence and
 * hard streak are derived here. Pure, so it is cheap to test and never guesses.
 */
export function deriveHistory(
	logs: AdaptLog[],
	weeks: AdaptWeek[],
	fitness: Pick<
		FitnessState,
		'recentWeeklyKm' | 'rpeTrend' | 'likedTypes' | 'dislikedTypes' | 'samples'
	>,
	todayIso: string,
	windowDays = 28,
): ChangeHistory {
	const loggedIds = new Set(logs.filter((l) => l.sessionId).map((l) => l.sessionId as string));
	const windowStart = addDays(todayIso, -windowDays);

	// Sessions that have already passed and were never logged. Mobility and the
	// cross-train slot are not counted, since they are not the running the plan
	// is built around. Only the recent window is read, matching the logs the
	// caller supplies, so a session logged long ago is never counted as missed.
	const dated: { date: string; sessionId: string; type: string; modality: string }[] = [];
	for (const w of weeks) {
		if (!w.startDate) continue;
		for (const s of w.sessions) {
			dated.push({ date: addDays(w.startDate, s.day), sessionId: s.id, type: s.type, modality: s.modality });
		}
	}
	const missedSessions = dated.filter(
		(d) =>
			d.date < todayIso &&
			d.date >= windowStart &&
			d.modality !== 'mobility' &&
			d.type !== 'cross-train' &&
			!loggedIds.has(d.sessionId),
	).length;

	// The most recent completed week's adherence, when a week has finished and
	// carried a planned distance.
	const kmBySession = new Map<string, number>();
	for (const l of logs) {
		if (!l.sessionId) continue;
		kmBySession.set(l.sessionId, (kmBySession.get(l.sessionId) ?? 0) + (l.runStats?.distanceKm ?? 0));
	}
	let lastWeekAdherence: number | undefined;
	for (const w of weeks) {
		const planned = w.sessions
			.filter((s) => s.modality === 'running')
			.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0);
		const start = w.startDate;
		if (!start || planned <= 0) continue;
		const end = w.endDate ?? addDays(start, 6);
		if (end >= todayIso) continue;
		const actual = w.sessions
			.filter((s) => loggedIds.has(s.id))
			.reduce((sum, s) => sum + (kmBySession.get(s.id) ?? 0), 0);
		if (actual > 0) lastWeekAdherence = Math.round((actual / planned) * 100) / 100;
	}

	// Consecutive most recent logged sessions at a hard effort.
	const withRpe = logs
		.filter((l) => typeof l.rpe === 'number')
		.slice()
		.sort((a, b) => (isoDay(a.createdAt) ?? '').localeCompare(isoDay(b.createdAt) ?? ''));
	let hardStreak = 0;
	for (let i = withRpe.length - 1; i >= 0; i--) {
		if ((withRpe[i]!.rpe ?? 0) >= 8) hardStreak++;
		else break;
	}

	return {
		recentWeeklyKm: fitness.recentWeeklyKm,
		samples: fitness.samples,
		...(fitness.rpeTrend ? { rpeTrend: fitness.rpeTrend } : {}),
		likedTypes: fitness.likedTypes,
		dislikedTypes: fitness.dislikedTypes,
		missedSessions,
		...(lastWeekAdherence !== undefined ? { lastWeekAdherence } : {}),
		hardStreak,
	};
}

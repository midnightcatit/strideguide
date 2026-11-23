import type {
	GoogleDailyHeartRateVariability,
	GoogleDailyRestingHeartRate,
	GoogleDataPoint,
	GoogleExercise,
	GoogleSleep,
	GoogleSteps,
} from './google-health';

/**
 * Pure mapping from Google Health data points to our own rows.
 *
 * Nothing here does I/O, so it is cheap to unit test with fixtures and needs no
 * live credentials. The field names were verified against the Google Health API
 * reference; if one changes, this file is the single place to correct.
 */

export type ActivityModality =
	| 'running'
	| 'walking'
	| 'strength'
	| 'mobility'
	| 'recovery'
	| 'cross-train';

/** The subset of an `activities` row the mapper fills. */
export interface MappedActivity {
	externalId: string;
	modality: ActivityModality;
	type: string | null;
	startedAt: Date;
	durationSec: number | null;
	distanceM: number | null;
	avgPaceSecPerKm: number | null;
	avgHr: number | null;
	maxHr: number | null;
	calories: number | null;
	source: string | null;
	route: unknown | null;
	raw: unknown;
}

/** A partial `health_daily` row for one civil day. */
export interface DailyPatch {
	date: string;
	restingHr?: number | null;
	hrvMs?: number | null;
	sleepMin?: number | null;
	steps?: number | null;
	raw?: Record<string, unknown>;
}

/** A `health_daily` row as stored, before a merge. */
export interface DailyRow {
	date: string;
	restingHr: number | null;
	hrvMs: number | null;
	sleepMin: number | null;
	steps: number | null;
	raw: Record<string, unknown> | null;
}

/**
 * Exercise type to plan modality, kept as data. Anything not listed falls to
 * `cross-train`, so a new Google exercise type never needs new logic.
 */
const EXERCISE_MODALITY: Record<string, ActivityModality> = {
	RUNNING: 'running',
	TRAIL_RUN: 'running',
	TREADMILL: 'running',
	INCLINE_RUN: 'running',
	TRACK_AND_FIELD: 'running',
	PARKOUR: 'running',
	WALKING: 'walking',
	POWER_WALKING: 'walking',
	NORDIC_WALKING: 'walking',
	INCLINE_WALK: 'walking',
	TREADMILL_WALK: 'walking',
	STROLLER_WALK: 'walking',
	RUCKING: 'walking',
	HIKING: 'walking',
	BACKPACKING: 'walking',
	STRENGTH_TRAINING: 'strength',
	FUNCTIONAL_STRENGTH_TRAINING: 'strength',
	WEIGHTLIFTING: 'strength',
	WEIGHTS: 'strength',
	WEIGHT_MACHINES: 'strength',
	FREE_WEIGHTS: 'strength',
	POWERLIFTING: 'strength',
	CORE_TRAINING: 'strength',
	BODY_WEIGHT: 'strength',
	CALISTHENICS: 'strength',
	CIRCUIT_TRAINING: 'strength',
	CROSSFIT: 'strength',
	TRX: 'strength',
	RESISTANCE_BANDS: 'strength',
	WALK_WITH_WEIGHTS: 'strength',
	STRETCHING: 'mobility',
	YOGA: 'mobility',
	YOGA_BIKRAM: 'mobility',
	YOGA_HATHA: 'mobility',
	YOGA_POWER: 'mobility',
	YOGA_VINYASA: 'mobility',
	PILATES: 'mobility',
	TAI_CHI: 'mobility',
	BARRE_CLASS: 'mobility',
	MEDITATE: 'recovery',
};

export function modalityForExerciseType(type: string | undefined): ActivityModality {
	if (!type) return 'cross-train';
	return EXERCISE_MODALITY[type] ?? 'cross-train';
}

/** Parse a Google duration like `"1800s"` or `"1800.5s"` into whole seconds. */
export function parseDurationSeconds(value: string | undefined): number | null {
	if (!value) return null;
	const match = /^(-?\d+(?:\.\d+)?)s?$/.exec(value.trim());
	if (!match) return null;
	const seconds = Number(match[1]);
	return Number.isFinite(seconds) ? Math.round(seconds) : null;
}

/** Parse a Google UTC offset like `"-14400s"` into seconds. */
export function parseUtcOffsetSeconds(value: string | undefined): number {
	if (!value) return 0;
	const match = /^(-?\d+(?:\.\d+)?)s?$/.exec(value.trim());
	if (!match) return 0;
	const seconds = Number(match[1]);
	return Number.isFinite(seconds) ? seconds : 0;
}

function toInt(value: string | number | undefined | null): number | null {
	if (value === undefined || value === null || value === '') return null;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? Math.round(n) : null;
}

function toNumber(value: number | undefined | null): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** The civil date (YYYY-MM-DD) of an instant seen through a UTC offset. */
export function civilDateFromInstant(instant: string | undefined, offsetSeconds: number): string | null {
	if (!instant) return null;
	const ms = Date.parse(instant);
	if (!Number.isFinite(ms)) return null;
	const shifted = new Date(ms + offsetSeconds * 1000);
	return shifted.toISOString().slice(0, 10);
}

/** Convert the `{ year, month, day }` on the daily types into YYYY-MM-DD. */
export function dateFromGoogleDate(date: { year?: number | string; month?: number | string; day?: number | string } | undefined): string | null {
	if (!date) return null;
	const year = toInt(date.year);
	const month = toInt(date.month);
	const day = toInt(date.day);
	if (year === null || month === null || day === null) return null;
	return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Pace in seconds per kilometre from distance and active time. */
function paceFromDistanceAndDuration(distanceM: number | null, durationSec: number | null): number | null {
	if (distanceM === null || durationSec === null) return null;
	if (distanceM <= 0 || durationSec <= 0) return null;
	return durationSec / (distanceM / 1000);
}

function secondsBetween(start: string | undefined, end: string | undefined): number | null {
	if (!start || !end) return null;
	const a = Date.parse(start);
	const b = Date.parse(end);
	if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
	const seconds = Math.round((b - a) / 1000);
	return seconds > 0 ? seconds : null;
}

/** The last path segment of a data point name, used as the external id. */
function externalIdFromName(name: string | undefined): string | null {
	if (!name) return null;
	const id = name.split('/').filter(Boolean).pop();
	return id ? id : null;
}

/**
 * Map a Google exercise into an activities row. Returns null when the point has
 * no exercise payload or no id, since we cannot dedupe a row without an id.
 *
 * Note: the exercise summary carries no max heart rate, so `maxHr` stays null.
 * Route coordinates are not in the session payload either; they live behind the
 * separate TCX export, so `route` stays null here.
 */
export function mapExercise(point: GoogleDataPoint): MappedActivity | null {
	const exercise: GoogleExercise | undefined = point.exercise;
	if (!exercise?.interval?.startTime) return null;
	const externalId = externalIdFromName(point.name);
	if (!externalId) return null;

	const ms = exercise.metricsSummary ?? {};
	const distanceM = toNumber(ms.distanceMillimeters) !== null ? ms.distanceMillimeters! / 1000 : null;
	const durationSec =
		parseDurationSeconds(exercise.activeDuration) ??
		secondsBetween(exercise.interval.startTime, exercise.interval.endTime);
	const avgPaceSecPerKm =
		paceFromDistanceAndDuration(distanceM, durationSec) ??
		(toNumber(ms.averagePaceSecondsPerMeter) !== null ? ms.averagePaceSecondsPerMeter! * 1000 : null);

	return {
		externalId,
		modality: modalityForExerciseType(exercise.exerciseType),
		type: exercise.exerciseType ?? null,
		startedAt: new Date(exercise.interval.startTime),
		durationSec,
		distanceM,
		avgPaceSecPerKm,
		avgHr: toInt(ms.averageHeartRateBeatsPerMinute),
		maxHr: null,
		calories: toInt(ms.caloriesKcal),
		source: point.dataSource?.platform ?? point.dataSource?.device?.displayName ?? null,
		route: null,
		raw: point,
	};
}

/** A sleep session becomes minutes asleep on the civil day it ended. */
export function mapSleep(point: GoogleDataPoint): DailyPatch | null {
	const sleep: GoogleSleep | undefined = point.sleep;
	if (!sleep) return null;
	const date = civilDateFromInstant(sleep.interval?.endTime, parseUtcOffsetSeconds(sleep.interval?.endUtcOffset));
	if (!date) return null;
	return {
		date,
		sleepMin: toInt(sleep.summary?.minutesAsleep),
		raw: { sleep: point },
	};
}

/** A daily resting heart rate reading, keyed by its own civil date. */
export function mapDailyRestingHeartRate(point: GoogleDataPoint): DailyPatch | null {
	const rhr: GoogleDailyRestingHeartRate | undefined = point.dailyRestingHeartRate;
	if (!rhr) return null;
	const date = dateFromGoogleDate(rhr.date);
	if (!date) return null;
	return {
		date,
		restingHr: toInt(rhr.beatsPerMinute),
		raw: { dailyRestingHeartRate: point },
	};
}

/** A daily HRV reading, keyed by its own civil date. */
export function mapDailyHeartRateVariability(point: GoogleDataPoint): DailyPatch | null {
	const hrv: GoogleDailyHeartRateVariability | undefined = point.dailyHeartRateVariability;
	if (!hrv) return null;
	const date = dateFromGoogleDate(hrv.date);
	if (!date) return null;
	return {
		date,
		hrvMs: toNumber(hrv.averageHeartRateVariabilityMilliseconds),
		raw: { dailyHeartRateVariability: point },
	};
}

/**
 * Sum step counts per civil day. Steps arrive as minutely intervals, so a day is
 * the total of its intervals. The civil date is taken from each interval's start
 * time and its UTC offset, so day boundaries follow the user's clock.
 */
export function stepsByDate(points: GoogleDataPoint[]): DailyPatch[] {
	const totals = new Map<string, { steps: number; points: GoogleSteps[] }>();
	for (const point of points) {
		const steps: GoogleSteps | undefined = point.steps;
		if (!steps?.interval?.startTime) continue;
		const date = civilDateFromInstant(steps.interval.startTime, parseUtcOffsetSeconds(steps.interval.startUtcOffset));
		if (!date) continue;
		const count = toInt(steps.count) ?? 0;
		const entry = totals.get(date) ?? { steps: 0, points: [] };
		entry.steps += count;
		entry.points.push(steps);
		totals.set(date, entry);
	}
	return [...totals.entries()].map(([date, entry]) => ({
		date,
		steps: entry.steps,
		raw: { steps: entry.points },
	}));
}

/**
 * Merge an incoming patch into a stored row. A field that is null or absent in
 * the patch keeps the stored value, so a steps-only sync never wipes the sleep
 * from the same day. Raw payloads are merged by source key.
 */
export function mergeDailyRow(
	existing: DailyRow | undefined,
	patch: DailyPatch,
): DailyRow {
	return {
		date: patch.date,
		restingHr: patch.restingHr ?? existing?.restingHr ?? null,
		hrvMs: patch.hrvMs ?? existing?.hrvMs ?? null,
		sleepMin: patch.sleepMin ?? existing?.sleepMin ?? null,
		steps: patch.steps ?? existing?.steps ?? null,
		raw: { ...(existing?.raw ?? {}), ...(patch.raw ?? {}) },
	};
}

/**
 * Fold many patches into one per civil day, so several data types that land on
 * the same date become a single row. A later patch fills only fields the earlier
 * one left empty; raw payloads merge by source key.
 */
export function combineDailyPatches(patches: DailyPatch[]): DailyPatch[] {
	const byDate = new Map<string, DailyPatch>();
	for (const patch of patches) {
		const prev = byDate.get(patch.date);
		if (!prev) {
			byDate.set(patch.date, { ...patch, raw: { ...(patch.raw ?? {}) } });
			continue;
		}
		byDate.set(patch.date, {
			date: patch.date,
			restingHr: patch.restingHr ?? prev.restingHr,
			hrvMs: patch.hrvMs ?? prev.hrvMs,
			sleepMin: patch.sleepMin ?? prev.sleepMin,
			steps: patch.steps ?? prev.steps,
			raw: { ...(prev.raw ?? {}), ...(patch.raw ?? {}) },
		});
	}
	return [...byDate.values()];
}

/** Default lookback for a connection that has never synced. */
export const DEFAULT_SYNC_WINDOW_DAYS = 7;

/**
 * The instant to pull records since. A prior sync resumes from its own end; a
 * first sync looks back a bounded number of days so the first pass stays small.
 */
export function syncSince(
	lastSyncedAt: Date | null | undefined,
	now: Date,
	windowDays: number = DEFAULT_SYNC_WINDOW_DAYS,
): Date {
	if (lastSyncedAt) return lastSyncedAt;
	return new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
}

import type {
	GoogleDailyHeartRateVariability,
	GoogleDailyOxygenSaturation,
	GoogleDailyRespiratoryRate,
	GoogleDailyRestingHeartRate,
	GoogleDailySleepTemperatureDerivations,
	GoogleDailyVo2Max,
	GoogleDataPoint,
	GoogleExercise,
	GoogleInterval,
	GoogleRollupDataPoint,
	GoogleSampleTime,
	GoogleSleep,
	GoogleSteps,
} from './google-health';

/**
 * Pure mapping from Google Health data points to our own rows.
 *
 * Nothing here does I/O, so it is cheap to unit test with fixtures and needs no
 * live credentials. The field names were verified against the Google Health API
 * reference; if one changes, this file is the single place to correct.
 *
 * Daily metrics travel as a keyed map (`{ metric: value }`) rather than fixed
 * fields. That is the whole trick behind "a new data type is an entry, not a
 * branch": a mapper writes whatever keys it has, the sync stores each key as its
 * own row, and the API groups by key. A metric the device never reports simply
 * has no key, so it is absent rather than zero.
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

/**
 * The stable metric vocabulary. Values are stored under these keys, so the API
 * and the web both speak them. Handheld-friendly units (metric) throughout;
 * presentation happens at the edge.
 */
export const HealthMetric = {
	restingHr: 'resting_hr',
	hrvMs: 'hrv_ms',
	sleepMin: 'sleep_min',
	sleepDeepMin: 'sleep_deep_min',
	sleepRemMin: 'sleep_rem_min',
	sleepLightMin: 'sleep_light_min',
	sleepAwakeMin: 'sleep_awake_min',
	steps: 'steps',
	distanceM: 'distance_m',
	activeEnergyKcal: 'active_energy_kcal',
	floors: 'floors',
	activeZoneMin: 'active_zone_min',
	activeMin: 'active_min',
	sedentaryMin: 'sedentary_min',
	altitudeGainM: 'altitude_gain_m',
	totalCaloriesKcal: 'total_calories_kcal',
	hrMin: 'hr_min',
	hrMax: 'hr_max',
	hrAvg: 'hr_avg',
	spo2Avg: 'spo2_avg',
	spo2Low: 'spo2_low',
	spo2High: 'spo2_high',
	respiratoryRate: 'respiratory_rate',
	vo2Max: 'vo2_max',
	sleepTempC: 'sleep_temp_c',
	weightKg: 'weight_kg',
	bodyFatPct: 'body_fat_pct',
	heightMm: 'height_mm',
	coreTempC: 'core_temp_c',
	bloodGlucoseMgdl: 'blood_glucose_mgdl',
} as const;

export type HealthMetricKey = (typeof HealthMetric)[keyof typeof HealthMetric];

/** The metric unit, kept for reference. Units are display, so this is a hint. */
export const SAMPLE_METRIC_UNIT: Partial<Record<HealthMetricKey, string>> = {
	[HealthMetric.weightKg]: 'kg',
	[HealthMetric.bodyFatPct]: '%',
	[HealthMetric.heightMm]: 'mm',
	[HealthMetric.coreTempC]: 'C',
	[HealthMetric.bloodGlucoseMgdl]: 'mg/dL',
};

/** A partial `health_metrics` day: one civil day and its metric values. */
export interface DailyPatch {
	date: string;
	metrics: Record<string, number>;
	/** The provider payloads behind each key, kept for a later reparse. */
	raw?: Record<string, unknown>;
}

/** The four metrics that predate the generic store, projected into `health_daily`. */
export const LEGACY_DAILY_METRICS: { metric: HealthMetricKey; column: keyof DailyRowValues }[] = [
	{ metric: HealthMetric.restingHr, column: 'restingHr' },
	{ metric: HealthMetric.hrvMs, column: 'hrvMs' },
	{ metric: HealthMetric.sleepMin, column: 'sleepMin' },
	{ metric: HealthMetric.steps, column: 'steps' },
];

/** The `health_daily` columns a patch fills, so the recovery signal keeps reading it. */
export interface DailyRowValues {
	restingHr: number | null;
	hrvMs: number | null;
	sleepMin: number | null;
	steps: number | null;
}

/** A `health_daily` row as stored, before a merge. */
export interface DailyRow extends DailyRowValues {
	date: string;
	raw: Record<string, unknown> | null;
}

/** A sparse point measurement: one value at one instant. */
export interface MappedSample {
	metric: HealthMetricKey;
	sampleTime: Date;
	value: number;
	unit: string | null;
	raw: unknown;
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

function toFloat(value: string | number | undefined | null): number | null {
	if (value === undefined || value === null || value === '') return null;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
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
	const distanceM = toFloat(ms.distanceMillimeters) !== null ? ms.distanceMillimeters! / 1000 : null;
	const durationSec =
		parseDurationSeconds(exercise.activeDuration) ??
		secondsBetween(exercise.interval.startTime, exercise.interval.endTime);
	const avgPaceSecPerKm =
		paceFromDistanceAndDuration(distanceM, durationSec) ??
		(toFloat(ms.averagePaceSecondsPerMeter) !== null ? ms.averagePaceSecondsPerMeter! * 1000 : null);

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

/** One civil day with a single metric, from many interval readings summed. */
function sumIntervalByDate(
	points: GoogleDataPoint[],
	read: (point: GoogleDataPoint) => { interval?: GoogleInterval; value: number | null } | null,
	metric: HealthMetricKey,
): DailyPatch[] {
	const totals = new Map<string, { value: number; points: GoogleDataPoint[] }>();
	for (const point of points) {
		const entry = read(point);
		if (!entry?.interval?.startTime || entry.value === null) continue;
		const date = civilDateFromInstant(
			entry.interval.startTime,
			parseUtcOffsetSeconds(entry.interval.startUtcOffset),
		);
		if (!date) continue;
		const cur = totals.get(date) ?? { value: 0, points: [] };
		cur.value += entry.value;
		cur.points.push(point);
		totals.set(date, cur);
	}
	return [...totals.entries()].map(([date, entry]) => ({
		date,
		metrics: { [metric]: entry.value },
		raw: { [metric]: entry.points },
	}));
}

/** Minutes spanned by an interval, for duration sums like sedentary periods. */
function intervalMinutes(interval: GoogleInterval | undefined): number | null {
	const seconds = secondsBetween(interval?.startTime, interval?.endTime);
	return seconds === null ? null : seconds / 60;
}

/** Steps are summed per civil day: minutely intervals add up to a daily total. */
export function stepsByDate(points: GoogleDataPoint[]): DailyPatch[] {
	return sumIntervalByDate(
		points,
		(point) => ({ interval: point.steps?.interval, value: toInt(point.steps?.count) }),
		HealthMetric.steps,
	);
}

export function distanceByDate(points: GoogleDataPoint[]): DailyPatch[] {
	return sumIntervalByDate(
		points,
		(point) => {
			const mm = toFloat(point.distance?.millimeters);
			return { interval: point.distance?.interval, value: mm === null ? null : mm / 1000 };
		},
		HealthMetric.distanceM,
	);
}

export function activeEnergyByDate(points: GoogleDataPoint[]): DailyPatch[] {
	return sumIntervalByDate(
		points,
		(point) => ({ interval: point.activeEnergyBurned?.interval, value: toFloat(point.activeEnergyBurned?.kcal) }),
		HealthMetric.activeEnergyKcal,
	);
}

export function floorsByDate(points: GoogleDataPoint[]): DailyPatch[] {
	return sumIntervalByDate(
		points,
		(point) => ({ interval: point.floors?.interval, value: toInt(point.floors?.count) }),
		HealthMetric.floors,
	);
}

export function activeZoneMinutesByDate(points: GoogleDataPoint[]): DailyPatch[] {
	return sumIntervalByDate(
		points,
		(point) => ({
			interval: point.activeZoneMinutes?.interval,
			value: toInt(point.activeZoneMinutes?.activeZoneMinutes),
		}),
		HealthMetric.activeZoneMin,
	);
}

export function activeMinutesByDate(points: GoogleDataPoint[]): DailyPatch[] {
	return sumIntervalByDate(
		points,
		(point) => {
			const levels = point.activeMinutes?.activeMinutesByActivityLevel ?? [];
			if (levels.length === 0) return { interval: point.activeMinutes?.interval, value: null };
			const total = levels.reduce((sum, level) => sum + (toInt(level.activeMinutes) ?? 0), 0);
			return { interval: point.activeMinutes?.interval, value: total };
		},
		HealthMetric.activeMin,
	);
}

/** Altitude gain is signed, so a descent can subtract from the day's total. */
export function altitudeGainByDate(points: GoogleDataPoint[]): DailyPatch[] {
	return sumIntervalByDate(
		points,
		(point) => {
			const mm = toFloat(point.altitude?.gainMillimeters);
			return { interval: point.altitude?.interval, value: mm === null ? null : mm / 1000 };
		},
		HealthMetric.altitudeGainM,
	);
}

export function sedentaryMinutesByDate(points: GoogleDataPoint[]): DailyPatch[] {
	return sumIntervalByDate(
		points,
		(point) => ({ interval: point.sedentaryPeriod?.interval, value: intervalMinutes(point.sedentaryPeriod?.interval) }),
		HealthMetric.sedentaryMin,
	);
}

/**
 * Reduce heart rate rollup windows into the daily series. Heart rate is read
 * through the rollup endpoint, not from its one-per-second samples, so each
 * window already carries the minimum, average and maximum for its day. Rollup
 * windows are aligned to the request, so the window's start date is the day.
 */
export function heartRateRollupByDate(points: GoogleRollupDataPoint[]): DailyPatch[] {
	const out: DailyPatch[] = [];
	for (const point of points) {
		const hr = point.heartRate;
		const date = point.startTime?.slice(0, 10);
		if (!hr || !date) continue;
		const metrics: Record<string, number> = {};
		const min = toFloat(hr.beatsPerMinuteMin);
		const max = toFloat(hr.beatsPerMinuteMax);
		const avg = toFloat(hr.beatsPerMinuteAvg);
		if (min !== null) metrics[HealthMetric.hrMin] = Math.round(min);
		if (max !== null) metrics[HealthMetric.hrMax] = Math.round(max);
		if (avg !== null) metrics[HealthMetric.hrAvg] = Math.round(avg);
		if (Object.keys(metrics).length === 0) continue;
		out.push({ date, metrics, raw: { heartRateRollup: point } });
	}
	return out;
}

/** Total calories is rollup only, so it comes from the same endpoint as a daily sum. */
export function totalCaloriesRollupByDate(points: GoogleRollupDataPoint[]): DailyPatch[] {
	const out: DailyPatch[] = [];
	for (const point of points) {
		const date = point.startTime?.slice(0, 10);
		const kcal = toFloat(point.totalCalories?.kcalSum);
		if (!date || kcal === null) continue;
		out.push({ date, metrics: { [HealthMetric.totalCaloriesKcal]: kcal }, raw: { totalCaloriesRollup: point } });
	}
	return out;
}

/** A sleep session becomes minutes asleep plus the per-stage minutes it carries. */
export function mapSleep(point: GoogleDataPoint): DailyPatch | null {
	const sleep: GoogleSleep | undefined = point.sleep;
	if (!sleep) return null;
	const date = civilDateFromInstant(sleep.interval?.endTime, parseUtcOffsetSeconds(sleep.interval?.endUtcOffset));
	if (!date) return null;

	const metrics: Record<string, number> = {};
	const minutesAsleep = toInt(sleep.summary?.minutesAsleep);
	if (minutesAsleep !== null) metrics[HealthMetric.sleepMin] = minutesAsleep;

	const stageKey: Record<string, HealthMetricKey> = {
		DEEP: HealthMetric.sleepDeepMin,
		REM: HealthMetric.sleepRemMin,
		LIGHT: HealthMetric.sleepLightMin,
		AWAKE: HealthMetric.sleepAwakeMin,
	};
	for (const stage of sleep.summary?.stagesSummary ?? []) {
		const key = stage.type ? stageKey[stage.type] : undefined;
		const minutes = toInt(stage.minutes);
		if (key && minutes !== null) metrics[key] = minutes;
	}

	if (Object.keys(metrics).length === 0) return null;
	return { date, metrics, raw: { sleep: point } };
}

/** A daily resting heart rate reading, keyed by its own civil date. */
export function mapDailyRestingHeartRate(point: GoogleDataPoint): DailyPatch | null {
	const rhr: GoogleDailyRestingHeartRate | undefined = point.dailyRestingHeartRate;
	if (!rhr) return null;
	const date = dateFromGoogleDate(rhr.date);
	const value = toInt(rhr.beatsPerMinute);
	if (!date || value === null) return null;
	return { date, metrics: { [HealthMetric.restingHr]: value }, raw: { dailyRestingHeartRate: point } };
}

/** A daily HRV reading, keyed by its own civil date. */
export function mapDailyHeartRateVariability(point: GoogleDataPoint): DailyPatch | null {
	const hrv: GoogleDailyHeartRateVariability | undefined = point.dailyHeartRateVariability;
	if (!hrv) return null;
	const date = dateFromGoogleDate(hrv.date);
	const value = toFloat(hrv.averageHeartRateVariabilityMilliseconds);
	if (!date || value === null) return null;
	return { date, metrics: { [HealthMetric.hrvMs]: value }, raw: { dailyHeartRateVariability: point } };
}

/**
 * A daily oxygen saturation summary, keyed by its own civil date. The API serves
 * SpO2 as a daily average with a confidence band, not per-sample, so the band's
 * bounds stand in for min and max.
 */
export function mapDailyOxygenSaturation(point: GoogleDataPoint): DailyPatch | null {
	const spo2: GoogleDailyOxygenSaturation | undefined = point.dailyOxygenSaturation;
	if (!spo2) return null;
	const date = dateFromGoogleDate(spo2.date);
	const value = toFloat(spo2.averagePercentage);
	if (!date || value === null) return null;
	const metrics: Record<string, number> = { [HealthMetric.spo2Avg]: value };
	const low = toFloat(spo2.lowerBoundPercentage);
	const high = toFloat(spo2.upperBoundPercentage);
	if (low !== null) metrics[HealthMetric.spo2Low] = low;
	if (high !== null) metrics[HealthMetric.spo2High] = high;
	return { date, metrics, raw: { dailyOxygenSaturation: point } };
}

/** A daily respiratory rate, keyed by its own civil date. */
export function mapDailyRespiratoryRate(point: GoogleDataPoint): DailyPatch | null {
	const rr: GoogleDailyRespiratoryRate | undefined = point.dailyRespiratoryRate;
	if (!rr) return null;
	const date = dateFromGoogleDate(rr.date);
	const value = toFloat(rr.breathsPerMinute);
	if (!date || value === null) return null;
	return { date, metrics: { [HealthMetric.respiratoryRate]: value }, raw: { dailyRespiratoryRate: point } };
}

/** A daily VO2 max, keyed by its own civil date. */
export function mapDailyVo2Max(point: GoogleDataPoint): DailyPatch | null {
	const vo2: GoogleDailyVo2Max | undefined = point.dailyVo2Max;
	if (!vo2) return null;
	const date = dateFromGoogleDate(vo2.date);
	const value = toFloat(vo2.vo2Max);
	if (!date || value === null) return null;
	return { date, metrics: { [HealthMetric.vo2Max]: value }, raw: { dailyVo2Max: point } };
}

/** A nightly skin temperature, keyed by its own civil date. */
export function mapDailySleepTemperature(point: GoogleDataPoint): DailyPatch | null {
	const temp: GoogleDailySleepTemperatureDerivations | undefined = point.dailySleepTemperatureDerivations;
	if (!temp) return null;
	const date = dateFromGoogleDate(temp.date);
	const value = toFloat(temp.nightlyTemperatureCelsius);
	if (!date || value === null) return null;
	return { date, metrics: { [HealthMetric.sleepTempC]: value }, raw: { dailySleepTemperatureDerivations: point } };
}

/** Build a point sample, or null when the value or its time is missing. */
function sample(
	metric: HealthMetricKey,
	sampleTime: GoogleSampleTime | undefined,
	value: number | null,
	raw: unknown,
): MappedSample | null {
	if (value === null || !sampleTime?.physicalTime) return null;
	const ms = Date.parse(sampleTime.physicalTime);
	if (!Number.isFinite(ms)) return null;
	return { metric, sampleTime: new Date(ms), value, unit: SAMPLE_METRIC_UNIT[metric] ?? null, raw };
}

export function mapWeight(point: GoogleDataPoint): MappedSample | null {
	const grams = toFloat(point.weight?.weightGrams);
	return sample(HealthMetric.weightKg, point.weight?.sampleTime, grams === null ? null : grams / 1000, point.weight);
}

export function mapBodyFat(point: GoogleDataPoint): MappedSample | null {
	return sample(
		HealthMetric.bodyFatPct,
		point.bodyFat?.sampleTime,
		toFloat(point.bodyFat?.percentage),
		point.bodyFat,
	);
}

export function mapHeight(point: GoogleDataPoint): MappedSample | null {
	return sample(
		HealthMetric.heightMm,
		point.height?.sampleTime,
		toFloat(point.height?.heightMillimeters),
		point.height,
	);
}

export function mapCoreBodyTemperature(point: GoogleDataPoint): MappedSample | null {
	return sample(
		HealthMetric.coreTempC,
		point.coreBodyTemperature?.sampleTime,
		toFloat(point.coreBodyTemperature?.temperatureCelsius),
		point.coreBodyTemperature,
	);
}

export function mapBloodGlucose(point: GoogleDataPoint): MappedSample | null {
	return sample(
		HealthMetric.bloodGlucoseMgdl,
		point.bloodGlucose?.sampleTime,
		toFloat(point.bloodGlucose?.bloodGlucoseMilligramsPerDeciliter),
		point.bloodGlucose,
	);
}

/**
 * Merge an incoming patch into a stored one. Metrics merge by key, so a patch
 * that carries only steps never wipes the sleep from the same day, and a key the
 * patch omits keeps whatever was stored. Raw payloads merge the same way.
 */
export function mergeDailyPatch(existing: DailyPatch | undefined, patch: DailyPatch): DailyPatch {
	return {
		date: patch.date,
		metrics: { ...(existing?.metrics ?? {}), ...patch.metrics },
		raw: { ...(existing?.raw ?? {}), ...(patch.raw ?? {}) },
	};
}

/**
 * Fold many patches into one per civil day, so several data types that land on
 * the same date become a single row. A later patch wins for a key it sets and
 * leaves the rest alone.
 */
export function combineDailyPatches(patches: DailyPatch[]): DailyPatch[] {
	const byDate = new Map<string, DailyPatch>();
	for (const patch of patches) {
		byDate.set(patch.date, mergeDailyPatch(byDate.get(patch.date), patch));
	}
	return [...byDate.values()];
}

/** Project a merged day into the four `health_daily` columns the recovery signal reads. */
export function healthRowValues(patch: DailyPatch): DailyRowValues {
	const values: DailyRowValues = { restingHr: null, hrvMs: null, sleepMin: null, steps: null };
	for (const { metric, column } of LEGACY_DAILY_METRICS) {
		const value = patch.metrics[metric];
		if (value !== undefined) values[column] = value;
	}
	return values;
}

/** Default lookback for a connection that has never synced. */
export const DEFAULT_SYNC_WINDOW_DAYS = 7;

/**
 * How far before the previous sync to re-read on resume. Google delivers
 * intervals and sleep whose start_time sits before the prior sync, and re-edited
 * readings arrive after their own start, so a window that begins exactly at the
 * last sync would miss both. Every read upserts on its own key, so the overlap
 * costs a re-read, never a duplicate.
 */
export const SYNC_OVERLAP_HOURS = 24;

/**
 * The instant to pull records since. A prior sync resumes from just before its
 * own end, minus the overlap, so late-arriving data is not skipped; a first sync
 * looks back a bounded number of days so the first pass stays small.
 */
export function syncSince(
	lastSyncedAt: Date | null | undefined,
	now: Date,
	windowDays: number = DEFAULT_SYNC_WINDOW_DAYS,
	overlapHours: number = SYNC_OVERLAP_HOURS,
): Date {
	if (lastSyncedAt) {
		return new Date(lastSyncedAt.getTime() - overlapHours * 60 * 60 * 1000);
	}
	return new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
}

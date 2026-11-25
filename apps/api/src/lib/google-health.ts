/**
 * A small typed client for the Google Health API (health.googleapis.com v4).
 *
 * Every call reads the signed-in user with the `users/me` alias, so callers only
 * need an access token, never a Google user id. The endpoints and the data point
 * shapes were verified against the Google Health API reference:
 *
 *   GET  {base}/users/me/dataTypes/{dataType}/dataPoints            (list)
 *   GET  {base}/users/me/dataTypes/{dataType}/dataPoints:reconcile  (reconcile)
 *   GET  {base}/users/me/identity                                   (the id used at connect time)
 *
 * The base path lives in one constant below so a version bump is a one line fix.
 * If Google changes a field name, the mapping in google-health-map.ts is where to
 * correct it.
 */

/** One constant for the whole surface, so correcting the version is trivial. */
export const GOOGLE_HEALTH_API_BASE = 'https://health.googleapis.com/v4';

/**
 * Data types we read, as they appear in the URL path. Every entry here is a type
 * the four granted scopes expose and that the API serves through `list` or
 * `reconcile`. The rule for adding one is a single entry: the sync reads this
 * map, so a new type needs no new branch. Types that are rollup only, such as
 * `total-calories`, are not listed: they have no list method and would need the
 * separate rollup endpoint.
 */
export const GoogleHealthDataType = {
	exercise: 'exercise',
	sleep: 'sleep',
	steps: 'steps',
	// Activity and fitness (interval and sample types).
	distance: 'distance',
	activeEnergyBurned: 'active-energy-burned',
	activeZoneMinutes: 'active-zone-minutes',
	activeMinutes: 'active-minutes',
	floors: 'floors',
	altitude: 'altitude',
	sedentaryPeriod: 'sedentary-period',
	totalCalories: 'total-calories',
	heartRate: 'heart-rate',
	vo2Max: 'vo2-max',
	runVo2Max: 'run-vo2-max',
	dailyVo2Max: 'daily-vo2-max',
	// Health metrics and measurements (daily, interval and sample types).
	dailyRestingHeartRate: 'daily-resting-heart-rate',
	dailyHeartRateVariability: 'daily-heart-rate-variability',
	heartRateVariability: 'heart-rate-variability',
	oxygenSaturation: 'oxygen-saturation',
	dailyOxygenSaturation: 'daily-oxygen-saturation',
	dailyRespiratoryRate: 'daily-respiratory-rate',
	respiratoryRateSleepSummary: 'respiratory-rate-sleep-summary',
	dailySleepTemperatureDerivations: 'daily-sleep-temperature-derivations',
	coreBodyTemperature: 'core-body-temperature',
	weight: 'weight',
	bodyFat: 'body-fat',
	height: 'height',
	bloodGlucose: 'blood-glucose',
} as const;

export type GoogleHealthDataTypeValue =
	(typeof GoogleHealthDataType)[keyof typeof GoogleHealthDataType];

/** `{ "year", "month", "day" }`, the Shared.Types.Date the daily types carry. */
export interface GoogleDate {
	year?: number | string;
	month?: number | string;
	day?: number | string;
}

/** A physical interval with the user's UTC offset at each end. Offsets are `"<seconds>s"`. */
export interface GoogleInterval {
	startTime: string;
	startUtcOffset?: string;
	endTime: string;
	endUtcOffset?: string;
}

/** Where a reading came from: device, platform and how it was recorded. */
export interface GoogleDataSource {
	platform?: string;
	recordingMethod?: string;
	device?: { displayName?: string; formFactor?: string };
	application?: { googleWebClientId?: string; packageName?: string };
}

/**
 * Summary metrics on an exercise. 64-bit integers (steps, average heart rate)
 * arrive as strings in JSON; distances and calories are numbers in millimetres
 * and kilocalories.
 */
export interface GoogleMetricsSummary {
	caloriesKcal?: number;
	distanceMillimeters?: number;
	steps?: string;
	averageSpeedMillimetersPerSecond?: number;
	averagePaceSecondsPerMeter?: number;
	averageHeartRateBeatsPerMinute?: string;
	elevationGainMillimeters?: number;
	activeZoneMinutes?: string;
	runVo2Max?: number;
	totalSwimLengths?: number;
}

export interface GoogleExercise {
	interval: GoogleInterval;
	exerciseType?: string;
	displayName?: string;
	activeDuration?: string;
	metricsSummary?: GoogleMetricsSummary;
	exerciseMetadata?: { hasGps?: boolean };
	notes?: string;
	updateTime?: string;
	createTime?: string;
}

export interface GoogleSleepSummary {
	stagesSummary?: { type?: string; minutes?: string; count?: string }[];
	minutesInSleepPeriod?: string;
	minutesAfterWakeUp?: string;
	minutesToFallAsleep?: string;
	minutesAsleep?: string;
	minutesAwake?: string;
}

export interface GoogleSleep {
	interval: GoogleInterval;
	type?: string;
	summary?: GoogleSleepSummary;
	metadata?: { mainSleep?: boolean; processed?: boolean; stagesStatus?: string };
}

export interface GoogleSteps {
	interval: GoogleInterval;
	/** Step count for the interval; a 64-bit integer sent as a string. */
	count?: string;
}

export interface GoogleDailyRestingHeartRate {
	date?: GoogleDate;
	beatsPerMinute?: string;
	dailyRestingHeartRateMetadata?: { calculationMethod?: string };
}

export interface GoogleDailyHeartRateVariability {
	date?: GoogleDate;
	averageHeartRateVariabilityMilliseconds?: number;
	nonRemHeartRateBeatsPerMinute?: string;
	entropy?: number;
	deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds?: number;
}

/**
 * The time of a sample measurement. `physicalTime` is the instant and
 * `utcOffset` is the user's offset at that instant, which is what turns the
 * instant into the right civil day. Sample metrics (weight, heart rate) carry it.
 */
export interface GoogleSampleTime {
	physicalTime?: string;
	utcOffset?: string;
	civilTime?: { year?: number; month?: number; day?: number; hours?: number; minutes?: number; seconds?: number };
}

/** A value measured over an interval: millimetres, kilocalories, a count or a duration. */
export interface GoogleDistance {
	interval: GoogleInterval;
	millimeters?: string;
}

export interface GoogleActiveEnergyBurned {
	interval: GoogleInterval;
	kcal?: number;
}

export interface GoogleActiveZoneMinutes {
	interval: GoogleInterval;
	activeZoneMinutes?: string;
	heartRateZone?: string;
}

export interface GoogleActiveMinutes {
	interval: GoogleInterval;
	activeMinutesByActivityLevel?: { activityLevel?: string; activeMinutes?: string }[];
}

export interface GoogleFloors {
	interval: GoogleInterval;
	count?: string;
}

export interface GoogleAltitude {
	interval: GoogleInterval;
	gainMillimeters?: string;
}

export interface GoogleSedentaryPeriod {
	interval: GoogleInterval;
}

export interface GoogleHeartRate {
	sampleTime?: GoogleSampleTime;
	beatsPerMinute?: string;
}

export interface GoogleOxygenSaturation {
	sampleTime?: GoogleSampleTime;
	percentage?: number;
}

export interface GoogleHeartRateVariability {
	sampleTime?: GoogleSampleTime;
	rootMeanSquareOfSuccessiveDifferencesMilliseconds?: number;
	standardDeviationMilliseconds?: number;
}

export interface GoogleWeight {
	sampleTime?: GoogleSampleTime;
	weightGrams?: number;
	notes?: string;
}

export interface GoogleBodyFat {
	sampleTime?: GoogleSampleTime;
	percentage?: number;
}

export interface GoogleHeight {
	sampleTime?: GoogleSampleTime;
	heightMillimeters?: string;
}

export interface GoogleCoreBodyTemperature {
	id?: string;
	sampleTime?: GoogleSampleTime;
	temperatureCelsius?: number;
	measurementLocation?: string;
}

export interface GoogleBloodGlucose {
	sampleTime?: GoogleSampleTime;
	bloodGlucoseMilligramsPerDeciliter?: number;
}

export interface GoogleVo2Max {
	sampleTime?: GoogleSampleTime;
	vo2Max?: number;
	measurementMethod?: string;
}

export interface GoogleRunVo2Max {
	sampleTime?: GoogleSampleTime;
	runVo2Max?: number;
}

export interface GoogleRespiratoryRateStatistics {
	breathsPerMinute?: number;
	standardDeviation?: number;
	signalToNoise?: number;
}

export interface GoogleRespiratoryRateSleepSummary {
	sampleTime?: GoogleSampleTime;
	fullSleepStats?: GoogleRespiratoryRateStatistics;
	deepSleepStats?: GoogleRespiratoryRateStatistics;
	lightSleepStats?: GoogleRespiratoryRateStatistics;
	remSleepStats?: GoogleRespiratoryRateStatistics;
}

export interface GoogleDailyOxygenSaturation {
	date?: GoogleDate;
	averagePercentage?: number;
	lowerBoundPercentage?: number;
	upperBoundPercentage?: number;
	standardDeviationPercentage?: number;
}

export interface GoogleDailyRespiratoryRate {
	date?: GoogleDate;
	breathsPerMinute?: number;
}

export interface GoogleDailyVo2Max {
	date?: GoogleDate;
	vo2Max?: number;
	cardioFitnessLevel?: string;
	estimated?: boolean;
}

export interface GoogleDailySleepTemperatureDerivations {
	date?: GoogleDate;
	nightlyTemperatureCelsius?: number;
	baselineTemperatureCelsius?: number;
	relativeNightlyStddev30dCelsius?: number;
}

/** Every data point carries a `name` only when the type is identifiable. */
export interface GoogleDataPoint {
	name?: string;
	dataSource?: GoogleDataSource;
	exercise?: GoogleExercise;
	sleep?: GoogleSleep;
	steps?: GoogleSteps;
	distance?: GoogleDistance;
	activeEnergyBurned?: GoogleActiveEnergyBurned;
	activeZoneMinutes?: GoogleActiveZoneMinutes;
	activeMinutes?: GoogleActiveMinutes;
	floors?: GoogleFloors;
	altitude?: GoogleAltitude;
	sedentaryPeriod?: GoogleSedentaryPeriod;
	heartRate?: GoogleHeartRate;
	vo2Max?: GoogleVo2Max;
	runVo2Max?: GoogleRunVo2Max;
	dailyVo2Max?: GoogleDailyVo2Max;
	dailyRestingHeartRate?: GoogleDailyRestingHeartRate;
	dailyHeartRateVariability?: GoogleDailyHeartRateVariability;
	heartRateVariability?: GoogleHeartRateVariability;
	oxygenSaturation?: GoogleOxygenSaturation;
	dailyOxygenSaturation?: GoogleDailyOxygenSaturation;
	dailyRespiratoryRate?: GoogleDailyRespiratoryRate;
	respiratoryRateSleepSummary?: GoogleRespiratoryRateSleepSummary;
	dailySleepTemperatureDerivations?: GoogleDailySleepTemperatureDerivations;
	coreBodyTemperature?: GoogleCoreBodyTemperature;
	weight?: GoogleWeight;
	bodyFat?: GoogleBodyFat;
	height?: GoogleHeight;
	bloodGlucose?: GoogleBloodGlucose;
}

export interface GoogleListResponse<T> {
	dataPoints?: T[];
	nextPageToken?: string;
}

/**
 * One aggregated window from the rollup endpoint. The type-specific value is a
 * single field (heart rate, total calories, and so on) holding min, average,
 * max or a sum over the window. `startTime` marks the window, aligned to the
 * requested `windowSize`, so a one-day window gives a daily series without ever
 * reading the raw samples.
 */
export interface GoogleRollupDataPoint {
	startTime?: string;
	endTime?: string;
	heartRate?: {
		beatsPerMinuteMin?: number;
		beatsPerMinuteAvg?: number;
		beatsPerMinuteMax?: number;
	};
	totalCalories?: { kcalSum?: number };
}

export interface GoogleRollupResponse {
	rollupDataPoints?: GoogleRollupDataPoint[];
	nextPageToken?: string;
}

export interface RollupOptions {
	/** Inclusive start of the rolled-up range, RFC 3339 and window aligned. */
	rangeStart: string;
	/** Exclusive end of the rolled-up range, RFC 3339. */
	rangeEnd: string;
	/** Window size as a Google duration, for example `"86400s"` for a day. */
	windowSize: string;
	pageSize?: number;
	pageToken?: string;
	/** Overridable so tests can point at a fake server. */
	baseUrl?: string;
}

export type ListMethod = 'list' | 'reconcile';

export interface ListOptions {
	/** `pageSize` as documented; exercise and sleep cap at 25. */
	pageSize?: number;
	/** `pageToken` from a previous page. */
	pageToken?: string;
	/** An AIP-160 filter, built by the caller for the type being read. */
	filter?: string;
	/** `list` by default; `reconcile` for sleep, which dedupes overlapping logs. */
	method?: ListMethod;
	/** Overridable so tests can point at a fake server. */
	baseUrl?: string;
}

/** A field on an error we can act on without ever touching the token. */
export class GoogleHealthError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = 'GoogleHealthError';
	}
}

/**
 * Read one page of data points for a data type. Throws GoogleHealthError on a
 * non-2xx response; the message never contains the token.
 */
export async function listDataPoints<T extends GoogleDataPoint>(
	accessToken: string,
	dataType: GoogleHealthDataTypeValue,
	options: ListOptions = {},
): Promise<GoogleListResponse<T>> {
	const base = options.baseUrl ?? GOOGLE_HEALTH_API_BASE;
	const suffix = options.method === 'reconcile' ? ':reconcile' : '';
	const path = `${base}/users/me/dataTypes/${dataType}/dataPoints${suffix}`;

	const params = new URLSearchParams();
	if (options.pageSize !== undefined) params.set('pageSize', String(options.pageSize));
	if (options.pageToken) params.set('pageToken', options.pageToken);
	if (options.filter) params.set('filter', options.filter);
	const query = params.toString();

	const res = await fetch(query ? `${path}?${query}` : path, {
		headers: {
			authorization: `Bearer ${accessToken}`,
			accept: 'application/json',
		},
	});

	if (!res.ok) {
		throw new GoogleHealthError(res.status, `Google Health ${dataType} request failed (${res.status})`);
	}

	const body = (await res.json()) as GoogleListResponse<T>;
	return { dataPoints: body.dataPoints ?? [], nextPageToken: body.nextPageToken ?? '' };
}

/**
 * Walk a data type for a bounded number of pages. `maxPages` keeps a single cron
 * pass cheap; the caller resumes from the next run because we keep the window.
 */
export async function listDataPointsBounded<T extends GoogleDataPoint>(
	accessToken: string,
	dataType: GoogleHealthDataTypeValue,
	options: ListOptions & { maxPages?: number } = {},
): Promise<T[]> {
	const maxPages = options.maxPages ?? 1;
	const out: T[] = [];
	let pageToken = options.pageToken;

	for (let page = 0; page < maxPages; page++) {
		const res = await listDataPoints<T>(accessToken, dataType, { ...options, pageToken });
		out.push(...(res.dataPoints ?? []));
		if (!res.nextPageToken) break;
		pageToken = res.nextPageToken;
	}

	return out;
}

/**
 * Roll one data type up into fixed windows (a day, say) and read the aggregate
 * values. This is how the high-volume types are read: heart rate arrives once a
 * second, so a daily min, average and max comes from the rollup endpoint rather
 * than from reading the samples. Only the `rollUp`-capable types work here.
 */
export async function rollUpDataPoints(
	accessToken: string,
	dataType: GoogleHealthDataTypeValue,
	options: RollupOptions,
): Promise<GoogleRollupResponse> {
	const base = options.baseUrl ?? GOOGLE_HEALTH_API_BASE;
	const path = `${base}/users/me/dataTypes/${dataType}/dataPoints:rollUp`;

	const body: Record<string, unknown> = {
		range: { startTime: options.rangeStart, endTime: options.rangeEnd },
		windowSize: options.windowSize,
	};
	if (options.pageSize !== undefined) body.pageSize = options.pageSize;
	if (options.pageToken) body.pageToken = options.pageToken;

	const res = await fetch(path, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${accessToken}`,
			accept: 'application/json',
			'content-type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		throw new GoogleHealthError(res.status, `Google Health ${dataType} rollup failed (${res.status})`);
	}

	const parsed = (await res.json()) as GoogleRollupResponse;
	return { rollupDataPoints: parsed.rollupDataPoints ?? [], nextPageToken: parsed.nextPageToken ?? '' };
}

/**
 * Roll a data type up across a bounded number of pages. A day-windowed rollup
 * returns only `pageSize` windows per page, so a backfill or a long-idle
 * connection would otherwise stop at the first page and drop every day after it.
 * `maxPages` keeps one pass cheap; the caller keeps the window, so the next run
 * picks up where this one stopped.
 */
export async function rollUpDataPointsBounded(
	accessToken: string,
	dataType: GoogleHealthDataTypeValue,
	options: RollupOptions & { maxPages?: number },
): Promise<GoogleRollupDataPoint[]> {
	const maxPages = options.maxPages ?? 1;
	const out: GoogleRollupDataPoint[] = [];
	let pageToken = options.pageToken;

	for (let page = 0; page < maxPages; page++) {
		const res = await rollUpDataPoints(accessToken, dataType, { ...options, pageToken });
		out.push(...(res.rollupDataPoints ?? []));
		if (!res.nextPageToken) break;
		pageToken = res.nextPageToken;
	}

	return out;
}

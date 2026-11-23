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

/** Data types we read, as they appear in the URL path. */
export const GoogleHealthDataType = {
	exercise: 'exercise',
	sleep: 'sleep',
	steps: 'steps',
	dailyRestingHeartRate: 'daily-resting-heart-rate',
	dailyHeartRateVariability: 'daily-heart-rate-variability',
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

/** Every data point carries a `name` only when the type is identifiable. */
export interface GoogleDataPoint {
	name?: string;
	dataSource?: GoogleDataSource;
	exercise?: GoogleExercise;
	sleep?: GoogleSleep;
	steps?: GoogleSteps;
	dailyRestingHeartRate?: GoogleDailyRestingHeartRate;
	dailyHeartRateVariability?: GoogleDailyHeartRateVariability;
}

export interface GoogleListResponse<T> {
	dataPoints?: T[];
	nextPageToken?: string;
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

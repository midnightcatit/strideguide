import { and, eq, inArray, or, asc, sql } from 'drizzle-orm';
import { schema, type Db } from '../db';
import type { Env } from '../env';
import { PROVIDERS } from './providers';
import {
	getAccessToken,
	type ConnectionRow,
} from './connections';
import { getCached, putCache } from './cache';
import {
	GoogleHealthDataType,
	listDataPointsBounded,
	rollUpDataPoints,
	type GoogleDataPoint,
	type GoogleHealthDataTypeValue,
	type GoogleRollupDataPoint,
	type ListMethod,
} from './google-health';
import {
	activeEnergyByDate,
	activeMinutesByDate,
	activeZoneMinutesByDate,
	altitudeGainByDate,
	combineDailyPatches,
	distanceByDate,
	floorsByDate,
	healthRowValues,
	heartRateRollupByDate,
	mapBloodGlucose,
	mapBodyFat,
	mapCoreBodyTemperature,
	mapDailyHeartRateVariability,
	mapDailyOxygenSaturation,
	mapDailyRespiratoryRate,
	mapDailyRestingHeartRate,
	mapDailySleepTemperature,
	mapDailyVo2Max,
	mapExercise,
	mapHeight,
	mapSleep,
	mapWeight,
	mergeDailyPatch,
	sedentaryMinutesByDate,
	stepsByDate,
	syncSince,
	totalCaloriesRollupByDate,
	type DailyPatch,
	type MappedSample,
} from './google-health-map';

/**
 * Provider sync. Pulls new records since the last sync for one connection and
 * upserts them, so a re-run never duplicates a row.
 *
 * The types to pull live in the two registries below, not in branches: a new
 * data type is one entry with its page size, filter shape and mapper. Each run is
 * bounded (a small page count per type) and resumes from `lastSyncedAt`, so the
 * next run picks up where this one stopped. Failures land on the connection's
 * status; nothing here logs a token.
 */

/** How a filter start is written for a type: interval, sample, daily or session. */
type FilterKind = 'interval' | 'sample' | 'daily' | 'exercise' | 'sleep';

interface PullBase {
	dataType: GoogleHealthDataTypeValue;
	pageSize: number;
	method: ListMethod;
	filterKind: FilterKind;
}

interface DailyPull extends PullBase {
	map: (points: GoogleDataPoint[]) => DailyPatch[];
}

interface SamplePull extends PullBase {
	map: (point: GoogleDataPoint) => MappedSample | null;
}

/** Map a point list one by one, dropping the ones a mapper cannot read. */
function mapEach<T>(points: GoogleDataPoint[], map: (point: GoogleDataPoint) => T | null): T[] {
	const out: T[] = [];
	for (const point of points) {
		const row = map(point);
		if (row !== null) out.push(row);
	}
	return out;
}

/**
 * Daily metrics, one row per civil day. Interval types (steps, distance, energy)
 * sum their readings; the daily and session types carry one value already. Every
 * type the granted scopes serve through list or reconcile is here.
 */
const DAILY_PULLS: DailyPull[] = [
	{ dataType: GoogleHealthDataType.steps, pageSize: 1000, method: 'list', filterKind: 'interval', map: stepsByDate },
	{ dataType: GoogleHealthDataType.distance, pageSize: 1000, method: 'list', filterKind: 'interval', map: distanceByDate },
	{ dataType: GoogleHealthDataType.activeEnergyBurned, pageSize: 1000, method: 'list', filterKind: 'interval', map: activeEnergyByDate },
	// Floors is reconcile only; a plain list is not served for it.
	{ dataType: GoogleHealthDataType.floors, pageSize: 1000, method: 'reconcile', filterKind: 'interval', map: floorsByDate },
	{ dataType: GoogleHealthDataType.activeZoneMinutes, pageSize: 1000, method: 'list', filterKind: 'interval', map: activeZoneMinutesByDate },
	{ dataType: GoogleHealthDataType.activeMinutes, pageSize: 1000, method: 'list', filterKind: 'interval', map: activeMinutesByDate },
	{ dataType: GoogleHealthDataType.altitude, pageSize: 1000, method: 'list', filterKind: 'interval', map: altitudeGainByDate },
	{ dataType: GoogleHealthDataType.sedentaryPeriod, pageSize: 1000, method: 'list', filterKind: 'interval', map: sedentaryMinutesByDate },
	{ dataType: GoogleHealthDataType.sleep, pageSize: 25, method: 'reconcile', filterKind: 'sleep', map: (points) => mapEach(points, mapSleep) },
	{ dataType: GoogleHealthDataType.dailyRestingHeartRate, pageSize: 90, method: 'list', filterKind: 'daily', map: (points) => mapEach(points, mapDailyRestingHeartRate) },
	{ dataType: GoogleHealthDataType.dailyHeartRateVariability, pageSize: 90, method: 'list', filterKind: 'daily', map: (points) => mapEach(points, mapDailyHeartRateVariability) },
	{ dataType: GoogleHealthDataType.dailyOxygenSaturation, pageSize: 90, method: 'list', filterKind: 'daily', map: (points) => mapEach(points, mapDailyOxygenSaturation) },
	{ dataType: GoogleHealthDataType.dailyRespiratoryRate, pageSize: 90, method: 'list', filterKind: 'daily', map: (points) => mapEach(points, mapDailyRespiratoryRate) },
	{ dataType: GoogleHealthDataType.dailyVo2Max, pageSize: 90, method: 'list', filterKind: 'daily', map: (points) => mapEach(points, mapDailyVo2Max) },
	{ dataType: GoogleHealthDataType.dailySleepTemperatureDerivations, pageSize: 90, method: 'list', filterKind: 'daily', map: (points) => mapEach(points, mapDailySleepTemperature) },
];

/**
 * High-volume and rollup-only types, read through the rollup endpoint as daily
 * windows. heart-rate arrives once a second, so a daily min, average and max
 * comes from the aggregate rather than from reading the samples; total-calories
 * has no list method at all, so a rollup is the only way to read it.
 */
interface RollupPull {
	dataType: GoogleHealthDataTypeValue;
	/** Max page size the rollup endpoint allows for this type. */
	pageSize: number;
	map: (points: GoogleRollupDataPoint[]) => DailyPatch[];
}

const ROLLUP_PULLS: RollupPull[] = [
	{ dataType: GoogleHealthDataType.heartRate, pageSize: 14, map: heartRateRollupByDate },
	{ dataType: GoogleHealthDataType.totalCalories, pageSize: 14, map: totalCaloriesRollupByDate },
];

/** One rollup window is a civil day; the range is aligned to the day boundary. */
const ROLLUP_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * Sparse point samples: genuine measurements at an instant with no daily or
 * interval alternative. Types that also have a daily or rollup form (heart rate,
 * SpO2, VO2 max) are read through those instead, so no sample is stored twice.
 */
const SAMPLE_PULLS: SamplePull[] = [
	{ dataType: GoogleHealthDataType.weight, pageSize: 1000, method: 'list', filterKind: 'sample', map: mapWeight },
	{ dataType: GoogleHealthDataType.bodyFat, pageSize: 1000, method: 'list', filterKind: 'sample', map: mapBodyFat },
	{ dataType: GoogleHealthDataType.height, pageSize: 1000, method: 'list', filterKind: 'sample', map: mapHeight },
	{ dataType: GoogleHealthDataType.coreBodyTemperature, pageSize: 1000, method: 'list', filterKind: 'sample', map: mapCoreBodyTemperature },
	{ dataType: GoogleHealthDataType.bloodGlucose, pageSize: 1000, method: 'list', filterKind: 'sample', map: mapBloodGlucose },
];

export interface SyncOptions {
	/** Pages to walk per data type in one run. Keeps a cron pass cheap. */
	maxPages?: number;
	/** Where to read from; injectable for tests. */
	baseUrl?: string;
}

export interface SyncResult {
	activities: number;
	daily: number;
	metrics: number;
	samples: number;
}

/** RFC 3339 instant, as the physical-time filters expect. */
function rfc3339(date: Date): string {
	return date.toISOString();
}

/** Bare civil time (`YYYY-MM-DDTHH:MM:SS`), as the exercise filter expects. */
function civilTimestamp(date: Date): string {
	return date.toISOString().slice(0, 19);
}

/** `YYYY-MM-DD`, as the daily filters expect. */
function isoDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** The data type's field name in a filter: kebab-case becomes snake_case. */
function snakeCase(dataType: string): string {
	return dataType.replace(/-/g, '_');
}

/**
 * Build the filter for one pull. Over-fetching is safe: activities upsert on
 * (provider, external_id), and daily, metric and sample rows upsert on their own
 * keys, so an overlap costs a read, never a duplicate.
 */
function filterFor(dataType: GoogleHealthDataTypeValue, kind: FilterKind, since: Date): string {
	switch (kind) {
		case 'exercise':
			// Exercise only supports filtering by civil_start_time.
			return `exercise.interval.civil_start_time >= "${civilTimestamp(since)}"`;
		case 'sleep':
			// Sleep only supports filtering by its end time.
			return `sleep.interval.end_time >= "${rfc3339(since)}"`;
		case 'interval':
			return `${snakeCase(dataType)}.interval.start_time >= "${rfc3339(since)}"`;
		case 'sample':
			return `${snakeCase(dataType)}.sample_time.physical_time >= "${rfc3339(since)}"`;
		case 'daily':
			return `${snakeCase(dataType)}.date >= "${isoDay(since)}"`;
	}
}

async function fetchPoints(
	accessToken: string,
	pull: PullBase,
	since: Date,
	maxPages: number,
	baseUrl: string | undefined,
): Promise<GoogleDataPoint[]> {
	return listDataPointsBounded<GoogleDataPoint>(accessToken, pull.dataType, {
		filter: filterFor(pull.dataType, pull.filterKind, since),
		pageSize: pull.pageSize,
		method: pull.method,
		maxPages,
		baseUrl,
	});
}

/** The start of a UTC civil day, used to align a rollup range to its windows. */
function startOfUtcDay(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Fetch every registered type for the window, bounded by maxPages.
 *
 * Each type is fetched on its own. If one fails (say the token lacks the scope
 * for that data type), the rest still sync; only a run where every type fails is
 * treated as an error, so a partial grant does not stall the rest.
 */
async function pullHealthData(
	accessToken: string,
	since: Date,
	now: Date,
	options: SyncOptions,
): Promise<{ daily: DailyPatch[]; samples: MappedSample[] }> {
	const maxPages = options.maxPages ?? 2;
	const daily: DailyPatch[] = [];
	const samples: MappedSample[] = [];
	let failures = 0;
	let attempts = 0;

	for (const pull of DAILY_PULLS) {
		attempts += 1;
		try {
			const points = await fetchPoints(accessToken, pull, since, maxPages, options.baseUrl);
			daily.push(...pull.map(points));
		} catch {
			failures += 1;
		}
	}

	// Rollup windows are aligned to the day, so the range starts at the start of
	// the UTC day and ends at the start of tomorrow, closed-open.
	const rangeStart = startOfUtcDay(since).toISOString();
	const rangeEnd = new Date(startOfUtcDay(now).getTime() + 24 * 60 * 60 * 1000).toISOString();
	for (const pull of ROLLUP_PULLS) {
		attempts += 1;
		try {
			const res = await rollUpDataPoints(accessToken, pull.dataType, {
				rangeStart,
				rangeEnd,
				windowSize: `${ROLLUP_WINDOW_SECONDS}s`,
				pageSize: pull.pageSize,
				baseUrl: options.baseUrl,
			});
			daily.push(...pull.map(res.rollupDataPoints ?? []));
		} catch {
			failures += 1;
		}
	}

	for (const pull of SAMPLE_PULLS) {
		attempts += 1;
		try {
			const points = await fetchPoints(accessToken, pull, since, maxPages, options.baseUrl);
			for (const point of points) {
				const row = pull.map(point);
				if (row) samples.push(row);
			}
		} catch {
			failures += 1;
		}
	}

	if (attempts > 0 && failures === attempts) {
		throw new Error('every data type fetch failed');
	}
	return { daily, samples };
}

/** Upsert mapped exercises, keyed so a repeated sync does not duplicate rows. */
async function upsertActivities(
	db: Db,
	userId: string,
	points: GoogleDataPoint[],
): Promise<number> {
	const rows = points
		.map((point) => mapExercise(point))
		.filter((row): row is NonNullable<typeof row> => row !== null);
	if (rows.length === 0) return 0;

	// One row per external id, so a duplicate within a page (or a re-read across
	// pages) never hits SQLite's in-statement conflict twice.
	const byExternalId = new Map(rows.map((row) => [row.externalId, row]));
	const unique = [...byExternalId.values()];

	await db
		.insert(schema.activities)
		.values(
			unique.map((row) => ({
				id: crypto.randomUUID(),
				userId,
				provider: 'google-health' as const,
				...row,
			})),
		)
		.onConflictDoUpdate({
			target: [schema.activities.provider, schema.activities.externalId],
			set: {
				modality: sql`excluded.modality`,
				type: sql`excluded.type`,
				startedAt: sql`excluded.started_at`,
				durationSec: sql`excluded.duration_sec`,
				distanceM: sql`excluded.distance_m`,
				avgPaceSecPerKm: sql`excluded.avg_pace_sec_per_km`,
				avgHr: sql`excluded.avg_hr`,
				maxHr: sql`excluded.max_hr`,
				calories: sql`excluded.calories`,
				source: sql`excluded.source`,
				route: sql`excluded.route`,
				raw: sql`excluded.raw`,
			},
		});

	return unique.length;
}

/** Upsert merged daily rows into `health_daily`, keeping any field the batch omits. */
async function upsertDaily(db: Db, userId: string, patches: DailyPatch[]): Promise<number> {
	const combined = combineDailyPatches(patches);
	if (combined.length === 0) return 0;

	const dates = combined.map((patch) => patch.date);
	const existingRows = await db
		.select()
		.from(schema.healthDaily)
		.where(
			and(
				eq(schema.healthDaily.userId, userId),
				eq(schema.healthDaily.provider, 'google-health'),
				inArray(schema.healthDaily.date, dates),
			),
		);
	const existingByDate = new Map<string, DailyPatch>(
		existingRows.map((row) => [
			row.date,
			{
				date: row.date,
				metrics: {
					resting_hr: row.restingHr ?? undefined,
					hrv_ms: row.hrvMs ?? undefined,
					sleep_min: row.sleepMin ?? undefined,
					steps: row.steps ?? undefined,
					// undefined values in a spread overwrite, so cleanMetrics drops the empties.
				} as Record<string, number>,
				raw: (row.raw as Record<string, unknown> | null) ?? undefined,
			},
		]),
	);

	const merged = combined.map((patch) => {
		const base = existingByDate.get(patch.date);
		const existing: DailyPatch | undefined = base
			? { date: base.date, metrics: cleanMetrics(base.metrics), raw: base.raw }
			: undefined;
		return mergeDailyPatch(existing, patch);
	});

	await db
		.insert(schema.healthDaily)
		.values(
			merged.map((patch) => ({
				id: crypto.randomUUID(),
				userId,
				provider: 'google-health' as const,
				date: patch.date,
				...healthRowValues(patch),
				raw: { ...(patch.raw ?? {}) },
			})),
		)
		.onConflictDoUpdate({
			target: [
				schema.healthDaily.userId,
				schema.healthDaily.provider,
				schema.healthDaily.date,
			],
			set: {
				restingHr: sql`excluded.resting_hr`,
				hrvMs: sql`excluded.hrv_ms`,
				sleepMin: sql`excluded.sleep_min`,
				steps: sql`excluded.steps`,
				raw: sql`excluded.raw`,
			},
		});

	return merged.length;
}

/** Drop keys whose value is not a number, so a null column never becomes a metric. */
function cleanMetrics(metrics: Record<string, number>): Record<string, number> {
	const out: Record<string, number> = {};
	for (const [key, value] of Object.entries(metrics)) {
		if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
	}
	return out;
}

/** Upsert the generic daily metrics, one row per day and metric. */
async function upsertMetrics(db: Db, userId: string, patches: DailyPatch[]): Promise<number> {
	const combined = combineDailyPatches(patches);
	const rows: {
		id: string;
		userId: string;
		provider: 'google-health';
		date: string;
		metric: string;
		value: number;
		unit: null;
		raw: unknown;
	}[] = [];
	for (const patch of combined) {
		for (const [metric, value] of Object.entries(patch.metrics)) {
			if (typeof value !== 'number' || !Number.isFinite(value)) continue;
			rows.push({
				id: crypto.randomUUID(),
				userId,
				provider: 'google-health' as const,
				date: patch.date,
				metric,
				value,
				unit: null,
				raw: { [metric]: (patch.raw ?? {})[metric] ?? null },
			});
		}
	}
	if (rows.length === 0) return 0;

	await db
		.insert(schema.healthMetrics)
		.values(rows)
		.onConflictDoUpdate({
			target: [
				schema.healthMetrics.userId,
				schema.healthMetrics.provider,
				schema.healthMetrics.date,
				schema.healthMetrics.metric,
			],
			set: {
				value: sql`excluded.value`,
				raw: sql`excluded.raw`,
			},
		});

	return rows.length;
}

/** Upsert sparse point samples, one row per metric and sample time. */
async function upsertSamples(db: Db, userId: string, samples: MappedSample[]): Promise<number> {
	if (samples.length === 0) return 0;

	// One row per metric and instant, so a repeat within a page is not sent twice.
	const byKey = new Map<string, MappedSample>();
	for (const row of samples) {
		byKey.set(`${row.metric}:${row.sampleTime.getTime()}`, row);
	}
	const unique = [...byKey.values()];

	await db
		.insert(schema.healthSamples)
		.values(
			unique.map((row) => ({
				id: crypto.randomUUID(),
				userId,
				provider: 'google-health' as const,
				metric: row.metric,
				sampleTime: row.sampleTime,
				value: row.value,
				unit: row.unit,
				raw: row.raw,
			})),
		)
		.onConflictDoUpdate({
			target: [
				schema.healthSamples.userId,
				schema.healthSamples.provider,
				schema.healthSamples.metric,
				schema.healthSamples.sampleTime,
			],
			set: {
				value: sql`excluded.value`,
				unit: sql`excluded.unit`,
				raw: sql`excluded.raw`,
			},
		});

	return unique.length;
}

/** Fetch and upsert the exercises for the window. */
async function syncActivities(
	accessToken: string,
	since: Date,
	options: SyncOptions,
): Promise<GoogleDataPoint[]> {
	return fetchPoints(
		accessToken,
		{ dataType: GoogleHealthDataType.exercise, pageSize: 25, method: 'list', filterKind: 'exercise' },
		since,
		options.maxPages ?? 2,
		options.baseUrl,
	);
}

/**
 * Sync one connection. Never throws for a provider or network failure: it marks
 * the connection errored and records a message with no token in it.
 */
export async function syncConnection(
	env: Env,
	db: Db,
	connection: ConnectionRow,
	options: SyncOptions = {},
): Promise<SyncResult> {
	try {
		const cfg = PROVIDERS['google-health'];
		const accessToken = await getAccessToken(env, db, cfg, connection);

		const now = new Date();
		const since = syncSince(connection.lastSyncedAt, now);
		const { daily, samples } = await pullHealthData(accessToken, since, now, options);

		const exercisePoints = await syncActivities(accessToken, since, options).catch(() => []);

		const activityCount = await upsertActivities(db, connection.userId, exercisePoints);
		const dailyCount = await upsertDaily(db, connection.userId, daily);
		const metricCount = await upsertMetrics(db, connection.userId, daily);
		const sampleCount = await upsertSamples(db, connection.userId, samples);

		await db
			.update(schema.connections)
			.set({
				lastSyncedAt: now,
				syncRequestedAt: null,
				status: 'connected',
				updatedAt: now,
			})
			.where(eq(schema.connections.id, connection.id));

		return {
			activities: activityCount,
			daily: dailyCount,
			metrics: metricCount,
			samples: sampleCount,
		};
	} catch {
		await db
			.update(schema.connections)
			.set({ status: 'error', updatedAt: new Date() })
			.where(eq(schema.connections.id, connection.id));
		await db
			.insert(schema.appErrors)
			.values({
				id: crypto.randomUUID(),
				name: 'GoogleHealthSyncError',
				message: 'google health sync failed',
				path: `connections/google-health/${connection.id}`,
				method: 'SYNC',
			})
			.catch(() => undefined);
		return { activities: 0, daily: 0, metrics: 0, samples: 0 };
	}
}

/** A manual sync reuses the last result when a sync succeeded this recently. */
export const MANUAL_SYNC_WINDOW_MS = 20 * 60 * 1000;

/** Label stored with the cached manual-sync result. */
const MANUAL_SYNC_CACHE_MODEL = 'connection-sync';

function manualSyncCacheKey(connectionId: string): string {
	return `connection-sync:${connectionId}`;
}

/** How many connections one cron pass will sync. */
export const MAX_CONNECTIONS_PER_RUN = 25;

/**
 * Whether a manual sync should call the provider now. A fresh success reuses the
 * stored result; a failure or no history runs again.
 */
export function manualSyncNeeded(
	lastSyncedAt: Date | null,
	status: 'connected' | 'error',
	now: Date,
	windowMs: number = MANUAL_SYNC_WINDOW_MS,
): boolean {
	if (status === 'error') return true;
	if (!lastSyncedAt) return true;
	return now.getTime() - lastSyncedAt.getTime() >= windowMs;
}

/** What a manual sync hands back to the caller. */
export interface ManualSyncOutcome {
	synced: number;
	cached: boolean;
	lastSyncedAt: string;
}

/**
 * Run one manual sync for a connection, or return the cached result when the last
 * sync is still fresh. The caller has already confirmed the connection exists.
 * Records the result count so a cached reply can report what the last run pulled.
 */
export async function manualSyncConnection(
	env: Env,
	db: Db,
	connection: ConnectionRow,
	now: Date = new Date(),
): Promise<ManualSyncOutcome> {
	if (!manualSyncNeeded(connection.lastSyncedAt, connection.status, now)) {
		const stored = (await getCached(db, manualSyncCacheKey(connection.id))) as {
			synced?: number;
		} | null;
		return {
			synced: stored?.synced ?? 0,
			cached: true,
			lastSyncedAt: connection.lastSyncedAt!.toISOString(),
		};
	}

	const result = await syncConnection(env, db, connection);
	const synced = result.activities + result.daily + result.metrics + result.samples;

	const rows = await db
		.select()
		.from(schema.connections)
		.where(eq(schema.connections.id, connection.id))
		.limit(1);
	const updated = rows[0];
	const succeeded = updated?.status === 'connected' && updated.lastSyncedAt != null;

	if (succeeded) {
		await putCache(
			db,
			manualSyncCacheKey(connection.id),
			{ synced },
			MANUAL_SYNC_CACHE_MODEL,
			Math.round(MANUAL_SYNC_WINDOW_MS / 1000),
		).catch(() => undefined);
	}

	return {
		synced: succeeded ? synced : 0,
		cached: false,
		lastSyncedAt: (updated?.lastSyncedAt ?? connection.lastSyncedAt)?.toISOString() ?? '',
	};
}

/**
 * Cron fan-out. Picks the connections that most need a sync first: those a
 * webhook flagged, then ones never synced, then the oldest. Bounded per run and
 * per connection. Errored rows are retried, so a transient failure self-heals.
 */
export async function runConnectionSyncs(env: Env, db: Db): Promise<void> {
	const rows = await db
		.select()
		.from(schema.connections)
		.where(
			and(
				eq(schema.connections.provider, 'google-health'),
				or(eq(schema.connections.status, 'connected'), eq(schema.connections.status, 'error')),
			),
		)
		.orderBy(
			// Flagged first, then never-synced, then oldest sync.
			sql`case when ${schema.connections.syncRequestedAt} is null then 1 else 0 end`,
			sql`case when ${schema.connections.lastSyncedAt} is null then 0 else 1 end`,
			asc(schema.connections.lastSyncedAt),
		)
		.limit(MAX_CONNECTIONS_PER_RUN);

	for (const row of rows) {
		await syncConnection(env, db, row);
	}
}

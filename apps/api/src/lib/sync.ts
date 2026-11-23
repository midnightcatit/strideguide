import { and, eq, inArray, or, asc, sql } from 'drizzle-orm';
import { schema, type Db } from '../db';
import type { Env } from '../env';
import { PROVIDERS } from './providers';
import {
	getAccessToken,
	type ConnectionRow,
} from './connections';
import {
	GoogleHealthDataType,
	listDataPointsBounded,
	type GoogleDataPoint,
} from './google-health';
import {
	combineDailyPatches,
	mapDailyHeartRateVariability,
	mapDailyRestingHeartRate,
	mapExercise,
	mapSleep,
	mergeDailyRow,
	stepsByDate,
	syncSince,
	type DailyPatch,
	type DailyRow,
} from './google-health-map';

/**
 * Provider sync. Pulls new records since the last sync for one connection and
 * upserts them, so a re-run never duplicates a row.
 *
 * Each run is bounded: a small page count per data type. The window starts at the
 * connection's `lastSyncedAt`, so the next run resumes where this one stopped.
 * Failures land on the connection's status; nothing here logs a token.
 */

/** Data types pulled per run, with the page size each accepts. */
const PULLS = [
	{ dataType: GoogleHealthDataType.exercise, pageSize: 25, method: 'list' as const },
	// Sleep overlaps across sources, so reconcile dedupes it into one stream.
	{ dataType: GoogleHealthDataType.sleep, pageSize: 25, method: 'reconcile' as const },
	{ dataType: GoogleHealthDataType.steps, pageSize: 1000, method: 'list' as const },
	{ dataType: GoogleHealthDataType.dailyRestingHeartRate, pageSize: 90, method: 'list' as const },
	{ dataType: GoogleHealthDataType.dailyHeartRateVariability, pageSize: 90, method: 'list' as const },
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

/**
 * Build the filter for one data type. Over-fetching is safe: activities upsert on
 * (provider, external_id) and daily rows merge by date, so an overlap costs a
 * read, never a duplicate.
 */
function filterFor(dataType: string, since: Date): string {
	const day = isoDay(since);
	switch (dataType) {
		case GoogleHealthDataType.exercise:
			// Exercise only supports filtering by civil_start_time.
			return `exercise.interval.civil_start_time >= "${civilTimestamp(since)}"`;
		case GoogleHealthDataType.sleep:
			// Sleep only supports filtering by its end time.
			return `sleep.interval.end_time >= "${rfc3339(since)}"`;
		case GoogleHealthDataType.steps:
			return `steps.interval.start_time >= "${rfc3339(since)}"`;
		case GoogleHealthDataType.dailyRestingHeartRate:
			return `daily_resting_heart_rate.date >= "${day}"`;
		case GoogleHealthDataType.dailyHeartRateVariability:
			return `daily_heart_rate_variability.date >= "${day}"`;
		default:
			return '';
	}
}

/** Fetch every type for the window, bounded by maxPages. */
async function pullPoints(
	accessToken: string,
	since: Date,
	options: SyncOptions,
): Promise<GoogleDataPoint[]> {
	const maxPages = options.maxPages ?? 2;
	const all: GoogleDataPoint[] = [];
	for (const pull of PULLS) {
		const points = await listDataPointsBounded<GoogleDataPoint>(accessToken, pull.dataType, {
			filter: filterFor(pull.dataType, since),
			pageSize: pull.pageSize,
			method: pull.method,
			maxPages,
			baseUrl: options.baseUrl,
		});
		all.push(...points);
	}
	return all;
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

/** Upsert merged daily rows, keeping any field the incoming batch does not carry. */
async function upsertDaily(
	db: Db,
	userId: string,
	patches: DailyPatch[],
): Promise<number> {
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
	const byDate = new Map<string, DailyRow>(
		existingRows.map((row) => [
			row.date,
			{
				date: row.date,
				restingHr: row.restingHr,
				hrvMs: row.hrvMs,
				sleepMin: row.sleepMin,
				steps: row.steps,
				raw: (row.raw as Record<string, unknown> | null) ?? null,
			},
		]),
	);

	const merged = combined.map((patch) => mergeDailyRow(byDate.get(patch.date), patch));

	await db
		.insert(schema.healthDaily)
		.values(
			merged.map((row) => ({
				id: crypto.randomUUID(),
				userId,
				provider: 'google-health' as const,
				...row,
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
		const points = await pullPoints(accessToken, since, options);

		const dailyPatches: DailyPatch[] = [];
		for (const point of points) {
			const sleep = mapSleep(point);
			if (sleep) dailyPatches.push(sleep);
			const resting = mapDailyRestingHeartRate(point);
			if (resting) dailyPatches.push(resting);
			const hrv = mapDailyHeartRateVariability(point);
			if (hrv) dailyPatches.push(hrv);
		}
		dailyPatches.push(...stepsByDate(points));

		const activityCount = await upsertActivities(db, connection.userId, points);
		const dailyCount = await upsertDaily(db, connection.userId, dailyPatches);

		await db
			.update(schema.connections)
			.set({
				lastSyncedAt: now,
				syncRequestedAt: null,
				status: 'connected',
				updatedAt: now,
			})
			.where(eq(schema.connections.id, connection.id));

		return { activities: activityCount, daily: dailyCount };
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
		return { activities: 0, daily: 0 };
	}
}

/** How many connections one cron pass will sync. */
export const MAX_CONNECTIONS_PER_RUN = 25;

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

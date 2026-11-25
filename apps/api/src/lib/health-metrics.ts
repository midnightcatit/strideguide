import type { HealthDay } from '@strideguide/shared/plan';
import { dayFromMetrics } from '@strideguide/shared/plan';
import type { AppBindings } from '../types';

/**
 * The grouped health metrics the web charts: a series per metric over a chosen
 * window, plus the latest point so a condensed card needs no client logic. Kept
 * thin: the route calls `loadHealthMetrics`, the grouping is pure and testable.
 *
 * Everything is read through the user id, and a table that does not exist yet
 * simply yields an empty payload, so the app shows nothing rather than an error.
 */

type D1 = AppBindings['Bindings']['DB'];

/** One day's value for a metric. */
export interface MetricPoint {
	date: string;
	value: number;
}

/** One sampled value for a metric. */
export interface SamplePoint {
	time: string;
	value: number;
	unit: string | null;
}

/** A metric series with its newest point pulled out for a card. */
export interface MetricSeries<T> {
	latest: T | null;
	series: T[];
}

export interface HealthMetricsPayload {
	available: boolean;
	windowDays: number;
	metrics: Record<string, MetricSeries<MetricPoint>>;
	samples: Record<string, MetricSeries<SamplePoint>>;
}

/** The windows the client can ask for. Anything else falls back to the default. */
export const WINDOW_CHOICES = [7, 30, 90] as const;
export const DEFAULT_WINDOW_DAYS = 30;

/** Pick a supported window from a query value, defaulting when it is absent. */
export function normalizeWindow(value: unknown): number {
	const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
	return (WINDOW_CHOICES as readonly number[]).includes(n) ? n : DEFAULT_WINDOW_DAYS;
}

/** Group metric rows into a series per metric, sorted oldest first. */
export function groupMetricRows(
	rows: { date: string; metric: string; value: number }[],
): Record<string, MetricPoint[]> {
	const out: Record<string, MetricPoint[]> = {};
	for (const row of rows) {
		if (typeof row.value !== 'number' || !Number.isFinite(row.value)) continue;
		const date = typeof row.date === 'string' ? row.date.slice(0, 10) : '';
		if (!date) continue;
		(out[row.metric] ??= []).push({ date, value: row.value });
	}
	for (const series of Object.values(out)) series.sort((a, b) => a.date.localeCompare(b.date));
	return out;
}

/** Group sample rows into a series per metric, sorted oldest first. */
export function groupSampleRows(
	rows: { metric: string; sampleTime: number; value: number; unit?: string | null }[],
): Record<string, SamplePoint[]> {
	const out: Record<string, SamplePoint[]> = {};
	for (const row of rows) {
		if (typeof row.value !== 'number' || !Number.isFinite(row.value)) continue;
		if (typeof row.sampleTime !== 'number') continue;
		const time = new Date(row.sampleTime * 1000).toISOString();
		(out[row.metric] ??= []).push({ time, value: row.value, unit: row.unit ?? null });
	}
	for (const series of Object.values(out)) series.sort((a, b) => a.time.localeCompare(b.time));
	return out;
}

/** Wrap each series with its newest point. */
export function withLatest<T>(byMetric: Record<string, T[]>): Record<string, MetricSeries<T>> {
	const out: Record<string, MetricSeries<T>> = {};
	for (const [metric, series] of Object.entries(byMetric)) {
		out[metric] = { latest: series.length ? series[series.length - 1]! : null, series };
	}
	return out;
}

/** `YYYY-MM-DD` for an instant, as the stored daily keys are written. */
function isoDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/**
 * The four legacy `health_daily` columns, paired with the metric key each one
 * maps to in the store. The keys match `HealthMetric` in google-health-map, so a
 * fallback row is indistinguishable from a row the sync wrote.
 */
const LEGACY_DAILY_COLUMNS: { column: string; metric: string }[] = [
	{ column: 'resting_hr', metric: 'resting_hr' },
	{ column: 'hrv_ms', metric: 'hrv_ms' },
	{ column: 'sleep_min', metric: 'sleep_min' },
	{ column: 'steps', metric: 'steps' },
];

/**
 * Project legacy `health_daily` rows into the store's `{ date, metric, value }`
 * shape. Pure, so the fallback read has no hidden behaviour and is cheap to test.
 */
export function legacyDailyMetricRows(
	rows: Record<string, unknown>[],
): { date: string; metric: string; value: number }[] {
	const out: { date: string; metric: string; value: number }[] = [];
	for (const row of rows) {
		const date = typeof row.date === 'string' ? row.date.slice(0, 10) : '';
		if (!date) continue;
		for (const { column, metric } of LEGACY_DAILY_COLUMNS) {
			const value = row[column];
			if (typeof value !== 'number' || !Number.isFinite(value)) continue;
			out.push({ date, metric, value });
		}
	}
	return out;
}

/** Whether a table is present, so a missing one is an empty payload, not an error. */
async function hasTable(db: D1, name: string): Promise<boolean> {
	try {
		const row = await db
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
			.bind(name)
			.first<{ name: string }>();
		return !!row;
	} catch {
		return false;
	}
}

/**
 * Load every stored metric and sample for the window, grouped and newest-labelled.
 *
 * The generic store is the single source. The legacy `health_daily` table is read
 * only as a fallback, and only when the store has no rows for the window, so the
 * dashboard card and the recovery read agree on the same numbers and the two
 * never act as parallel sources.
 */
export async function loadHealthMetrics(
	db: D1,
	userId: string,
	windowDays: number,
	now: Date = new Date(),
): Promise<HealthMetricsPayload> {
	const empty: HealthMetricsPayload = { available: false, windowDays, metrics: {}, samples: {} };
	const sinceDate = isoDay(new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000));
	const sinceEpoch = Math.floor(now.getTime() / 1000) - windowDays * 24 * 60 * 60;

	const [hasMetrics, hasSamples, hasLegacy] = await Promise.all([
		hasTable(db, 'health_metrics'),
		hasTable(db, 'health_samples'),
		hasTable(db, 'health_daily'),
	]);
	if (!hasMetrics && !hasSamples && !hasLegacy) return empty;

	let metrics: Record<string, MetricSeries<MetricPoint>> = {};
	let samples: Record<string, MetricSeries<SamplePoint>> = {};

	if (hasMetrics) {
		try {
			const result = await db
				.prepare(
					'SELECT date, metric, value FROM health_metrics WHERE user_id = ? AND date >= ? ORDER BY date ASC',
				)
				.bind(userId, sinceDate)
				.all<{ date: string; metric: string; value: number }>();
			metrics = withLatest(groupMetricRows(result.results ?? []));
		} catch {
			metrics = {};
		}
	}

	// Fallback for a deployment that has not migrated the legacy rows yet. Runs
	// only when the store holds nothing for the window, so the store stays first
	// and health_daily is never a parallel source.
	if (Object.keys(metrics).length === 0 && hasLegacy) {
		try {
			const result = await db
				.prepare(
					'SELECT date, resting_hr, hrv_ms, sleep_min, steps FROM health_daily WHERE user_id = ? AND date >= ? ORDER BY date ASC',
				)
				.bind(userId, sinceDate)
				.all<Record<string, unknown>>();
			metrics = withLatest(groupMetricRows(legacyDailyMetricRows(result.results ?? [])));
		} catch {
			metrics = {};
		}
	}

	if (hasSamples) {
		try {
			const result = await db
				.prepare(
					'SELECT metric, sample_time, value, unit FROM health_samples WHERE user_id = ? AND sample_time >= ? ORDER BY sample_time ASC',
				)
				.bind(userId, sinceEpoch)
				.all<{ metric: string; sample_time: number; value: number; unit: string | null }>();
			samples = withLatest(
				groupSampleRows(
					(result.results ?? []).map((row) => ({
						metric: row.metric,
						sampleTime: row.sample_time,
						value: row.value,
						unit: row.unit,
					})),
				),
			);
		} catch {
			samples = {};
		}
	}

	return { available: true, windowDays, metrics, samples };
}

/** The days and step totals the recovery read wants, or null when there is none. */
export interface HealthDaysResult {
	days: HealthDay[];
	steps: { date: string; steps: number }[];
}

/**
 * Build the recent health days from the generic metrics store, so the recovery
 * signal sees every metric the connector supplied. Returns null when the store is
 * absent or empty, which tells the caller to fall back to the legacy daily table.
 */
export async function loadHealthDaysFromMetrics(
	db: D1,
	userId: string,
	limit = 21,
): Promise<HealthDaysResult | null> {
	if (!(await hasTable(db, 'health_metrics'))) return null;

	const dateRows = await db
		.prepare('SELECT DISTINCT date FROM health_metrics WHERE user_id = ? ORDER BY date DESC LIMIT ?')
		.bind(userId, limit)
		.all<{ date: string }>();
	const dates = (dateRows.results ?? []).map((row) => row.date);
	if (dates.length === 0) return null;

	const placeholders = dates.map(() => '?').join(',');
	const rows = await db
		.prepare(
			`SELECT date, metric, value FROM health_metrics WHERE user_id = ? AND date IN (${placeholders})`,
		)
		.bind(userId, ...dates)
		.all<{ date: string; metric: string; value: number }>();

	const byDate = new Map<string, Record<string, number>>();
	for (const row of rows.results ?? []) {
		const metrics = byDate.get(row.date) ?? {};
		metrics[row.metric] = row.value;
		byDate.set(row.date, metrics);
	}

	const days = [...byDate.entries()]
		.map(([date, metrics]) => dayFromMetrics(date, metrics))
		.sort((a, b) => b.date.localeCompare(a.date));
	const steps = days
		.filter((day) => typeof day.steps === 'number')
		.map((day) => ({ date: day.date, steps: day.steps as number }));

	return { days, steps };
}

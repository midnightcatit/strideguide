import type { HealthDay } from '@strideguide/shared/plan';
import { dayFromMetrics } from '@strideguide/shared/plan';
import type { AppBindings } from '../types';
import { LEGACY_DAILY_METRICS } from './google-health-map';

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

/** The `health_daily` column that carries each legacy metric. */
const LEGACY_DAILY_COLUMN: Record<string, string> = {
	restingHr: 'resting_hr',
	hrvMs: 'hrv_ms',
	sleepMin: 'sleep_min',
	steps: 'steps',
};

/**
 * Read the four legacy daily metrics straight from `health_daily` and shape them
 * like the generic store. This is a fallback only: it is consulted when
 * `health_metrics` holds nothing for the window, so a deployment that has not been
 * backfilled yet shows the same history the recovery view already reads, and the
 * dashboard and the recovery read never disagree.
 */
async function loadLegacyMetricSeries(
	db: D1,
	userId: string,
	sinceDate: string,
): Promise<Record<string, MetricSeries<MetricPoint>>> {
	if (!(await hasTable(db, 'health_daily'))) return {};
	try {
		const result = await db
			.prepare(
				'SELECT date, resting_hr, hrv_ms, sleep_min, steps FROM health_daily WHERE user_id = ? AND date >= ? ORDER BY date ASC',
			)
			.bind(userId, sinceDate)
			.all<Record<string, unknown>>();
		const rows: { date: string; metric: string; value: number }[] = [];
		for (const row of result.results ?? []) {
			const date = typeof row.date === 'string' ? row.date.slice(0, 10) : '';
			if (!date) continue;
			for (const { metric, column } of LEGACY_DAILY_METRICS) {
				const value = row[LEGACY_DAILY_COLUMN[column]!];
				if (typeof value === 'number' && Number.isFinite(value)) {
					rows.push({ date, metric, value });
				}
			}
		}
		return withLatest(groupMetricRows(rows));
	} catch {
		return {};
	}
}

/** Load every stored metric and sample for the window, grouped and newest-labelled. */
export async function loadHealthMetrics(
	db: D1,
	userId: string,
	windowDays: number,
	now: Date = new Date(),
): Promise<HealthMetricsPayload> {
	const empty: HealthMetricsPayload = { available: false, windowDays, metrics: {}, samples: {} };
	const sinceDate = isoDay(new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000));
	const sinceEpoch = Math.floor(now.getTime() / 1000) - windowDays * 24 * 60 * 60;

	const [hasMetrics, hasSamples, hasDaily] = await Promise.all([
		hasTable(db, 'health_metrics'),
		hasTable(db, 'health_samples'),
		hasTable(db, 'health_daily'),
	]);
	if (!hasMetrics && !hasSamples && !hasDaily) return empty;

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

	// The generic store is the single source. When it holds nothing for the
	// window, fall back to the legacy daily table rather than showing nothing, so
	// this read matches what the recovery view returns.
	if (Object.keys(metrics).length === 0) {
		metrics = await loadLegacyMetricSeries(db, userId, sinceDate);
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

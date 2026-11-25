import { describe, expect, it } from 'vitest';
import {
	DEFAULT_WINDOW_DAYS,
	groupMetricRows,
	groupSampleRows,
	legacyDailyMetricRows,
	normalizeWindow,
	withLatest,
} from './health-metrics';

describe('normalizeWindow', () => {
	it('accepts the three offered windows as strings or numbers', () => {
		expect(normalizeWindow('7')).toBe(7);
		expect(normalizeWindow('30')).toBe(30);
		expect(normalizeWindow(90)).toBe(90);
	});

	it('falls back to the default for anything else', () => {
		expect(normalizeWindow('14')).toBe(DEFAULT_WINDOW_DAYS);
		expect(normalizeWindow(undefined)).toBe(DEFAULT_WINDOW_DAYS);
		expect(normalizeWindow('abc')).toBe(DEFAULT_WINDOW_DAYS);
	});
});

describe('groupMetricRows', () => {
	it('groups by metric and sorts each series oldest first', () => {
		const grouped = groupMetricRows([
			{ date: '2026-04-21', metric: 'steps', value: 900 },
			{ date: '2026-04-20', metric: 'steps', value: 800 },
			{ date: '2026-04-20', metric: 'resting_hr', value: 52 },
		]);
		expect(grouped.steps).toEqual([
			{ date: '2026-04-20', value: 800 },
			{ date: '2026-04-21', value: 900 },
		]);
		expect(grouped.resting_hr).toEqual([{ date: '2026-04-20', value: 52 }]);
	});

	it('trims a full timestamp to the day and drops a non-finite value', () => {
		const grouped = groupMetricRows([
			{ date: '2026-04-20T00:00:00Z', metric: 'steps', value: 800 },
			{ date: '2026-04-21', metric: 'steps', value: Number.NaN },
		]);
		expect(grouped.steps).toEqual([{ date: '2026-04-20', value: 800 }]);
	});
});

describe('groupSampleRows', () => {
	it('converts the stored epoch seconds to an ISO instant and sorts oldest first', () => {
		const grouped = groupSampleRows([
			{ metric: 'weight_kg', sampleTime: 1776000000, value: 72.4, unit: 'kg' },
			{ metric: 'weight_kg', sampleTime: 1775500000, value: 72.8, unit: 'kg' },
			{ metric: 'body_fat_pct', sampleTime: 1776000000, value: 18.2, unit: '%' },
		]);
		expect(grouped.weight_kg).toHaveLength(2);
		expect(grouped.weight_kg![0]!.value).toBe(72.8);
		expect(grouped.weight_kg![1]!.time).toBe(new Date(1776000000 * 1000).toISOString());
		expect(grouped.body_fat_pct).toEqual([
			{ time: new Date(1776000000 * 1000).toISOString(), value: 18.2, unit: '%' },
		]);
	});
});

describe('withLatest', () => {
	it('labels the newest point and keeps the series', () => {
		const out = withLatest({ steps: [{ date: '2026-04-20', value: 800 }, { date: '2026-04-21', value: 900 }] });
		expect(out.steps!.latest).toEqual({ date: '2026-04-21', value: 900 });
		expect(out.steps!.series).toHaveLength(2);
	});

	it('reports a null latest for an empty series', () => {
		expect(withLatest({ steps: [] }).steps).toEqual({ latest: null, series: [] });
	});
});

describe('legacyDailyMetricRows', () => {
	it('projects the four legacy columns into store-shaped metric rows', () => {
		const rows = legacyDailyMetricRows([
			{ date: '2026-11-23', resting_hr: 57, hrv_ms: 51.9, sleep_min: 241, steps: 4507 },
		]);
		expect(rows).toEqual([
			{ date: '2026-11-23', metric: 'resting_hr', value: 57 },
			{ date: '2026-11-23', metric: 'hrv_ms', value: 51.9 },
			{ date: '2026-11-23', metric: 'sleep_min', value: 241 },
			{ date: '2026-11-23', metric: 'steps', value: 4507 },
		]);
	});

	it('skips a null column instead of inventing a zero', () => {
		const rows = legacyDailyMetricRows([
			{ date: '2026-11-20', resting_hr: 57, hrv_ms: null, sleep_min: null, steps: null },
		]);
		expect(rows).toEqual([{ date: '2026-11-20', metric: 'resting_hr', value: 57 }]);
	});

	it('drops a row with no usable date', () => {
		expect(legacyDailyMetricRows([{ resting_hr: 57, steps: 100 }])).toEqual([]);
	});
});

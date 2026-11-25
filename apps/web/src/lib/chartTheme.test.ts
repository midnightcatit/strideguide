import { describe, expect, it } from 'vitest';
import {
	FAMILY_CHART,
	METRIC_FAMILY,
	familyColor,
	metricColor,
	metricFamily,
	periodDelta,
	signed,
	shortDay,
	spreadBand,
	toDate,
} from './chartTheme';

describe('metric to colour mapping', () => {
	it('gives every family a distinct palette slot', () => {
		const slots = Object.values(FAMILY_CHART);
		expect(new Set(slots).size).toBe(slots.length);
	});

	it('keeps a metric in one family everywhere', () => {
		expect(metricColor('resting_hr')).toBe(metricColor('hrv_ms'));
		expect(metricColor('resting_hr')).toBe(familyColor('heart'));
		expect(metricColor('steps')).toBe(familyColor('activity'));
	});

	it('puts different metrics in different families', () => {
		expect(metricFamily('sleep_min')).not.toBe(metricFamily('steps'));
		expect(metricFamily('weight_kg')).not.toBe(metricFamily('resting_hr'));
	});

	it('never names a metric outside the palette', () => {
		for (const family of Object.values(METRIC_FAMILY)) {
			expect(familyColor(family)).toMatch(/^var\(--chart-[1-8]\)$/);
		}
	});

	it('falls back to the body family for an unknown measurement', () => {
		expect(metricFamily('cortisol_ng_ml')).toBe('body');
	});
});

describe('period change', () => {
	it('is the newer-half mean minus the older-half mean', () => {
		expect(periodDelta([10, 10, 20, 20])).toBe(10);
	});

	it('is null when there is nothing to compare', () => {
		expect(periodDelta([])).toBeNull();
		expect(periodDelta([42])).toBeNull();
	});

	it('ignores non-finite readings', () => {
		expect(periodDelta([Number.NaN, 10, 10, 20, 20])).toBe(10);
	});
});

describe('spread band', () => {
	it('sits one standard deviation either side of the mean', () => {
		const band = spreadBand([10, 12, 14]);
		expect(band?.[0]).toBeCloseTo(12 - Math.sqrt(8 / 3));
		expect(band?.[1]).toBeCloseTo(12 + Math.sqrt(8 / 3));
	});

	it('is null when the window is too short or flat', () => {
		expect(spreadBand([60, 61])).toBeNull();
		expect(spreadBand([60, 60, 60])).toBeNull();
	});
});

describe('value formatting and dates', () => {
	it('signs a value and rounds it', () => {
		expect(signed(4.2)).toBe('+4');
		expect(signed(-4.6)).toBe('-5');
		expect(signed(0)).toBe('0');
	});

	it('reads an ISO day at UTC midnight', () => {
		expect(toDate('2026-11-24')?.toISOString()).toBe('2026-11-24T00:00:00.000Z');
	});

	it('returns null for an unreadable date', () => {
		expect(toDate('not a date')).toBeNull();
	});

	it('shortens a day without depending on the local zone', () => {
		expect(shortDay('2026-11-24')).toContain('24');
	});
});

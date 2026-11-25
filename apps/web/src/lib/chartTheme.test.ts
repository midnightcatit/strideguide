import { describe, expect, it } from 'vitest';
import {
	FAMILY_CHART,
	GOAL_DEFAULTS,
	METRIC_FAMILY,
	familyColor,
	metricColor,
	metricFamily,
	metricGoal,
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
	it('is this window mean minus the previous window mean', () => {
		expect(periodDelta([20, 20], 10)).toBe(10);
		expect(periodDelta([4, 5, 6], 5)).toBe(0);
	});

	it('is null when the previous window has no reading', () => {
		expect(periodDelta([10, 20], null)).toBeNull();
		expect(periodDelta([10, 20], undefined)).toBeNull();
	});

	it('is null when this window has nothing to average', () => {
		expect(periodDelta([], 10)).toBeNull();
	});

	it('ignores non-finite readings in this window', () => {
		expect(periodDelta([Number.NaN, 20, 20], 10)).toBe(10);
	});
});

describe('activity goals', () => {
	it('reads a metric goal from the stored prefs', () => {
		expect(metricGoal('steps', { stepGoal: 8000 })).toBe(8000);
		expect(metricGoal('active_energy_kcal', { activeEnergyGoalKcal: 650 })).toBe(650);
		expect(metricGoal('active_zone_min', { activeZoneGoalMin: 30 })).toBe(30);
	});

	it('falls back to the default when a goal is unset or not usable', () => {
		expect(metricGoal('steps', {})).toBe(GOAL_DEFAULTS.steps);
		expect(metricGoal('steps', { stepGoal: 0 })).toBe(GOAL_DEFAULTS.steps);
		expect(metricGoal('active_energy_kcal', { activeEnergyGoalKcal: Number.NaN })).toBe(
			GOAL_DEFAULTS.active_energy_kcal,
		);
	});

	it('gives no goal to a metric that has none', () => {
		expect(metricGoal('resting_hr', {})).toBeNull();
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

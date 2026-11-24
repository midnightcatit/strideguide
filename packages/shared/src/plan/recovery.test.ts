import { describe, expect, it } from 'vitest';
import { dayFromMetrics, normalizeHealthRow, recoverySignal, type HealthDay } from './recovery';

function days(count: number, make: (i: number) => Partial<HealthDay>): HealthDay[] {
	return Array.from({ length: count }, (_, i) => ({ date: `2026-06-${String(i + 1).padStart(2, '0')}`, ...make(i) }));
}

describe('recoverySignal', () => {
	it('reads nothing from too few days', () => {
		const s = recoverySignal(days(2, () => ({ restingHr: 50, hrvMs: 70, sleepMin: 480 })));
		expect(s.strained).toBe(false);
		expect(s.avgRestingHr).toBeUndefined();
	});

	it('stays calm when the recent days match the baseline', () => {
		const s = recoverySignal(days(7, () => ({ restingHr: 50, hrvMs: 70, sleepMin: 480 })));
		expect(s.strained).toBe(false);
		expect(s.avgRestingHr).toBe(50);
	});

	it('flags strain when resting HR rises and HRV drops against the baseline', () => {
		const s = recoverySignal(
			days(7, (i) => (i >= 4 ? { restingHr: 58, hrvMs: 55, sleepMin: 350 } : { restingHr: 50, hrvMs: 72, sleepMin: 480 })),
		);
		expect(s.restingHrElevated).toBe(true);
		expect(s.hrvSuppressed).toBe(true);
		expect(s.shortSleep).toBe(true);
		expect(s.strained).toBe(true);
	});

	it('flags short sleep alone', () => {
		const s = recoverySignal(
			days(7, (i) => (i >= 4 ? { sleepMin: 330 } : { sleepMin: 480 })),
		);
		expect(s.shortSleep).toBe(true);
		expect(s.strained).toBe(true);
	});

	it('flags a low oxygen saturation and a breathing rate above baseline', () => {
		const s = recoverySignal(
			days(7, (i) => (i >= 4 ? { spo2Avg: 92, respiratoryRate: 18 } : { spo2Avg: 97, respiratoryRate: 14 })),
		);
		expect(s.lowSpo2).toBe(true);
		expect(s.respiratoryRateElevated).toBe(true);
		expect(s.strained).toBe(true);
	});

	it('flags a night temperature above baseline', () => {
		const s = recoverySignal(days(7, (i) => (i >= 4 ? { sleepTempC: 34.2 } : { sleepTempC: 33.4 })));
		expect(s.sleepTempElevated).toBe(true);
		expect(s.strained).toBe(true);
	});

	it('stays quiet when a device reports none of the new vitals', () => {
		const s = recoverySignal(days(7, () => ({})));
		expect(s.days).toBe(7);
		expect(s.avgSpo2Pct).toBeUndefined();
		expect(s.lowSpo2).toBe(false);
		expect(s.strained).toBe(false);
	});
});

describe('dayFromMetrics', () => {
	it('maps stored metric keys onto the day and leaves the absent ones off', () => {
		expect(dayFromMetrics('2026-06-01', { resting_hr: 52, spo2_avg: 96.5, steps: 9000 })).toEqual({
			date: '2026-06-01',
			restingHr: 52,
			spo2Avg: 96.5,
			steps: 9000,
		});
	});

	it('ignores a null or non-finite metric rather than storing a zero', () => {
		expect(dayFromMetrics('2026-06-01', { resting_hr: null, hrv_ms: Number.NaN })).toEqual({ date: '2026-06-01' });
	});
});

describe('normalizeHealthRow', () => {
	it('reads the common column spellings and normalises sleep to minutes', () => {
		expect(normalizeHealthRow({ date: '2026-06-01T00:00:00Z', resting_hr: 52, hrv_ms: 68, sleep_hours: 7.5 })).toEqual({
			date: '2026-06-01',
			restingHr: 52,
			hrvMs: 68,
			sleepMin: 450,
		});
	});

	it('returns null without a date', () => {
		expect(normalizeHealthRow({ resting_hr: 52 })).toBeNull();
	});
});

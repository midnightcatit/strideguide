import { describe, expect, it } from 'vitest';
import { normalizeHealthRow, recoverySignal, type HealthDay } from './recovery';

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

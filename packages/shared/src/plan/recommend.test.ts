import { describe, expect, it } from 'vitest';
import {
	ageBuildFactor,
	ageVolumeFactor,
	recommendWeeklyKm,
	suggestedWeeklyKm,
} from './recommend';

describe('recommendWeeklyKm', () => {
	it('keeps the value in km but writes the reason in the runner units', () => {
		const metric = recommendWeeklyKm('intermediate', 'marathon', 'metric');
		const imperial = recommendWeeklyKm('intermediate', 'marathon', 'imperial');

		expect(metric.value).toBe(suggestedWeeklyKm('intermediate', 'marathon'));
		expect(metric.reason).toContain(`${metric.value} km a week`);

		const miles = Math.round((metric.value / 1.609344) * 10) / 10;
		expect(imperial.reason).toContain(`${miles} mi a week`);
	});
});

describe('age adjustments', () => {
	it('is neutral when no age is given', () => {
		expect(ageVolumeFactor(undefined)).toBe(1);
		expect(ageBuildFactor(undefined)).toBe(1);
		expect(suggestedWeeklyKm('intermediate', 'marathon', undefined)).toBe(
			suggestedWeeklyKm('intermediate', 'marathon'),
		);
	});

	it('trims the suggested volume in steps by age band, never raising it', () => {
		const young = suggestedWeeklyKm('intermediate', 'marathon', 28);
		const mid = suggestedWeeklyKm('intermediate', 'marathon', 42);
		const older = suggestedWeeklyKm('intermediate', 'marathon', 55);
		const oldest = suggestedWeeklyKm('intermediate', 'marathon', 70);
		expect(mid).toBeLessThan(young);
		expect(older).toBeLessThan(mid);
		expect(oldest).toBeLessThan(older);
	});

	it('eases the build rate more sharply as age rises', () => {
		expect(ageBuildFactor(28)).toBe(1);
		expect(ageBuildFactor(42)).toBeLessThan(1);
		expect(ageBuildFactor(55)).toBeLessThan(ageBuildFactor(42));
		expect(ageBuildFactor(70)).toBeLessThan(ageBuildFactor(55));
	});
});

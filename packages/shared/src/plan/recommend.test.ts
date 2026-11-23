import { describe, expect, it } from 'vitest';
import { recommendWeeklyKm, suggestedWeeklyKm } from './recommend';

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

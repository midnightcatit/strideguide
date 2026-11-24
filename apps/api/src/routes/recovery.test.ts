import { describe, expect, it } from 'vitest';
import { stepDay } from './recovery';

describe('stepDay', () => {
	it('keeps a day that has a step count', () => {
		expect(stepDay({ date: '2026-11-20', steps: 8412 })).toEqual({
			date: '2026-11-20',
			steps: 8412,
		});
	});

	it('drops a day with no step count instead of reporting zero', () => {
		expect(stepDay({ date: '2026-11-20', steps: null })).toBeNull();
		expect(stepDay({ date: '2026-11-20' })).toBeNull();
	});

	it('reads a count stored as text and trims a full timestamp to the day', () => {
		expect(stepDay({ date: '2026-11-20T00:00:00Z', steps: '9000' })).toEqual({
			date: '2026-11-20',
			steps: 9000,
		});
	});
});

import { describe, expect, it } from 'vitest';
import { epochMs, localIso } from './dates';

describe('localIso', () => {
	it('formats a local date as yyyy-mm-dd with padded month and day', () => {
		expect(localIso(new Date(2026, 2, 5, 12, 0, 0))).toBe('2026-03-05');
		expect(localIso(new Date(2026, 11, 31, 12, 0, 0))).toBe('2026-12-31');
	});

	it('uses the local civil date, not the UTC date, just after midnight ahead of UTC', () => {
		const previous = process.env.TZ;
		process.env.TZ = 'Pacific/Auckland';
		try {
			// 00:30 on Tuesday in Auckland (UTC+13) is still Monday in UTC, which
			// is the case that sent "Back to today" to yesterday.
			const justAfterLocalMidnight = new Date('2026-11-23T11:30:00Z');
			expect(justAfterLocalMidnight.toISOString().slice(0, 10)).toBe('2026-11-23');
			expect(localIso(justAfterLocalMidnight)).toBe('2026-11-24');
		} finally {
			if (previous === undefined) delete process.env.TZ;
			else process.env.TZ = previous;
		}
	});
});

describe('epochMs', () => {
	it('reads a number as epoch seconds and an ISO string as milliseconds', () => {
		expect(epochMs(1767225600)).toBe(1767225600000);
		expect(epochMs('2026-01-01T00:00:00Z')).toBe(Date.parse('2026-01-01T00:00:00Z'));
	});

	it('returns undefined for a missing or unparseable value', () => {
		expect(epochMs(null)).toBeUndefined();
		expect(epochMs(undefined)).toBeUndefined();
		expect(epochMs('not a date')).toBeUndefined();
		expect(epochMs(Number.NaN)).toBeUndefined();
	});
});

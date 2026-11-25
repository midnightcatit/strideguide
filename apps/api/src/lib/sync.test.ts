import { describe, expect, it } from 'vitest';
import { MAX_BOUND_PARAMS, MANUAL_SYNC_WINDOW_MS, chunkRows, manualSyncNeeded } from './sync';

const NOW = new Date('2026-01-01T12:00:00.000Z');

function ago(ms: number): Date {
	return new Date(NOW.getTime() - ms);
}

describe('manual sync cache decision', () => {
	it('reuses the last result when a sync succeeded inside the window', () => {
		expect(manualSyncNeeded(ago(5 * 60 * 1000), 'connected', NOW)).toBe(false);
	});

	it('runs again once the window has passed', () => {
		expect(manualSyncNeeded(ago(21 * 60 * 1000), 'connected', NOW)).toBe(true);
	});

	it('treats the window edge as expired', () => {
		expect(manualSyncNeeded(ago(MANUAL_SYNC_WINDOW_MS), 'connected', NOW)).toBe(true);
	});

	it('runs when there is no prior sync', () => {
		expect(manualSyncNeeded(null, 'connected', NOW)).toBe(true);
	});

	it('runs again after a failed sync', () => {
		expect(manualSyncNeeded(ago(60 * 1000), 'error', NOW)).toBe(true);
	});
});

describe('chunkRows', () => {
	it('keeps every multi-row insert under the D1 bound-parameter cap', () => {
		// A metric row binds eight columns and a week of them is hundreds of rows,
		// which is what a single unchunked insert used to send and D1 rejected.
		const rows = Array.from({ length: 300 }, (_, i) => ({
			id: `id-${i}`,
			userId: 'u',
			provider: 'google-health',
			date: '2026-11-20',
			metric: `metric_${i}`,
			value: i,
			unit: null,
			raw: {},
		}));

		const chunks = chunkRows(rows);
		expect(chunks.length).toBeGreaterThan(1);
		for (const chunk of chunks) {
			expect(chunk.length * 8).toBeLessThanOrEqual(MAX_BOUND_PARAMS);
		}
		// Every row is carried exactly once, in order.
		expect(chunks.flat()).toEqual(rows);
	});

	it('returns no chunks for an empty list', () => {
		expect(chunkRows([])).toEqual([]);
	});
});

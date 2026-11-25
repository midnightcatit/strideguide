import { describe, expect, it } from 'vitest';
import {
	D1_MAX_BOUND_PARAMS,
	MANUAL_SYNC_WINDOW_MS,
	chunkRows,
	manualSyncNeeded,
	resolveSyncOutcome,
	syncFailureReason,
} from './sync';

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

describe('sync watermark on failure', () => {
	it('advances to now only when every data type succeeded', () => {
		const prev = new Date('2026-01-01T00:00:00.000Z');
		const now = new Date('2026-01-02T00:00:00.000Z');
		expect(resolveSyncOutcome(prev, now, [])).toEqual({ lastSyncedAt: now, lastSyncFailedTypes: null });
	});

	it('holds the watermark back and names the failed types when any type fails', () => {
		const prev = new Date('2026-01-01T00:00:00.000Z');
		const now = new Date('2026-01-02T00:00:00.000Z');
		// If the watermark moved past the failed type's window, that window would
		// never be re-read and its data would be lost for good.
		expect(resolveSyncOutcome(prev, now, ['sleep', 'heart-rate'])).toEqual({
			lastSyncedAt: prev,
			lastSyncFailedTypes: 'sleep,heart-rate',
		});
	});

	it('keeps a null watermark null when a first sync partly fails', () => {
		const now = new Date('2026-01-02T00:00:00.000Z');
		expect(resolveSyncOutcome(null, now, ['steps'])).toEqual({
			lastSyncedAt: null,
			lastSyncFailedTypes: 'steps',
		});
	});
});

describe('sync failure reason', () => {
	it('keeps only the first line, so D1 SQL and bound params are never stored', () => {
		const err = new Error('D1_ERROR: no such table\nSQL: SELECT * FROM connections WHERE id = ?\nparams: abc');
		const reason = syncFailureReason(err);
		expect(reason).toBe('google health sync failed: D1_ERROR: no such table');
		expect(reason).not.toContain('SELECT');
		expect(reason).not.toContain('params:');
	});

	it('falls back to a fixed reason for a blank message', () => {
		expect(syncFailureReason(new Error('   '))).toBe('google health sync failed');
	});
});

describe('chunkRows', () => {
	it('keeps every statement within the D1 bound-parameter cap', () => {
		const rows = Array.from({ length: 25 }, (_, i) => ({ i }));
		for (const columns of [8, 9, 16]) {
			for (const chunk of chunkRows(rows, columns)) {
				expect(chunk.length * columns).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
			}
		}
	});

	it('splits a wide batch and loses no row', () => {
		const rows = Array.from({ length: 25 }, (_, i) => ({ i }));
		const chunks = chunkRows(rows, 9);
		expect(chunks.length).toBeGreaterThan(1);
		expect(chunks.flat()).toEqual(rows);
	});

	it('returns nothing for no rows and keeps a small batch in one chunk', () => {
		expect(chunkRows([], 9)).toEqual([]);
		expect(chunkRows([{ a: 1 }, { a: 2 }], 4)).toEqual([[{ a: 1 }, { a: 2 }]]);
	});
});

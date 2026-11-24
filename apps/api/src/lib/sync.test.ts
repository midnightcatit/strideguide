import { describe, expect, it } from 'vitest';
import { MANUAL_SYNC_WINDOW_MS, manualSyncNeeded } from './sync';

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

import { describe, expect, it } from 'vitest';
import { MANUAL_SYNC_WINDOW_MS, isFresh, syncDue } from './healthCache';

const NOW = 1_700_000_000_000;

describe('client health cache freshness', () => {
	it('treats a time inside the window as fresh', () => {
		expect(isFresh(NOW - 5 * 60 * 1000, NOW)).toBe(true);
	});

	it('treats the window edge as stale, matching the server', () => {
		expect(isFresh(NOW - MANUAL_SYNC_WINDOW_MS, NOW)).toBe(false);
	});

	it('treats a missing time as stale', () => {
		expect(isFresh(null, NOW)).toBe(false);
	});
});

describe('client manual sync decision', () => {
	const ago = (ms: number) => new Date(NOW - ms).toISOString();

	it('skips a sync inside the window', () => {
		expect(syncDue(ago(5 * 60 * 1000), NOW)).toBe(false);
	});

	it('runs a sync past the window', () => {
		expect(syncDue(ago(21 * 60 * 1000), NOW)).toBe(true);
	});

	it('runs at the window edge', () => {
		expect(syncDue(ago(MANUAL_SYNC_WINDOW_MS), NOW)).toBe(true);
	});

	it('runs when there is no last sync', () => {
		expect(syncDue(null, NOW)).toBe(true);
	});

	it('runs when the stored time cannot be read', () => {
		expect(syncDue('not a date', NOW)).toBe(true);
	});
});

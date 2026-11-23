import { describe, expect, it } from 'vitest';
import {
	activityToRunStats,
	importLogsSupersededByManual,
	shouldAttachImportLog,
} from './ingest';

describe('activityToRunStats', () => {
	it('converts metres to kilometres and derives pace when the provider sent none', () => {
		const stats = activityToRunStats({ modality: 'running', startedAt: '2026-06-01', distanceM: 6000, durationSec: 1800 });
		expect(stats).toEqual({ distanceKm: 6, durationSec: 1800, avgPaceSecPerKm: 300 });
	});

	it('keeps the provider pace and heart rate when present', () => {
		const stats = activityToRunStats({
			modality: 'running',
			startedAt: '2026-06-01',
			distanceM: 6000,
			durationSec: 1800,
			avgPaceSecPerKm: 320,
			avgHr: 148,
		});
		expect(stats.avgPaceSecPerKm).toBe(320);
		expect(stats.avgHr).toBe(148);
	});

	it('records a strength import with no run stats', () => {
		const stats = activityToRunStats({ modality: 'strength', startedAt: '2026-06-01', durationSec: 2400 });
		expect(stats).toEqual({ durationSec: 2400 });
	});
});

describe('shouldAttachImportLog (double-count guard)', () => {
	it('attaches when the session has no log yet', () => {
		expect(shouldAttachImportLog([])).toBe(true);
	});

	it('does not attach when the runner already logged the session by hand', () => {
		expect(shouldAttachImportLog([{ sessionId: 's1', source: 'manual' }])).toBe(false);
	});

	it('does not attach over a device log either', () => {
		expect(shouldAttachImportLog([{ sessionId: 's1', source: 'device' }])).toBe(false);
	});
});

describe('importLogsSupersededByManual', () => {
	it('returns only the import logs, so a manual entry replaces them', () => {
		const ids = importLogsSupersededByManual([
			{ id: 'log-import', sessionId: 's1', source: 'import' },
			{ id: 'log-manual', sessionId: 's1', source: 'manual' },
		]);
		expect(ids).toEqual(['log-import']);
	});

	it('returns nothing when there is no import log', () => {
		expect(importLogsSupersededByManual([{ id: 'm', sessionId: 's1', source: 'manual' }])).toEqual([]);
	});
});

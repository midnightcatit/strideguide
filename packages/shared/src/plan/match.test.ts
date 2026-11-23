import { describe, expect, it } from 'vitest';
import { MATCH_CONFIG, matchActivity, modalityScore, type MatchSessionLike } from './match';

const sessions: MatchSessionLike[] = [
	{ id: 's-easy', date: '2026-06-01', modality: 'running', type: 'easy', targetDistanceKm: 6 },
	{ id: 's-strength', date: '2026-06-01', modality: 'strength', type: 'machine-circuit', durationMin: 40 },
	{ id: 's-tempo', date: '2026-06-03', modality: 'running', type: 'tempo', targetDistanceKm: 8 },
	{ id: 's-long', date: '2026-06-06', modality: 'running', type: 'long', targetDistanceKm: 16 },
];

describe('modalityScore', () => {
	it('is 1 for an exact match and 0 for unrelated modalities', () => {
		expect(modalityScore('running', 'running')).toBe(1);
		expect(modalityScore('running', 'strength')).toBe(0);
	});
	it('gives a partial score to a related modality', () => {
		expect(modalityScore('running', 'walking')).toBeGreaterThan(0);
		expect(modalityScore('running', 'walking')).toBeLessThan(1);
	});
});

describe('matchActivity', () => {
	it('reads a same-day, same-modality, on-distance run as a strong match', () => {
		const res = matchActivity(
			{ modality: 'running', startedAt: '2026-06-01T07:10:00Z', distanceM: 6100, durationSec: 2100 },
			sessions,
		);
		expect(res.best?.sessionId).toBe('s-easy');
		expect(res.best?.decision).toBe('auto');
		expect(res.best?.confidence).toBeGreaterThanOrEqual(MATCH_CONFIG.strongThreshold);
	});

	it('still finds the right session a day off, but only asks', () => {
		const res = matchActivity(
			{ modality: 'running', startedAt: '2026-06-02T07:10:00Z', distanceM: 6000, durationSec: 2000 },
			sessions,
		);
		expect(res.best?.sessionId).toBe('s-easy');
		expect(res.best?.decision).toBe('ask');
		expect(res.best?.dateDeltaDays).toBe(1);
	});

	it('never matches across unrelated modalities', () => {
		const res = matchActivity(
			{ modality: 'running', startedAt: '2026-06-01T07:10:00Z', distanceM: 6000, durationSec: 2000 },
			[{ id: 's-only-strength', date: '2026-06-01', modality: 'strength', durationMin: 40 }],
		);
		expect(res.best).toBeNull();
	});

	it('scores a distance well off the target below the auto threshold', () => {
		const res = matchActivity(
			{ modality: 'running', startedAt: '2026-06-01T07:10:00Z', distanceM: 18000, durationSec: 5400 },
			sessions,
		);
		expect(res.best?.sessionId).toBe('s-easy');
		expect(res.best?.confidence).toBeLessThan(MATCH_CONFIG.strongThreshold);
	});

	it('matches a timed strength session on duration', () => {
		const res = matchActivity(
			{ modality: 'strength', startedAt: '2026-06-01T18:00:00Z', durationSec: 2400 },
			sessions,
		);
		expect(res.best?.sessionId).toBe('s-strength');
		expect(res.best?.decision).toBe('auto');
	});

	it('ignores a session far outside the date window', () => {
		const res = matchActivity(
			{ modality: 'running', startedAt: '2026-05-25T07:10:00Z', distanceM: 6000, durationSec: 2000 },
			sessions,
		);
		expect(res.best).toBeNull();
	});

	it('drops an activity too short to be a session', () => {
		const res = matchActivity(
			{ modality: 'running', startedAt: '2026-06-01T07:10:00Z', distanceM: 100, durationSec: 30 },
			sessions,
		);
		expect(res.best).toBeNull();
	});

	it('renormalises when the session has no size to compare', () => {
		const res = matchActivity(
			{ modality: 'mobility', startedAt: '2026-06-01T07:10:00Z', durationSec: 900 },
			[{ id: 's-mob', date: '2026-06-01', modality: 'mobility', type: 'mobility' }],
		);
		expect(res.best?.sessionId).toBe('s-mob');
		expect(res.best?.decision).toBe('auto');
		expect(res.best?.breakdown.size).toBeUndefined();
	});

	it('ranks candidates strongest first', () => {
		const res = matchActivity(
			{ modality: 'running', startedAt: '2026-06-03T07:10:00Z', distanceM: 8000, durationSec: 2700 },
			sessions,
		);
		expect(res.candidates[0]?.sessionId).toBe('s-tempo');
		for (let i = 1; i < res.candidates.length; i++) {
			expect(res.candidates[i - 1]!.confidence).toBeGreaterThanOrEqual(res.candidates[i]!.confidence);
		}
	});
});

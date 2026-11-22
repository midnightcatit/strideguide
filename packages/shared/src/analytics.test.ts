import { describe, expect, it } from 'vitest';
import { computeProgress, type LogLike, type WeekLike } from './analytics';

const weeks: WeekLike[] = [
	{
		weekNumber: 1,
		sessions: [
			{ id: 's1', day: 0, modality: 'running', type: 'easy', prescription: { targetDistanceKm: 5, intensity: 'easy' } },
			{ id: 's2', day: 2, modality: 'running', type: 'tempo', prescription: { targetDistanceKm: 6, intensity: 'steady' } },
		],
	},
	{
		weekNumber: 2,
		sessions: [
			{ id: 's3', day: 0, modality: 'running', type: 'easy', prescription: { targetDistanceKm: 6, intensity: 'easy' } },
		],
	},
];

const logs: LogLike[] = [
	{ sessionId: 's1', runStats: { distanceKm: 5.2, avgPaceSecPerKm: 346 }, rpe: 4, createdAt: '2026-11-01T10:00:00Z' },
	{ sessionId: 's2', runStats: { distanceKm: 6, avgPaceSecPerKm: 317 }, rpe: 7, createdAt: '2026-11-03T10:00:00Z' },
];

describe('computeProgress', () => {
	const m = computeProgress(logs, weeks);

	it('computes adherence overall and for the most recent week', () => {
		expect(m.adherence.planned).toBe(3);
		expect(m.adherence.completed).toBe(2);
		expect(m.adherence.recentPlanned).toBe(1);
		expect(m.adherence.recentCompleted).toBe(0);
	});

	it('computes planned vs actual volume per week', () => {
		expect(m.volume.byWeek).toEqual([
			{ week: 1, plannedKm: 11, actualKm: 11.2 },
			{ week: 2, plannedKm: 6, actualKm: 0 },
		]);
		expect(m.volume.totalPlannedKm).toBe(17);
		expect(m.volume.totalActualKm).toBe(11.2);
	});

	it('counts completed sessions by intensity band', () => {
		expect(m.intensity).toEqual({ easy: 1, steady: 1, hard: 0, completed: 2 });
	});

	it('finds the fastest pace and personal bests', () => {
		expect(m.pace.fastest).toBe(317);
		expect(m.prs.fastestPaceSecPerKm).toBe(317);
		expect(m.prs.longestRunKm).toBe(6);
		expect(m.prs.biggestWeekKm).toBe(11.2);
	});

	it('averages logged RPE', () => {
		expect(m.rpe).toEqual({ avg: 5.5, count: 2 });
	});

	it('reports pace trend only with enough points', () => {
		expect(m.pace.points).toHaveLength(2);
		expect(m.pace.changeSecPerKm).toBeUndefined();
	});
});

describe('computeProgress: pace trend + volume change', () => {
	const wk: WeekLike[] = [
		{ weekNumber: 1, sessions: [{ id: 'a', day: 0, modality: 'running', type: 'easy', prescription: { targetDistanceKm: 5 } }] },
		{ weekNumber: 2, sessions: [{ id: 'b', day: 0, modality: 'running', type: 'easy', prescription: { targetDistanceKm: 5 } }] },
	];
	const lg: LogLike[] = [
		{ sessionId: 'a', runStats: { distanceKm: 5, avgPaceSecPerKm: 360 }, createdAt: '2026-11-01' },
		{ sessionId: 'a', runStats: { distanceKm: 5, avgPaceSecPerKm: 350 }, createdAt: '2026-11-02' },
		{ sessionId: 'b', runStats: { distanceKm: 5.5, avgPaceSecPerKm: 340 }, createdAt: '2026-11-08' },
		{ sessionId: 'b', runStats: { distanceKm: 5.5, avgPaceSecPerKm: 330 }, createdAt: '2026-11-09' },
	];

	it('flags improvement (negative change) with 4+ points', () => {
		const m = computeProgress(lg, wk);
		// first two avg 355, last two 335 -> positive means faster now
		expect(m.pace.changeSecPerKm).toBe(20);
	});

	it('computes relative week-over-week volume change', () => {
		const m = computeProgress(lg, wk);
		expect(m.volume.changePct).toBe(10); // 5 -> 5.5
	});
});

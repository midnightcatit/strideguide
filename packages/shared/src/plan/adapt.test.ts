import { describe, expect, it } from 'vitest';
import { suggestAdjustments, type AdaptLog, type AdaptWeek } from './adapt';

const weeks: AdaptWeek[] = [
	{
		weekNumber: 1,
		startDate: '2026-11-02',
		sessions: [
			{ id: 'a', day: 0, modality: 'running', type: 'easy', prescription: { targetDistanceKm: 5 } },
			{ id: 'b', day: 2, modality: 'running', type: 'tempo', prescription: { targetDistanceKm: 6 } },
		],
	},
	{
		weekNumber: 2,
		startDate: '2026-11-09',
		sessions: [
			{ id: 'c', day: 0, modality: 'running', type: 'easy', prescription: { targetDistanceKm: 5 } },
		],
	},
];

describe('suggestAdjustments', () => {
	it('flags 3+ missed sessions as a rebuild', () => {
		const out = suggestAdjustments([], weeks, '2026-11-20');
		expect(out.some((a) => a.kind === 'missed' && a.severity === 'warn')).toBe(true);
	});

	it('flags a large volume drop as a warning', () => {
		const logs: AdaptLog[] = [
			{ sessionId: 'a', runStats: { distanceKm: 2 }, rpe: 5, createdAt: '2026-11-02' },
		];
		const out = suggestAdjustments(logs, weeks, '2026-11-12');
		expect(out.some((a) => a.kind === 'volume-under')).toBe(true);
	});

	it('flags three hard sessions in a row', () => {
		const logs: AdaptLog[] = [
			{ sessionId: 'x', rpe: 8, createdAt: '2026-11-10' },
			{ sessionId: 'y', rpe: 9, createdAt: '2026-11-11' },
			{ sessionId: 'z', rpe: 8, createdAt: '2026-11-12' },
		];
		const out = suggestAdjustments(logs, weeks, '2026-11-13');
		expect(out.some((a) => a.kind === 'fatigue')).toBe(true);
	});

	it('flags a single run that jumps over 10%', () => {
		const logs: AdaptLog[] = [
			{ sessionId: 'a', runStats: { distanceKm: 10 }, createdAt: '2026-11-01' },
			{ sessionId: 'b', runStats: { distanceKm: 12 }, createdAt: '2026-11-08' },
		];
		const out = suggestAdjustments(logs, weeks, '2026-11-20');
		expect(out.some((a) => a.kind === 'run-spike')).toBe(true);
	});

	it('returns nothing when everything is on track', () => {
		const onTrack: AdaptWeek[] = [
			{
				weekNumber: 1,
				startDate: '2026-11-02',
				sessions: [
					{ id: 'a', day: 0, modality: 'running', type: 'easy', prescription: { targetDistanceKm: 5 } },
					{ id: 'b', day: 2, modality: 'running', type: 'tempo', prescription: { targetDistanceKm: 5 } },
				],
			},
		];
		const logs: AdaptLog[] = [
			{ sessionId: 'a', runStats: { distanceKm: 5 }, rpe: 5, createdAt: '2026-11-02' },
			{ sessionId: 'b', runStats: { distanceKm: 5 }, rpe: 6, createdAt: '2026-11-04' },
		];
		expect(suggestAdjustments(logs, onTrack, '2026-11-05')).toHaveLength(0);
	});
});

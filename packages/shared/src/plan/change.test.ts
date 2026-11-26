import { describe, expect, it } from 'vitest';
import type { AdaptLog, AdaptWeek } from './adapt';
import {
	buildWeekDecision,
	composeChangeReasons,
	decisionsToWeekShapes,
	deriveHistory,
	qualityCountFromOption,
	summarizePreviousWeeks,
	weekChangeNote,
	type PlanChangeContext,
	type PlanChangeDecisions,
	type RawDecision,
} from './change';

/** A planned session as the history read expects it. */
function session(id: string, day: number, type: string, km: number, modality = 'running') {
	return { id, day, modality, type, prescription: { targetDistanceKm: km } };
}

/** Three weeks of a simple plan: easy, quality and a long run each. */
function weeks(): AdaptWeek[] {
	return [
		{
			weekNumber: 1,
			startDate: '2026-02-02',
			endDate: '2026-02-08',
			sessions: [session('a', 0, 'easy', 5), session('b', 2, 'tempo', 6), session('c', 6, 'long', 10)],
		},
		{
			weekNumber: 2,
			startDate: '2026-02-09',
			endDate: '2026-02-15',
			sessions: [session('d', 0, 'easy', 5), session('e', 2, 'tempo', 6), session('f', 6, 'long', 10)],
		},
		{
			weekNumber: 3,
			startDate: '2026-02-16',
			endDate: '2026-02-22',
			sessions: [session('g', 0, 'easy', 5), session('h', 2, 'tempo', 6), session('i', 6, 'long', 10)],
		},
	];
}

const fitness = {
	recentWeeklyKm: 30,
	samples: 10,
	likedTypes: [] as string[],
	dislikedTypes: [] as string[],
};

function context(overrides: Partial<PlanChangeContext['history']> = {}): PlanChangeContext {
	return {
		intent: 'adapt',
		goal: { slug: 'marathon', name: 'Marathon' },
		previous: summarizePreviousWeeks(weeks()),
		history: {
			recentWeeklyKm: 30,
			samples: 10,
			likedTypes: [],
			dislikedTypes: [],
			missedSessions: 0,
			hardStreak: 0,
			...overrides,
		},
		affectedWeekNumbers: [1, 2],
	};
}

const ease: RawDecision = { value: 'ease', confidence: 0.82 };

describe('qualityCountFromOption', () => {
	it('maps each option to the count it stands for', () => {
		expect(qualityCountFromOption('none')).toBe(0);
		expect(qualityCountFromOption('one')).toBe(1);
		expect(qualityCountFromOption('two')).toBe(2);
		expect(qualityCountFromOption('three')).toBeUndefined();
	});
});

describe('buildWeekDecision', () => {
	it('maps raw answers to typed decisions with their confidence', () => {
		const decision = buildWeekDecision(4, {
			volume: ease,
			quality: { value: 'two', confidence: 0.7 },
			longRun: { value: 'hold', confidence: 0.6 },
		});
		expect(decision).toEqual({
			weekNumber: 4,
			volumeIntent: { value: 'ease', confidence: 0.82 },
			qualityDayCount: { value: 2, confidence: 0.7 },
			longRunDelta: { value: 'hold', confidence: 0.6 },
		});
	});

	it('drops an answer outside the closed set', () => {
		const decision = buildWeekDecision(4, {
			volume: { value: 'sideways', confidence: 0.9 },
			quality: { value: 'one', confidence: 0.5 },
		});
		expect(decision?.volumeIntent).toBeUndefined();
		expect(decision?.qualityDayCount?.value).toBe(1);
	});

	it('drops a confidence outside 0 to 1', () => {
		const decision = buildWeekDecision(4, { volume: { value: 'ease', confidence: 1.4 } });
		expect(decision).toBeNull();
	});

	it('returns null when nothing usable came back, so the week keeps the engine shape', () => {
		expect(buildWeekDecision(4, {})).toBeNull();
		expect(buildWeekDecision(4, { volume: null, quality: null, longRun: null })).toBeNull();
	});
});

describe('decisionsToWeekShapes', () => {
	it('maps typed decisions onto the engine week shape, keyed by week number', () => {
		const decisions: PlanChangeDecisions = {
			weeks: [
				{
					weekNumber: 5,
					volumeIntent: { value: 'ease', confidence: 0.8 },
					qualityDayCount: { value: 0, confidence: 0.7 },
					longRunDelta: { value: 'hold', confidence: 0.6 },
				},
			],
		};
		const shapes = decisionsToWeekShapes(decisions);
		expect(shapes.get(5)).toEqual({ volumeIntent: 'ease', qualityDayCount: 0, longRunDelta: 'hold' });
	});

	it('leaves out a week with no decision and an empty decision set entirely', () => {
		expect(decisionsToWeekShapes({ weeks: [] }).size).toBe(0);
		const partial = decisionsToWeekShapes({
			weeks: [{ weekNumber: 5, volumeIntent: { value: 'build', confidence: 0.9 } }],
		});
		expect(partial.get(5)).toEqual({ volumeIntent: 'build' });
	});
});

describe('composeChangeReasons', () => {
	it('grounds an eased volume in the missed sessions', () => {
		const decisions: PlanChangeDecisions = {
			weeks: [{ weekNumber: 1, volumeIntent: { value: 'ease', confidence: 0.8 } }],
		};
		const [reason] = composeChangeReasons(decisions, context({ missedSessions: 3 }));
		expect(reason?.volume).toContain('Three sessions went unlogged');
	});

	it('grounds an eased volume in a rising effort trend', () => {
		const decisions: PlanChangeDecisions = {
			weeks: [{ weekNumber: 1, volumeIntent: { value: 'ease', confidence: 0.8 } }],
		};
		const [reason] = composeChangeReasons(decisions, context({ rpeTrend: 'rising' }));
		expect(reason?.volume).toContain('Effort has been climbing');
	});

	it('says nothing when there is nothing true to say', () => {
		// A build with no adherence history, and a hold with no signal, both stay quiet.
		const decisions: PlanChangeDecisions = {
			weeks: [
				{ weekNumber: 1, volumeIntent: { value: 'build', confidence: 0.9 } },
				{ weekNumber: 2, volumeIntent: { value: 'hold', confidence: 0.5 } },
			],
		};
		const reasons = composeChangeReasons(decisions, context());
		expect(reasons[0]?.volume).toBeUndefined();
		expect(reasons[1]?.volume).toBeUndefined();
		expect(weekChangeNote(reasons[0]!)).toBeUndefined();
	});

	it('grounds a dropped quality day in the hard streak', () => {
		const decisions: PlanChangeDecisions = {
			weeks: [{ weekNumber: 1, qualityDayCount: { value: 0, confidence: 0.7 } }],
		};
		const [reason] = composeChangeReasons(decisions, context({ hardStreak: 3 }));
		expect(reason?.quality).toContain('Three hard sessions in a row');
	});

	it('does not repeat the volume note on the long run when it says the same thing', () => {
		const decisions: PlanChangeDecisions = {
			weeks: [
				{
					weekNumber: 1,
					volumeIntent: { value: 'ease', confidence: 0.8 },
					longRunDelta: { value: 'ease', confidence: 0.8 },
				},
			],
		};
		const [reason] = composeChangeReasons(decisions, context({ missedSessions: 1 }));
		expect(reason?.volume).toBeDefined();
		expect(reason?.longRun).toBeUndefined();
	});
});

describe('summarizePreviousWeeks', () => {
	it('reads the volume, long run and quality count back from the plan', () => {
		const [first] = summarizePreviousWeeks(weeks());
		expect(first).toEqual({ weekNumber: 1, phase: 'base', volumeKm: 21, longKm: 10, qualityCount: 1 });
	});
});

describe('deriveHistory', () => {
	it('counts the past sessions that were never logged, within the window', () => {
		const logs: AdaptLog[] = [
			{ sessionId: 'a', rpe: 5, createdAt: '2026-02-02' },
			{ sessionId: 'b', rpe: 8, createdAt: '2026-02-04' },
			{ sessionId: 'c', rpe: 9, createdAt: '2026-02-08' },
			{ sessionId: 'd', rpe: 8, runStats: { distanceKm: 5 }, createdAt: '2026-02-09' },
		];
		const history = deriveHistory(logs, weeks(), fitness, '2026-02-16');
		// e and f (week two) passed and were never logged.
		expect(history.missedSessions).toBe(2);
		// Week two planned 21 km, and only 5 km was logged.
		expect(history.lastWeekAdherence).toBeCloseTo(5 / 21, 2);
		// The last three logged sessions are all at RPE 8 or above.
		expect(history.hardStreak).toBe(3);
	});

	it('reads only the recent window, so older sessions are out of scope', () => {
		// With nothing logged, every past session inside the window counts. A
		// narrow window reaches only the last few days, so it counts fewer.
		const wide = deriveHistory([], weeks(), fitness, '2026-02-20', 28);
		const narrow = deriveHistory([], weeks(), fitness, '2026-02-20', 3);
		expect(narrow.missedSessions).toBeLessThan(wide.missedSessions);
		expect(narrow.missedSessions).toBeGreaterThan(0);
	});
});

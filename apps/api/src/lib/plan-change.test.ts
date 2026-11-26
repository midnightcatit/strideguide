import { afterEach, expect, it, vi } from 'vitest';

vi.mock('./jev', () => ({ decideChoice: vi.fn() }));

import { decideChoice } from './jev';
import { buildPlanChange } from './plan-change';
import type { PlanChangeContext } from '@strideguide/shared/plan';

/** The mock as a plain fn, so each test can set its own answers. */
const mocked = decideChoice as unknown as ReturnType<typeof vi.fn>;

const ctx: PlanChangeContext = {
	intent: 'adapt',
	goal: { slug: 'marathon', name: 'Marathon', weeksToRace: 8 },
	previous: [{ weekNumber: 3, phase: 'build', volumeKm: 40, longKm: 16, qualityCount: 2 }],
	history: {
		recentWeeklyKm: 30,
		samples: 10,
		missedSessions: 3,
		hardStreak: 3,
		likedTypes: [],
		dislikedTypes: [],
	},
	affectedWeekNumbers: [3],
};

afterEach(() => mocked.mockReset());

it('runs the three typed questions and returns decisions, shapes and reasons', async () => {
	mocked.mockImplementation(async (_env: unknown, _state: unknown, question: { id: string }) => {
		if (question.id.startsWith('volume_intent')) return { value: 'ease', confidence: 0.8 };
		if (question.id.startsWith('quality_count')) return { value: 'none', confidence: 0.7 };
		if (question.id.startsWith('long_run')) return { value: 'ease', confidence: 0.75 };
		return null;
	});

	const outcome = await buildPlanChange({ TYPESAFE_API_KEY: 'k' }, ctx);
	expect(outcome).not.toBeNull();
	expect(outcome!.decisions.weeks[0]).toMatchObject({
		weekNumber: 3,
		volumeIntent: { value: 'ease', confidence: 0.8 },
		qualityDayCount: { value: 0, confidence: 0.7 },
		longRunDelta: { value: 'ease', confidence: 0.75 },
	});
	expect(outcome!.shapes.get(3)).toEqual({
		volumeIntent: 'ease',
		qualityDayCount: 0,
		longRunDelta: 'ease',
	});
	expect(outcome!.reasons[0]?.volume).toContain('Three sessions went unlogged');
});

it('falls back to null when no answer is usable, so the deterministic adapt stands', async () => {
	mocked.mockResolvedValue(null);
	expect(await buildPlanChange({ TYPESAFE_API_KEY: 'k' }, ctx)).toBeNull();
});

it('keeps the parts of a week that answered and drops the ones that did not', async () => {
	mocked.mockImplementation(async (_env: unknown, _state: unknown, question: { id: string }) => {
		if (question.id.startsWith('volume_intent')) return { value: 'hold', confidence: 0.6 };
		return null;
	});

	const outcome = await buildPlanChange({ TYPESAFE_API_KEY: 'k' }, ctx);
	expect(outcome!.decisions.weeks[0]?.volumeIntent?.value).toBe('hold');
	expect(outcome!.decisions.weeks[0]?.qualityDayCount).toBeUndefined();
	expect(outcome!.shapes.get(3)).toEqual({ volumeIntent: 'hold' });
});

it('does nothing when there are no affected weeks', async () => {
	mocked.mockResolvedValue({ value: 'ease', confidence: 0.8 });
	expect(await buildPlanChange({ TYPESAFE_API_KEY: 'k' }, { ...ctx, affectedWeekNumbers: [] })).toBeNull();
	expect(mocked).not.toHaveBeenCalled();
});

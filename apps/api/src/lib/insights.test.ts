import { expect, it } from 'vitest';
import type { Prefs } from '@strideguide/shared/units';
import {
	buildDayInsight,
	dayFingerprint,
	gateInsight,
	type DayInsightInput,
} from './insights';

const metric: Prefs = { units: 'metric', weekStart: 0 };
const imperial: Prefs = { units: 'imperial', weekStart: 0 };

/** One logged run, so a test can change a single field and watch the outcome. */
function loggedRun(overrides: Partial<DayInsightInput['workouts'][number]> = {}) {
	return {
		title: 'Easy run',
		modality: 'running',
		type: 'easy',
		state: 'logged' as const,
		plannedDistanceKm: 8,
		plannedPaceSecPerKm: [330, 350] as [number, number],
		plannedDurationMin: 45,
		actualDistanceKm: 8.1,
		actualDurationSec: 2760,
		actualPaceSecPerKm: 341,
		rpe: 4,
		feedback: 'up' as const,
		notes: null,
		loggedAt: '2026-11-26T07:00:00Z',
		...overrides,
	};
}

function day(overrides: Partial<DayInsightInput> = {}): DayInsightInput {
	return {
		date: '2026-11-26',
		goalName: 'marathon',
		weekNumber: 8,
		phase: 'build',
		workouts: [loggedRun()],
		weekAhead: [],
		...overrides,
	};
}

it('moves the fingerprint when a logged workout changes', () => {
	const before = dayFingerprint(day());
	const after = dayFingerprint(day({ workouts: [loggedRun({ rpe: 7 })] }));
	expect(after).not.toBe(before);
});

it('leaves the fingerprint alone when the plan ahead changes', () => {
	const before = dayFingerprint(day());
	const after = dayFingerprint(
		day({ weekAhead: [{ date: '2026-11-29', title: 'Long run', plannedDistanceKm: 24 }] }),
	);
	expect(after).toBe(before);
});

it('leaves the fingerprint alone when the runner switches units', () => {
	const a = buildDayInsight(day(), metric);
	const b = buildDayInsight(day(), imperial);
	expect(b.fingerprint).toBe(a.fingerprint);
});

it('rejects a number the facts did not carry', () => {
	const { facts } = buildDayInsight(day(), metric);
	expect(gateInsight(facts, 'You ran 8.1 km, well ahead of the 42 km in the plan.')).toBeUndefined();
});

it('keeps a reply that only restates figures from the facts', () => {
	const { facts } = buildDayInsight(day(), metric);
	const kept = gateInsight(
		facts,
		'You ran 8.1 km at 5:41 /km and rated it RPE 4. Easy, and it matches the 8 km on the plan.',
	);
	expect(kept).toBeTruthy();
});

it("formats the facts in the runner's own units", () => {
	const metricFacts = buildDayInsight(day(), metric).facts;
	const imperialFacts = buildDayInsight(day(), imperial).facts;
	expect(metricFacts.workouts[0]?.actual).toContain('km');
	expect(imperialFacts.workouts[0]?.actual).toContain('mi');
});

import { expect, it } from 'vitest';
import { GOAL_PROFILES, generatePlan, type PlanInput } from '@strideguide/shared';
import { rebuildFromWeekOne, type WeekOneSession } from '@strideguide/shared/plan';
import { planParams, previewResponse, weekRowValues } from './plans';

it('keeps the phase on the week rows the plan route inserts', () => {
	// A plan week row carries its phase through the insert. Dropping it here left
	// GET /current returning a null phase and the web app guessing every week.
	const rows = [
		{
			id: 'w24',
			planId: 'p1',
			weekNumber: 24,
			phase: 'recovery',
			focus: 'Recovery',
			summaryText: 'Week 24: recovery.',
			startDate: '2026-11-16',
			endDate: '2026-11-22',
			targetVolumeKm: 32,
			sessionRows: [{ day: 0 }],
		},
	];
	const [values] = weekRowValues(rows);
	expect(values).toMatchObject({ weekNumber: 24, phase: 'recovery' });
	expect(values).not.toHaveProperty('sessionRows');
	expect(values).not.toHaveProperty('targetVolumeKm');
});

const marathon = GOAL_PROFILES.find((g) => g.slug === 'marathon')!;
const planInput: PlanInput = {
	profile: marathon,
	baseline: { experience: 'intermediate' },
	availableDays: [0, 2, 4],
	startDate: '2026-12-01',
	targetDate: '2027-05-01',
};

it('stores the engine warnings on the plan params where the engine leaves any', () => {
	// A race under four weeks away forces the four-week floor, and the engine says
	// so in meta.warnings. The stored params are what GET /current returns, so the
	// plan overview can only show a warning that survived this insert.
	const short = generatePlan({ ...planInput, targetDate: '2026-12-20' });
	expect(short.meta.warnings?.some((w) => w.includes('under four weeks'))).toBe(true);
	const params = planParams(short, { text: 'A short block.' });
	expect(params.warnings).toEqual(short.meta.warnings);
});

it('leaves the warnings key off the plan params when the engine has none', () => {
	const draft = generatePlan(planInput);
	expect(draft.meta.warnings ?? []).toEqual([]);
	const params = planParams(draft, { text: 'A review.' });
	expect(params).not.toHaveProperty('warnings');
});

it('carries the rebuild warning onto the preview response for an unrealistic week one', () => {
	// Three long runs in the edited week one is more than the plan can build from.
	// The rebuild falls back to the engine's own progression and says so; if the
	// preview response dropped that line, the runner would never learn that the
	// weeks ahead do not repeat their week one.
	const existing = generatePlan(planInput);
	const weekOne: WeekOneSession[] = [
		{ day: 0, slot: 'AM', modality: 'running', type: 'long', title: 'Long run' },
		{ day: 2, slot: 'AM', modality: 'running', type: 'long', title: 'Long run' },
		{ day: 4, slot: 'AM', modality: 'running', type: 'long', title: 'Long run' },
	];
	const { warnings } = rebuildFromWeekOne({
		existingWeeks: existing.weeks,
		weekOne,
		plan: planInput,
	});
	expect(warnings.length).toBeGreaterThan(0);
	const current = { goal: null, plan: null, weeks: [], logs: [] };
	const response = previewResponse(current, warnings);
	expect(response.warnings).toEqual(warnings);
	// The rest of the response is the plan exactly as GET /current returns it.
	expect(response).toMatchObject(current);
});

it('returns the preview response unchanged when the rebuild has nothing to say', () => {
	const existing = generatePlan(planInput);
	const weekOne: WeekOneSession[] = [
		{ day: 1, slot: 'AM', modality: 'running', type: 'easy', title: 'Easy run' },
		{ day: 3, slot: 'AM', modality: 'running', type: 'tempo', title: 'Tempo run' },
	];
	const { warnings } = rebuildFromWeekOne({
		existingWeeks: existing.weeks,
		weekOne,
		plan: planInput,
	});
	expect(warnings).toEqual([]);
	const current = { goal: null, plan: null, weeks: [], logs: [] };
	// No stray key: the response keeps the exact GET /current shape.
	expect(previewResponse(current, warnings)).toEqual(current);
});

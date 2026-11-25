import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { adaptPlan } from './adaptive';
import { generatePlan } from './engine';
import type { FitnessState } from './fitness';

const marathon = GOAL_PROFILES.find((g) => g.slug === 'marathon')!;
const ALLOWED = ['tempo', 'hills', 'interval', 'race-pace'] as const;

const baseInput = {
	profile: marathon,
	baseline: { experience: 'intermediate' as const },
	availableDays: [0, 2, 4, 6],
	startDate: '2026-12-01',
	targetDate: '2027-05-01',
};

const neutral: FitnessState = {
	recentWeeklyKm: 0,
	likedTypes: [],
	dislikedTypes: [],
	samples: 0,
};

// Generate the plan, then adapt it, returning both so tests compare like objects.
function run(fitness: Partial<FitnessState>, today: string) {
	const existing = generatePlan(baseInput);
	const result = adaptPlan({
		...baseInput,
		existingWeeks: existing.weeks,
		today,
		fitness: { ...neutral, ...fitness },
		allowedQuality: [...ALLOWED],
	});
	return { existing, result };
}

// The week-3 start date, so weeks 4 onward are the ones ahead.
const WEEK3 = generatePlan(baseInput).weeks[2]!.startDate;

describe('adaptPlan', () => {
	it('keeps past weeks and rebuilds only the ones ahead', () => {
		const { existing, result } = run({}, WEEK3);
		expect(result.weeks.length).toBe(existing.weeks.length);
		expect(result.changedFromWeek).toBe(4);
		// The first three weeks are untouched, object for object.
		expect(result.weeks[0]).toBe(existing.weeks[0]);
		expect(result.weeks[2]).toBe(existing.weeks[2]);
		expect(result.weeks[3]).not.toBe(existing.weeks[3]);
	});

	it('moves the upcoming weeks toward the runner real recent volume', () => {
		const { existing, result } = run({ recentWeeklyKm: 18, samples: 12 }, WEEK3);
		expect(result.weeks[3]!.targetVolumeKm).toBeLessThan(existing.weeks[3]!.targetVolumeKm);
	});

	it('swaps a quality kind the runner rated down for one they rated up', () => {
		const { result } = run({ dislikedTypes: ['tempo'], likedTypes: ['hills'], samples: 8 }, WEEK3);
		const week4 = result.weeks[3]!;
		const quality = week4.sessions.find(
			(s) => s.modality === 'running' && (ALLOWED as readonly string[]).includes(s.type),
		);
		expect(quality?.type).toBe('hills');
		expect(result.swapped).toContainEqual({ week: 4, from: 'tempo', to: 'hills' });
	});

	it('changes nothing once the plan has no weeks ahead', () => {
		const { existing, result } = run({ recentWeeklyKm: 40, samples: 12 }, '2030-01-01');
		expect(result.weeks).toBe(existing.weeks);
		expect(result.changedFromWeek).toBeUndefined();
	});

	it('carries the runner favorites into the rebuilt weeks', () => {
		// Existing plan has no favorites; the rebuild is given one and must keep it,
		// so a favorite does not drop the moment the plan adapts.
		const existing = generatePlan(baseInput);
		const result = adaptPlan({
			...baseInput,
			favoriteMachines: ['Bicep curl'],
			existingWeeks: existing.weeks,
			today: WEEK3,
			fitness: { ...neutral },
			allowedQuality: [...ALLOWED],
		});
		const moves = result.weeks
			.slice(3)
			.flatMap((w) => w.sessions)
			.filter((s) => s.modality === 'strength')
			.flatMap((s) => s.prescription.blocks ?? [])
			.map((b) => b.machine);
		expect(moves).toContain('Bicep curl');
	});

	it('carries over the easy recovery weeks a fresh plan appends', () => {
		const fresh = generatePlan(baseInput);
		const recoveryCount = fresh.weeks.filter((w) => w.phase === 'recovery').length;
		expect(recoveryCount).toBeGreaterThan(0);
		// A stored plan from before the engine appended the easy weeks after the
		// race: it stops at race day, so an adapt has to add them back.
		const stored = fresh.weeks.slice(0, fresh.weeks.length - recoveryCount);
		const result = adaptPlan({
			...baseInput,
			existingWeeks: stored,
			today: stored[2]!.startDate,
			fitness: { ...neutral },
			allowedQuality: [...ALLOWED],
		});
		// The adapted plan ends with the same weeks a fresh generate gives.
		expect(result.weeks.length).toBe(fresh.weeks.length);
		const carried = result.weeks.slice(stored.length);
		expect(carried.map((w) => w.phase)).toEqual(
			fresh.weeks.slice(stored.length).map((w) => w.phase),
		);
		expect(carried.every((w) => w.phase === 'recovery')).toBe(true);
		carried.forEach((w, i) => {
			const source = fresh.weeks[stored.length + i]!;
			expect(w.weekNumber).toBe(source.weekNumber);
			expect(w.startDate).toBe(source.startDate);
		});
	});
});

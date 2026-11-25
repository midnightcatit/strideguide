import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { generatePlan } from './engine';
import { rebuildFromWeekOne, weekOnePattern, type WeekOneSession } from './rebuild';
import type { PlanInput } from './types';

const marathon = GOAL_PROFILES.find((g) => g.slug === 'marathon')!;

const baseInput: PlanInput = {
	profile: marathon,
	baseline: { experience: 'intermediate' },
	availableDays: [0, 2, 4],
	startDate: '2026-12-01',
	targetDate: '2027-05-01',
};

// The engine's own first week, turned into the edited list the client would send.
function weekOneFromEngine(): WeekOneSession[] {
	return generatePlan(baseInput).weeks[0]!.sessions.map((s) => ({
		day: s.day,
		slot: s.slot,
		modality: s.modality,
		type: s.type,
		title: s.title,
		purpose: s.purpose,
		prescription: s.prescription,
		durationMin: s.durationMin,
	}));
}

describe('weekOnePattern', () => {
	it('reads the days, sessions and added workouts out of week one', () => {
		const weekOne: WeekOneSession[] = [
			{ day: 2, slot: 'AM', modality: 'running', type: 'tempo', title: 'Tempo run' },
			{ day: 0, slot: 'AM', modality: 'running', type: 'easy' },
			{ day: 1, slot: 'AM', modality: 'strength', type: 'machine-circuit' },
			{ day: 3, slot: 'PM', modality: 'recovery', type: 'cross-train', libraryId: 'bike-45' },
		];
		const pattern = weekOnePattern(weekOne);
		expect(pattern.availableDays).toEqual([0, 1, 2, 3]);
		expect(pattern.runningDays).toEqual([0, 2]);
		expect(pattern.strengthDays).toEqual([1]);
		// In day then slot order, one line per session.
		expect(pattern.days.map((d) => d.type)).toEqual([
			'easy',
			'machine-circuit',
			'tempo',
			'cross-train',
		]);
		expect(pattern.qualityKinds).toEqual(['tempo']);
		expect(pattern.recurring).toEqual([
			{
				day: 3,
				slot: 'PM',
				modality: 'recovery',
				type: 'cross-train',
				title: undefined,
				libraryId: 'bike-45',
			},
		]);
	});

	it('treats a workout flagged as added as recurring, even without a library id', () => {
		const pattern = weekOnePattern([
			{ day: 4, slot: 'PM', modality: 'mobility', type: 'mobility', prescription: { added: true } },
		]);
		expect(pattern.recurring).toHaveLength(1);
		expect(pattern.recurring[0]!.day).toBe(4);
		expect(pattern.recurring[0]!.type).toBe('mobility');
	});
});

describe('rebuildFromWeekOne', () => {
	it('leaves week one untouched and rebuilds the weeks after it', () => {
		const existing = generatePlan(baseInput);
		const weekOne = weekOneFromEngine();
		const result = rebuildFromWeekOne({
			existingWeeks: existing.weeks,
			weekOne,
			plan: baseInput,
		});
		expect(result.weeks.length).toBe(existing.weeks.length);
		// Week one is the runner's own edit: returned object for object.
		expect(result.weeks[0]).toBe(existing.weeks[0]);
		// Every later week is fresh.
		expect(result.weeks[1]).not.toBe(existing.weeks[1]);
	});

	it('stays deterministic when no AI shaping is given', () => {
		const existing = generatePlan(baseInput);
		const result = rebuildFromWeekOne({
			existingWeeks: existing.weeks,
			weekOne: weekOneFromEngine(),
			plan: baseInput,
		});
		// Weeks two onward still carry a full set of sessions.
		for (const w of result.weeks.slice(1)) {
			expect(w.sessions.length).toBeGreaterThan(0);
		}
	});

	it('lays the rebuilt weeks out on the week one days and repeats added workouts', () => {
		const existing = generatePlan(baseInput);
		const weekOne: WeekOneSession[] = [
			{ day: 0, slot: 'AM', modality: 'running', type: 'easy', title: 'Easy run' },
			{ day: 2, slot: 'AM', modality: 'running', type: 'tempo', title: 'Tempo run' },
			{ day: 3, slot: 'AM', modality: 'strength', type: 'machine-circuit', title: 'Strength' },
			{
				day: 3,
				slot: 'PM',
				modality: 'recovery',
				type: 'cross-train',
				title: 'Row',
				libraryId: 'row-30',
			},
		];
		const result = rebuildFromWeekOne({
			existingWeeks: existing.weeks,
			weekOne,
			plan: baseInput,
		});
		expect(result.pattern.availableDays).toEqual([0, 2, 3]);
		for (const w of result.weeks.slice(1)) {
			// Only the week one days carry a session; day 4 (the old plan) is gone.
			for (const s of w.sessions) {
				// The race stays on its fixed calendar date, off the week one days.
				if (s.type === 'race') continue;
				expect([0, 2, 3]).toContain(s.day);
			}
			// The added cross-train repeats on its own day.
			expect(w.sessions.some((s) => s.type === 'cross-train' && s.day === 3)).toBe(true);
		}
	});

	it('carries over the easy recovery weeks a fresh plan appends', () => {
		const fresh = generatePlan(baseInput);
		const recoveryCount = fresh.weeks.filter((w) => w.phase === 'recovery').length;
		expect(recoveryCount).toBeGreaterThan(0);
		// A stored plan from before the engine appended the easy weeks after the
		// race: it stops at race day, so the rebuild has to add them back.
		const stored = fresh.weeks.slice(0, fresh.weeks.length - recoveryCount);
		const result = rebuildFromWeekOne({
			existingWeeks: stored,
			weekOne: weekOneFromEngine(),
			plan: baseInput,
		});
		// The rebuild ends with the same weeks a fresh generate gives.
		expect(result.weeks.length).toBe(fresh.weeks.length);
		const carried = result.weeks.slice(stored.length);
		expect(carried.map((w) => w.phase)).toEqual(
			fresh.weeks.slice(stored.length).map((w) => w.phase),
		);
		// Each carried week keeps its own number, dates and sessions.
		carried.forEach((w, i) => {
			const source = fresh.weeks[stored.length + i]!;
			expect(w.weekNumber).toBe(source.weekNumber);
			expect(w.startDate).toBe(source.startDate);
			expect(w.endDate).toBe(source.endDate);
			expect(w.sessions.length).toBeGreaterThan(0);
		});
	});
});

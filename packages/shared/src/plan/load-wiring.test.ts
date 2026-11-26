import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { adaptPlan } from './adaptive';
import { generatePlan } from './engine';
import type { FitnessState } from './fitness';
import { LOAD_DEFAULTS, loadWeekShapes, readLoad, type LoadRead } from './load';
import type { QualityKind } from './types';

/**
 * The invariant that matters most: the load model may ease or hold, and it must
 * never raise a week above the plan the engine produced. These tests run the
 * real engine across the goal and experience matrix and assert that, whatever
 * the model asks for, the applied volumes never exceed the engine's own curve.
 */

const ALLOWED: QualityKind[] = ['tempo', 'hills', 'interval', 'race-pace'];

const neutral: FitnessState = {
	recentWeeklyKm: 0,
	likedTypes: [],
	dislikedTypes: [],
	samples: 0,
};

/** A read that asks to ease every future week, the strongest easing it can ask. */
function easeEveryFutureWeek(weekNumbers: number[]): LoadRead {
	return {
		available: true,
		mode: 'apply',
		fitness: 0,
		fatigue: 0,
		form: 0,
		readiness: { score: 1, factors: [] },
		points: [],
		weekIntents: weekNumbers.map((weekNumber) => ({
			weekNumber,
			intent: 'ease' as const,
			reason: 'forced ease for the test',
			note: 'forced ease for the test',
			form: -100,
			targetFitness: 0,
		})),
		shadow: [],
	};
}

const PROFILES = GOAL_PROFILES;
const EXPERIENCES = ['beginner', 'intermediate', 'advanced'] as const;

describe('load model never builds (the invariant)', () => {
	for (const profile of PROFILES) {
		for (const experience of EXPERIENCES) {
			it(`never raises a week for ${profile.slug} / ${experience}`, () => {
				const baseInput = {
					profile,
					baseline: { experience },
					availableDays: [0, 2, 4, 6],
					startDate: '2026-12-01',
					targetDate: '2027-05-01',
				};
				const existing = generatePlan(baseInput);
				const today = existing.weeks[3]!.startDate;
				const futureWeeks = existing.weeks.filter((w) => w.startDate > today);
				const read = easeEveryFutureWeek(futureWeeks.map((w) => w.weekNumber));

				const result = adaptPlan({
					...baseInput,
					existingWeeks: existing.weeks,
					today,
					fitness: { ...neutral },
					allowedQuality: [...ALLOWED],
					load: read,
				});

				// Every week the model touched is at or below the engine's own curve.
				result.weeks.forEach((w, i) => {
					const base = existing.weeks[i]!;
					expect(w.targetVolumeKm).toBeLessThanOrEqual(base.targetVolumeKm + 1e-9);
				});
				// A taper or recovery week is left exactly alone, as the engine intends.
				result.weeks.forEach((w, i) => {
					const base = existing.weeks[i]!;
					if (base.phase === 'taper' || base.phase === 'recovery') {
						expect(w.targetVolumeKm).toBeCloseTo(base.targetVolumeKm, 6);
					}
				});
				// The model asked to ease every future week; the engine may realise it
				// in the sessions or, where a long-run arc pins the week, leave the
				// summary the same. Either way it never rises.
				expect(loadWeekShapes(read).size).toBe(futureWeeks.length);
			});
		}
	}

	it('strictly eases a week whose sessions track the volume (marathon, mid-plan)', () => {
		const profile = PROFILES.find((p) => p.slug === 'marathon')!;
		const baseInput = {
			profile,
			baseline: { experience: 'intermediate' as const, weeklyKm: 50 },
			availableDays: [0, 2, 4, 6],
			startDate: '2026-12-01',
			targetDate: '2027-05-01',
		};
		const existing = generatePlan(baseInput);
		const today = existing.weeks[3]!.startDate;
		const futureWeeks = existing.weeks.filter((w) => w.startDate > today && w.phase !== 'taper' && w.phase !== 'recovery');
		const read = easeEveryFutureWeek(futureWeeks.map((w) => w.weekNumber));
		const result = adaptPlan({
			...baseInput,
			existingWeeks: existing.weeks,
			today,
			fitness: { ...neutral },
			allowedQuality: [...ALLOWED],
			load: read,
		});
		const firstEligible = futureWeeks[0]!;
		const next = result.weeks.find((r) => r.weekNumber === firstEligible.weekNumber)!;
		expect(next.targetVolumeKm).toBeLessThan(firstEligible.targetVolumeKm);
	});

	it('a stricter load intent beats an AI build intent, never the other way', () => {
		const profile = PROFILES.find((p) => p.slug === 'marathon')!;
		const baseInput = {
			profile,
			baseline: { experience: 'intermediate' as const },
			availableDays: [0, 2, 4, 6],
			startDate: '2026-12-01',
			targetDate: '2027-05-01',
		};
		const existing = generatePlan(baseInput);
		const today = existing.weeks[3]!.startDate;
		const futureWeeks = existing.weeks.filter((w) => w.startDate > today);
		const read = easeEveryFutureWeek(futureWeeks.map((w) => w.weekNumber));
		// The AI asks to build every future week; the model asks to ease. The lower
		// intent must win, so no week may rise above the engine's curve.
		const weekShapes = existing.weeks.map((w) =>
			w.startDate > today ? { volumeIntent: 'build' as const } : undefined,
		);
		const result = adaptPlan({
			...baseInput,
			existingWeeks: existing.weeks,
			today,
			fitness: { ...neutral },
			allowedQuality: [...ALLOWED],
			load: read,
			weekShapes,
		});
		result.weeks.forEach((w, i) => {
			expect(w.targetVolumeKm).toBeLessThanOrEqual(existing.weeks[i]!.targetVolumeKm + 1e-9);
		});
	});

	it('applies nothing in shadow or advisory mode', () => {
		const profile = PROFILES.find((p) => p.slug === '10k')!;
		const baseInput = {
			profile,
			baseline: { experience: 'intermediate' as const },
			availableDays: [0, 2, 4, 6],
			startDate: '2026-12-01',
			targetDate: '2027-05-01',
		};
		const existing = generatePlan(baseInput);
		const today = existing.weeks[3]!.startDate;
		const futureWeeks = existing.weeks.filter((w) => w.startDate > today);
		for (const mode of ['shadow', 'advisory'] as const) {
			const read = { ...easeEveryFutureWeek(futureWeeks.map((w) => w.weekNumber)), mode };
			expect(loadWeekShapes(read).size).toBe(0);
			const result = adaptPlan({
				...baseInput,
				existingWeeks: existing.weeks,
				today,
				fitness: { ...neutral },
				allowedQuality: [...ALLOWED],
				load: read,
			});
			// The plan is exactly the engine's own curve: nothing was eased.
			result.weeks.forEach((w, i) => {
				expect(w.targetVolumeKm).toBeCloseTo(existing.weeks[i]!.targetVolumeKm, 6);
			});
		}
	});

	it('is a no-op with no load read at all', () => {
		const profile = PROFILES.find((p) => p.slug === 'half-marathon')!;
		const baseInput = {
			profile,
			baseline: { experience: 'beginner' as const },
			availableDays: [0, 2, 4, 6],
			startDate: '2026-12-01',
			targetDate: '2027-05-01',
		};
		const existing = generatePlan(baseInput);
		const today = existing.weeks[3]!.startDate;
		const result = adaptPlan({
			...baseInput,
			existingWeeks: existing.weeks,
			today,
			fitness: { ...neutral },
			allowedQuality: [...ALLOWED],
		});
		result.weeks.forEach((w, i) => {
			expect(w.targetVolumeKm).toBeCloseTo(existing.weeks[i]!.targetVolumeKm, 6);
		});
	});

	it('a readiness-driven ease lowers the nearest week and never raises', () => {
		const profile = PROFILES.find((p) => p.slug === '10k')!;
		const baseInput = {
			profile,
			baseline: { experience: 'intermediate' as const },
			availableDays: [0, 2, 4, 6],
			startDate: '2026-12-01',
			targetDate: '2027-05-01',
		};
		const existing = generatePlan(baseInput);
		const today = existing.weeks[3]!.startDate;
		const day = (n: number) =>
			new Date(Date.parse(`${today}T00:00:00Z`) - n * 86400000).toISOString();
		const logged = Array.from({ length: 8 }, (_, i) => ({
			date: day((i % 4) + 1),
			modality: 'running',
			distanceKm: 8,
			durationSec: 8 * 330,
		}));
		// A strained recovery read, with the form floor disabled, so the only thing
		// that can move a week is readiness. It must ease and only ease.
		const read = readLoad({
			weeks: existing.weeks,
			today,
			logged,
			thresholdPaceSecPerKm: 300,
			experience: 'intermediate',
			recovery: {
				days: 7,
				restingHrElevated: true,
				hrvSuppressed: true,
				shortSleep: true,
				lowSpo2: false,
				respiratoryRateElevated: false,
				sleepTempElevated: false,
				strained: true,
			},
			config: { ...LOAD_DEFAULTS, mode: 'apply', formFloor: -1000 },
		});
		expect(read.weekIntents[0]?.intent).toBe('ease');
		for (const w of read.weekIntents) expect(['ease', 'hold']).toContain(w.intent);

		const result = adaptPlan({
			...baseInput,
			existingWeeks: existing.weeks,
			today,
			fitness: { ...neutral },
			allowedQuality: [...ALLOWED],
			load: read,
		});
		result.weeks.forEach((w, i) => {
			expect(w.targetVolumeKm).toBeLessThanOrEqual(existing.weeks[i]!.targetVolumeKm + 1e-9);
		});
	});
});

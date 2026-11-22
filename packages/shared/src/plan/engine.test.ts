import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { generatePlan } from './engine';

const marathon = GOAL_PROFILES.find((p) => p.slug === 'marathon')!;
const wholeFitness = GOAL_PROFILES.find((p) => p.slug === 'whole-fitness')!;

const plan = generatePlan({
	profile: marathon,
	baseline: { recentTimes: { '5k': '22:00' }, experience: 'intermediate' },
	availableDays: [0, 2, 4, 6],
	startDate: '2026-12-01',
	targetDate: '2027-05-01',
});

describe('generatePlan (marathon)', () => {
	it('produces the expected number of weeks', () => {
		expect(plan.weeks.length).toBe(plan.meta.totalWeeks);
		expect(plan.meta.totalWeeks).toBeGreaterThanOrEqual(4);
	});

	it('starts in base and ends in taper', () => {
		expect(plan.weeks[0]!.phase).toBe('base');
		expect(plan.weeks[plan.weeks.length - 1]!.phase).toBe('taper');
	});

	it('places every session on an available day', () => {
		for (const w of plan.weeks) {
			for (const s of w.sessions) expect([0, 2, 4, 6]).toContain(s.day);
		}
	});

	it('includes long, quality, easy, and strength sessions', () => {
		const types = new Set(plan.weeks.flatMap((w) => w.sessions).map((s) => s.type));
		expect(types.has('long')).toBe(true);
		expect([...types].some((t) => t === 'tempo' || t === 'interval')).toBe(true);
		expect(types.has('easy')).toBe(true);
		expect(plan.weeks.flatMap((w) => w.sessions).some((s) => s.modality === 'strength')).toBe(true);
	});

	it('tapers volume down from the peak', () => {
		const vols = plan.weeks.map((w) => w.targetVolumeKm);
		expect(vols[vols.length - 1]!).toBeLessThan(Math.max(...vols));
	});

	it('assigns a VDOT when a baseline race time is given', () => {
		expect(plan.meta.vdot).toBeGreaterThan(30);
		expect(plan.meta.vdot).toBeLessThan(70);
	});
});

describe('generatePlan (whole-fitness, no race)', () => {
	const p = generatePlan({
		profile: wholeFitness,
		baseline: { experience: 'beginner' },
		availableDays: [1, 3, 5],
		startDate: '2026-12-01',
	});

	it('uses the profile default length and works without a race date', () => {
		expect(p.weeks.length).toBe(wholeFitness.defaultWeeks);
		expect(p.meta.vdot).toBeUndefined();
	});

	it('includes strength work', () => {
		expect(p.weeks.flatMap((w) => w.sessions).some((s) => s.modality === 'strength')).toBe(true);
	});
});

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

	it('handles a plan shorter than the sum of phase weeks', () => {
		const short = generatePlan({
			profile: GOAL_PROFILES.find((p) => p.slug === 'marathon')!,
			baseline: { experience: 'intermediate' },
			availableDays: [0, 2, 4],
			startDate: '2026-12-01',
			targetDate: '2027-01-12', // ~6 weeks, far shorter than the profile default
		});
		expect(short.weeks.length).toBe(short.meta.totalWeeks);
		for (const w of short.weeks) {
			expect(w.phase).toBeTruthy();
			expect(w.sessions.length).toBeGreaterThan(0);
		}
		expect(short.weeks[short.weeks.length - 1]!.phase).toBe('taper');
	});

	it('builds structured workouts (warm-up, set, cool-down)', () => {
		const interval = plan.weeks
			.flatMap((w) => w.sessions)
			.find((s) => s.type === 'interval');
		expect(interval).toBeTruthy();
		const w = interval!.prescription.workout;
		expect(w).toBeTruthy();
		const kinds = w!.blocks.flatMap((b) => b.steps.map((s) => s.kind));
		expect(kinds).toContain('warmup');
		expect(kinds).toContain('work');
		expect(kinds).toContain('recovery');
		expect(kinds).toContain('cooldown');
		const rep = w!.blocks.find((b) => b.repeat > 1);
		expect(rep?.repeat).toBeGreaterThan(1);
	});

	it('gives every session a workout with at least one step', () => {
		for (const s of plan.weeks.flatMap((w) => w.sessions)) {
			const blocks = s.prescription.workout?.blocks ?? [];
			expect(blocks.length).toBeGreaterThan(0);
			expect(blocks.flatMap((b) => b.steps).length).toBeGreaterThan(0);
		}
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

describe('handle intensity + race-pace', () => {
	const half = generatePlan({
		profile: GOAL_PROFILES.find((p) => p.slug === 'half-marathon')!,
		baseline: { recentTimes: { '10k': '45:00' }, experience: 'intermediate' },
		availableDays: [0, 2, 4, 6],
		startDate: '2026-12-01',
		targetDate: '2027-03-01',
	});

	it('labels every session easy / steady / hard', () => {
		for (const s of half.weeks.flatMap((w) => w.sessions)) {
			expect(['easy', 'steady', 'hard']).toContain(s.prescription.intensity);
		}
	});

	it('maps archetypes to the expected band', () => {
		const flat = half.weeks.flatMap((w) => w.sessions);
		const easy = flat.find((s) => s.type === 'easy');
		const interval = flat.find((s) => s.type === 'interval');
		expect(easy?.prescription.intensity).toBe('easy');
		expect(interval?.prescription.intensity).toBe('hard');
	});

	it('schedules goal-pace work in the build/peak phases', () => {
		const racePace = half.weeks.flatMap((w) => w.sessions).filter((s) => s.type === 'race-pace');
		expect(racePace.length).toBeGreaterThan(0);
		// goal pace band is a plausible half-marathon pace (faster than easy, slower than interval)
		const band = racePace[0]!.prescription.targetPaceSecPerKm!;
		expect(band[0]).toBeGreaterThan(200);
		expect(band[1]).toBeLessThan(420);
	});
});

describe('generatePlan (preferences)', () => {
	const base = {
		profile: marathon,
		availableDays: [0, 2, 4, 6],
		startDate: '2026-12-01',
		targetDate: '2027-05-01',
	};

	it('uses bodyweight moves for a bodyweight circuit', () => {
		const p = generatePlan({ ...base, baseline: { experience: 'intermediate', equipment: 'bodyweight' } });
		const strength = p.weeks.flatMap((w) => w.sessions).find((s) => s.modality === 'strength')!;
		expect(strength.type).toBe('full-body-strength');
		const names = strength.prescription.blocks!.map((b) => b.machine);
		expect(names).toContain('Bodyweight squat');
		expect(names).not.toContain('Leg press');
	});

	it('uses machine moves for a machines circuit', () => {
		const p = generatePlan({ ...base, baseline: { experience: 'intermediate', equipment: 'machines' } });
		const strength = p.weeks.flatMap((w) => w.sessions).find((s) => s.modality === 'strength')!;
		expect(strength.type).toBe('machine-circuit');
		expect(strength.prescription.blocks!.some((b) => b.machine === 'Leg press')).toBe(true);
	});

	it('sizes the circuit by session length', () => {
		const short = generatePlan({ ...base, baseline: { experience: 'intermediate', sessionMinutes: 30 } });
		const long = generatePlan({ ...base, baseline: { experience: 'intermediate', sessionMinutes: 60 } });
		const shortN = short.weeks[0]!.sessions.find((s) => s.modality === 'strength')!.prescription.blocks!.length;
		const longN = long.weeks[0]!.sessions.find((s) => s.modality === 'strength')!.prescription.blocks!.length;
		expect(longN).toBeGreaterThan(shortN);
	});

	it('honors a requested strength session count', () => {
		const p = generatePlan({ ...base, baseline: { experience: 'intermediate', strengthDays: 1 } });
		expect(p.weeks[0]!.sessions.filter((s) => s.modality === 'strength').length).toBe(1);
	});

	it('prefers hill reps on hilly terrain', () => {
		const p = generatePlan({ ...base, baseline: { experience: 'intermediate', terrain: 'hilly' } });
		expect(p.weeks.flatMap((w) => w.sessions).some((s) => s.type === 'hills')).toBe(true);
	});

	it('swaps an easy run for cross-training when the profile and user allow it', () => {
		const p = generatePlan({
			profile: wholeFitness,
			availableDays: [1, 3, 5],
			startDate: '2026-12-01',
			baseline: { experience: 'beginner', crossTraining: ['bike'] },
		});
		expect(p.weeks.flatMap((w) => w.sessions).some((s) => s.type === 'cross-train')).toBe(true);
	});

	it('adds a mobility session on a rest day when stretching is wanted there', () => {
		const p = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', stretching: 'rest-days', flexibility: { current: 3, goal: 4 } },
		});
		const mobility = p.weeks[0]!.sessions.filter((s) => s.type === 'mobility');
		expect(mobility.length).toBe(1);
		expect([0, 2, 4]).not.toContain(mobility[0]!.day);
	});

	it('adds no mobility session when stretching is off', () => {
		const p = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', stretching: 'none' },
		});
		expect(p.weeks.flatMap((w) => w.sessions).some((s) => s.type === 'mobility')).toBe(false);
	});

	it('gives a longer mobility routine when the flexibility goal is higher', () => {
		const growing = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', stretching: 'rest-days', flexibility: { current: 2, goal: 5 } },
		});
		const holding = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', stretching: 'rest-days', flexibility: { current: 4, goal: 4 } },
		});
		const count = (p: typeof growing) =>
			p.weeks[0]!.sessions
				.find((s) => s.type === 'mobility')!
				.prescription.workout!.blocks.flatMap((b) => b.steps).length;
		expect(count(growing)).toBeGreaterThan(count(holding));
	});
});

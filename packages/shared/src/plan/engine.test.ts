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

	it('puts the sport on its day and keeps the running off that day', () => {
		const p = generatePlan({
			...base,
			availableDays: [0, 2, 4, 6],
			baseline: {
				experience: 'intermediate',
				crossTrainingSchedule: [{ activity: 'soccer', days: [6] }],
			},
		});
		const w1 = p.weeks[0]!.sessions;
		const sport = w1.find((s) => s.type === 'cross-train');
		expect(sport?.day).toBe(6);
		expect(sport?.title).toBe('Soccer');
		expect(w1.some((s) => s.day === 6 && s.modality === 'running')).toBe(false);
	});

	it('keeps the long run sane on a short week', () => {
		const p = generatePlan({
			profile: wholeFitness,
			availableDays: [0, 2, 4, 6],
			startDate: '2026-12-01',
			baseline: { experience: 'beginner', weeklyKm: 19.3 },
		});
		const long = p.weeks[0]!.sessions.find((s) => s.type === 'long')!;
		// The long run stays near a third of the week, not most of it.
		expect(long.prescription.targetDistanceKm!).toBeLessThan(9);
	});

	it('never puts a run and strength on the same day', () => {
		const p = generatePlan({
			...base,
			availableDays: [0, 2, 4, 6],
			baseline: { experience: 'intermediate', strengthDays: 2 },
		});
		for (const w of p.weeks) {
			const byDay = new Map<number, string[]>();
			for (const s of w.sessions) byDay.set(s.day, [...(byDay.get(s.day) ?? []), s.modality]);
			for (const mods of byDay.values()) {
				expect(mods.includes('running') && mods.includes('strength')).toBe(false);
			}
		}
	});

	it('eases in with no hard session in the first week', () => {
		const p = generatePlan({ ...base, baseline: { experience: 'beginner' } });
		const hard = p.weeks[0]!.sessions.filter((s) =>
			['tempo', 'interval', 'hills', 'race-pace', 'threshold'].includes(s.type),
		);
		expect(hard.length).toBe(0);
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

	it('pairs the mobility session with a day that already has a session', () => {
		const p = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', flexibility: { current: 3, goal: 4 } },
		});
		const w1 = p.weeks[0]!;
		const mobility = w1.sessions.filter((s) => s.type === 'mobility');
		expect(mobility.length).toBe(1);
		const day = mobility[0]!.day;
		expect(w1.sessions.some((s) => s.day === day && s.type !== 'mobility')).toBe(true);
	});

	it('adds no mobility session when stretching is off', () => {
		const p = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', flexibility: { current: 3, goal: 3 } },
		});
		expect(p.weeks.flatMap((w) => w.sessions).some((s) => s.type === 'mobility')).toBe(false);
	});

	it('gives a longer mobility routine when the flexibility goal is higher', () => {
		const growing = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', flexibility: { current: 2, goal: 5 } },
		});
		const holding = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', flexibility: { current: 3, goal: 4 } },
		});
		const count = (p: typeof growing) =>
			p.weeks[0]!.sessions
				.find((s) => s.type === 'mobility')!
				.prescription.workout!.blocks.flatMap((b) => b.steps).length;
		expect(count(growing)).toBeGreaterThan(count(holding));
	});
});

describe('generatePlan (model shaping)', () => {
	const base = {
		profile: marathon,
		availableDays: [0, 2, 4, 6],
		startDate: '2026-12-01',
		targetDate: '2027-05-01',
		baseline: { experience: 'intermediate' as const },
	};

	it('applies a model-chosen quality kind when the profile allows it', () => {
		// The first week eases in with no hard session, so shape week two.
		const p = generatePlan({ ...base, weekShapes: [undefined, { qualityKind: 'hills' }] });
		expect(p.weeks[1]!.sessions.some((s) => s.type === 'hills')).toBe(true);
	});

	it('ignores a quality kind the profile does not allow', () => {
		const p = generatePlan({
			profile: wholeFitness,
			availableDays: [1, 3, 5],
			startDate: '2026-12-01',
			baseline: { experience: 'beginner' },
			weekShapes: [{ qualityKind: 'interval' }],
		});
		expect(p.weeks.flatMap((w) => w.sessions).some((s) => s.type === 'interval')).toBe(false);
	});

	it('keeps the engine plan when a week has no shape', () => {
		const withShape = generatePlan({ ...base, weekShapes: [undefined, { qualityKind: 'tempo' }] });
		const without = generatePlan(base);
		expect(withShape.weeks.length).toBe(without.weeks.length);
	});
});

describe('progression (volume builds, sessions differentiate)', () => {
	const levels = ['beginner', 'intermediate', 'advanced'] as const;
	const slugs = ['marathon', 'half-marathon', '10k', '5k', 'whole-fitness'];
	const forLevel = (slug: string, experience: (typeof levels)[number]) =>
		generatePlan({
			profile: GOAL_PROFILES.find((g) => g.slug === slug)!,
			baseline: { experience },
			availableDays: [0, 2, 4, 6],
			startDate: '2026-12-01',
		});

	// The regression this protects: an easy run used to be capped at the long
	// run's length, so on a light week the two came out identical (a beginner 5K
	// showed an easy run and a long run both at the same 3.2 mi).
	it('always keeps an easy run strictly shorter than the long run', () => {
		for (const slug of slugs) {
			for (const experience of levels) {
				const p = forLevel(slug, experience);
				for (const w of p.weeks) {
					const long = w.sessions.find((s) => s.type === 'long');
					const easy = w.sessions.find((s) => s.type === 'easy');
					if (long && easy) {
						expect(easy.prescription.targetDistanceKm!).toBeLessThan(
							long.prescription.targetDistanceKm!,
						);
					}
				}
			}
		}
	});

	it('never lets another run be longer than the long run', () => {
		for (const slug of slugs) {
			const p = forLevel(slug, 'intermediate');
			for (const w of p.weeks) {
				const runs = w.sessions.filter((s) => s.modality === 'running');
				const long = runs.find((s) => s.type === 'long');
				if (!long) continue;
				for (const r of runs) {
					expect(r.prescription.targetDistanceKm ?? 0).toBeLessThanOrEqual(
						long.prescription.targetDistanceKm! + 0.05,
					);
				}
			}
		}
	});

	it('progresses the long run across the plan', () => {
		const p = forLevel('marathon', 'intermediate');
		const longs = p.weeks.map(
			(w) => w.sessions.find((s) => s.type === 'long')?.prescription.targetDistanceKm ?? 0,
		);
		// The peak long run is clearly longer than the first week's.
		expect(Math.max(...longs)).toBeGreaterThan(longs[0]! * 1.15);
	});

	it('builds the long run without a step over the ~10 percent ceiling', () => {
		for (const slug of slugs) {
			const p = forLevel(slug, 'intermediate');
			const longs = p.weeks.map(
				(w) => w.sessions.find((s) => s.type === 'long')!.prescription.targetDistanceKm!,
			);
			for (let i = 1; i < longs.length; i++) {
				// Drops are deloads and the taper; a jump up never beats the ceiling.
				expect(longs[i]!).toBeLessThanOrEqual(longs[i - 1]! * 1.1 + 0.35);
			}
		}
	});

	it('keeps the same run days in the ease-in week as the week after', () => {
		const p = forLevel('marathon', 'intermediate');
		const runDays = (wk: (typeof p.weeks)[number]) =>
			wk.sessions.filter((s) => s.modality === 'running').length;
		expect(runDays(p.weeks[0]!)).toBe(runDays(p.weeks[1]!));
	});

	it('keeps the same running days every week, so the week does not jump shape', () => {
		const p = forLevel('marathon', 'intermediate');
		const shape = (wk: (typeof p.weeks)[number]) =>
			wk.sessions
				.filter((s) => s.modality === 'running')
				.map((s) => s.day)
				.join(',');
		const first = shape(p.weeks[0]!);
		for (const w of p.weeks) expect(shape(w)).toBe(first);
	});

	it('never lets a taper week be heavier than the peak', () => {
		for (const slug of slugs) {
			const p = forLevel(slug, 'intermediate');
			const peak = Math.max(...p.weeks.map((w) => w.targetVolumeKm));
			for (const w of p.weeks.filter((x) => x.phase === 'taper')) {
				expect(w.targetVolumeKm).toBeLessThanOrEqual(peak);
			}
		}
	});

	it('keeps the ease-in week among the lightest, never the heaviest', () => {
		const p = forLevel('marathon', 'intermediate');
		const build = p.weeks.filter((w) => w.phase !== 'taper').map((w) => w.targetVolumeKm);
		const lightest = Math.min(...build.slice(1));
		expect(p.weeks[0]!.targetVolumeKm).toBeLessThanOrEqual(lightest * 1.05);
	});

	it('starts an advanced runner higher than a beginner, same plan', () => {
		const beginner = forLevel('marathon', 'beginner').weeks[0]!.targetVolumeKm;
		const advanced = forLevel('marathon', 'advanced').weeks[0]!.targetVolumeKm;
		expect(advanced).toBeGreaterThan(beginner);
	});

	const withBuild = (buildPreference: 'ease-in' | 'steady' | 'ambitious') =>
		generatePlan({
			profile: GOAL_PROFILES.find((g) => g.slug === 'marathon')!,
			baseline: { experience: 'intermediate', buildPreference },
			availableDays: [0, 2, 4, 6],
			startDate: '2026-12-01',
			targetDate: '2027-05-01',
		});

	it('opens lower and climbs further the bolder the build preference', () => {
		const ease = withBuild('ease-in');
		const steady = withBuild('steady');
		const bold = withBuild('ambitious');
		const peak = (p: typeof ease) => Math.max(...p.weeks.map((w) => w.targetVolumeKm));
		expect(ease.weeks[0]!.targetVolumeKm).toBeLessThan(bold.weeks[0]!.targetVolumeKm);
		expect(peak(ease)).toBeLessThan(peak(steady));
		expect(peak(steady)).toBeLessThan(peak(bold));
	});
});

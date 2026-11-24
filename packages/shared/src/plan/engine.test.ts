import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { generatePlan } from './engine';
import { findMove } from './catalog';
import { WORKOUT_LIBRARY } from './library';

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
		const interval = plan.weeks.flatMap((w) => w.sessions).find((s) => s.type === 'interval');
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
		// A Monday start, so week one is whole; the mobility tests below count its
		// sessions. A mid-week start leaves week one partial by design.
		startDate: '2026-11-30',
		targetDate: '2027-05-01',
	};

	it('uses bodyweight moves for a bodyweight circuit', () => {
		const p = generatePlan({
			...base,
			baseline: { experience: 'intermediate', equipment: 'bodyweight' },
		});
		const strength = p.weeks.flatMap((w) => w.sessions).find((s) => s.modality === 'strength')!;
		expect(strength.type).toBe('full-body-strength');
		const names = strength.prescription.blocks!.map((b) => b.machine);
		expect(names).toContain('Bodyweight squat');
		expect(names).not.toContain('Leg press');
	});

	it('uses machine moves for a machines circuit', () => {
		const p = generatePlan({
			...base,
			baseline: { experience: 'intermediate', equipment: 'machines' },
		});
		const strength = p.weeks.flatMap((w) => w.sessions).find((s) => s.modality === 'strength')!;
		expect(strength.type).toBe('machine-circuit');
		expect(strength.prescription.blocks!.some((b) => b.machine === 'Leg press')).toBe(true);
	});

	it('uses the chosen equipment for a strength session', () => {
		const p = generatePlan({
			...base,
			baseline: { experience: 'intermediate', equipment: 'kettlebell' },
		});
		const strength = p.weeks.flatMap((w) => w.sessions).find((s) => s.modality === 'strength')!;
		expect(strength.type).toBe('full-body-strength');
		const names = strength.prescription.blocks!.map((b) => b.machine);
		expect(names.some((n) => findMove(n)?.equipment === 'kettlebell')).toBe(true);
	});

	it('labels a strength session from the moves it contains, not the mode', () => {
		// A machines-mode circuit whose kit has no machines fills with bodyweight, so
		// the card must not read as a machine circuit over a bodyweight move. The kit
		// is the top-level PlanInput.equipment, as the API passes it.
		const bodyweightOnly = generatePlan({
			...base,
			equipment: ['bands'],
			baseline: { experience: 'intermediate', equipment: 'machines' },
		});
		const bw = bodyweightOnly.weeks
			.flatMap((w) => w.sessions)
			.find((s) => s.modality === 'strength')!;
		expect(bw.title).toBe('Strength');
		expect(bw.type).toBe('full-body-strength');
		expect(bw.prescription.summary).toContain('moves');

		// A genuine all-machine circuit keeps the machine-circuit archetype, but the
		// label is still the neutral "Strength".
		const machineOnly = generatePlan({
			...base,
			baseline: { experience: 'intermediate', equipment: 'machines' },
		});
		const mc = machineOnly.weeks
			.flatMap((w) => w.sessions)
			.find((s) => s.modality === 'strength')!;
		expect(mc.title).toBe('Strength');
		expect(mc.type).toBe('machine-circuit');
		expect(mc.prescription.summary).toContain('machines');
	});

	it('starts an older runner at a lower recommended volume', () => {
		const young = generatePlan({ ...base, baseline: { experience: 'intermediate', age: 28 } });
		const old = generatePlan({ ...base, baseline: { experience: 'intermediate', age: 68 } });
		expect(old.meta.baseWeeklyKm).toBeLessThan(young.meta.baseWeeklyKm);
	});

	it('builds a lower peak for an older runner at the same starting volume', () => {
		const peak = (p: ReturnType<typeof generatePlan>) =>
			Math.max(...p.weeks.map((w) => w.targetVolumeKm));
		const young = generatePlan({
			...base,
			baseline: { experience: 'intermediate', weeklyKm: 40, age: 28 },
		});
		const old = generatePlan({
			...base,
			baseline: { experience: 'intermediate', weeklyKm: 40, age: 68 },
		});
		expect(peak(old)).toBeLessThan(peak(young));
	});

	it('sets strength volume by level', () => {
		const setCount = (experience: 'beginner' | 'advanced') => {
			const p = generatePlan({ ...base, baseline: { experience, equipment: 'machines' } });
			const strength = p.weeks.flatMap((w) => w.sessions).find((s) => s.modality === 'strength')!;
			return strength.prescription.blocks![0]!.sets.length;
		};
		expect(setCount('beginner')).toBe(2);
		expect(setCount('advanced')).toBe(4);
	});

	it('sizes the circuit by session length', () => {
		const short = generatePlan({
			...base,
			baseline: { experience: 'intermediate', sessionMinutes: 30 },
		});
		const long = generatePlan({
			...base,
			baseline: { experience: 'intermediate', sessionMinutes: 60 },
		});
		const shortN = short.weeks[0]!.sessions.find((s) => s.modality === 'strength')!.prescription
			.blocks!.length;
		const longN = long.weeks[0]!.sessions.find((s) => s.modality === 'strength')!.prescription
			.blocks!.length;
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

	it('names the added mobility and cross-training sessions, not just their type', () => {
		const p = generatePlan({
			profile: wholeFitness,
			availableDays: [1, 3, 5],
			startDate: '2026-12-01',
			baseline: {
				experience: 'beginner',
				crossTraining: ['bike'],
				flexibility: { current: 2, goal: 4 },
			},
		});
		const mobility = p.weeks.flatMap((w) => w.sessions).filter((s) => s.type === 'mobility');
		expect(mobility.length).toBeGreaterThan(0);
		for (const s of mobility) expect(s.title).toBe('Mobility and stretching, 12 minutes');
		const cross = p.weeks[0]!.sessions.find((s) => s.type === 'cross-train');
		expect(cross?.title).toBe('Bike');
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
			p.weeks[0]!.sessions.find((s) => s.type === 'mobility')!.prescription.workout!.blocks.flatMap(
				(b) => b.steps,
			).length;
		expect(count(growing)).toBeGreaterThan(count(holding));
	});

	it('schedules mobility every day for the biggest flexibility gap', () => {
		const p = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', flexibility: { current: 1, goal: 5 } },
		});
		const mobility = p.weeks[0]!.sessions.filter((s) => s.type === 'mobility');
		expect(mobility).toHaveLength(7);
		expect(new Set(mobility.map((s) => s.day)).size).toBe(7);
		for (const s of mobility) expect(s.title).toBe('Mobility and stretching, 20 minutes');
	});

	it('keeps a small flexibility gap light', () => {
		const p = generatePlan({
			...base,
			availableDays: [0, 2, 4],
			baseline: { experience: 'intermediate', flexibility: { current: 4, goal: 5 } },
		});
		const mobility = p.weeks[0]!.sessions.filter((s) => s.type === 'mobility');
		expect(mobility).toHaveLength(1);
		expect(mobility[0]!.title).toBe('Mobility and stretching, 8 minutes');
		expect(
			mobility[0]!.prescription.workout!.blocks.flatMap((b) => b.steps),
		).toHaveLength(6);
	});

	it('aims the stretches at what the runner told us', () => {
		const mobilityFor = (baseline: Parameters<typeof generatePlan>[0]['baseline']) => {
			const p = generatePlan({ ...base, availableDays: [0, 2, 4], baseline });
			return p.weeks[0]!.sessions.find((s) => s.type === 'mobility')!;
		};
		const labels = (s: ReturnType<typeof mobilityFor>) =>
			s.prescription.workout!.blocks.flatMap((b) => b.steps).map((st) => st.label);
		const flex = { current: 1, goal: 5 };
		const plain = mobilityFor({ experience: 'intermediate', flexibility: flex });
		const knee = mobilityFor({ experience: 'intermediate', flexibility: flex, niggles: 'sore knee' });
		const hilly = mobilityFor({ experience: 'intermediate', flexibility: flex, terrain: 'hilly' });
		expect(plain.title).toBe('Mobility and stretching, 20 minutes');
		expect(knee.title).toBe('Hips and glutes, 20 minutes');
		expect(hilly.title).toBe('Hamstrings and calves, 20 minutes');
		// Two dynamic drills plus eight holds run twice: a real step up from the
		// short routine, and the aimed routines differ from each other.
		expect(labels(plain)).toHaveLength(18);
		expect(labels(knee)).not.toEqual(labels(plain));
		expect(labels(hilly)).not.toEqual(labels(plain));
		expect(labels(hilly)).not.toEqual(labels(knee));
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

	it('eases or holds a week when the model asks, without changing the shape', () => {
		const plain = generatePlan(base);
		const eased = generatePlan({ ...base, weekShapes: [undefined, { volumeIntent: 'ease' }] });
		const held = generatePlan({ ...base, weekShapes: [undefined, { volumeIntent: 'hold' }] });
		expect(eased.weeks[1]!.targetVolumeKm).toBeLessThan(plain.weeks[1]!.targetVolumeKm);
		expect(held.weeks[1]!.targetVolumeKm).toBeLessThanOrEqual(plain.weeks[1]!.targetVolumeKm);
		// The long run is still the longest run in an eased week.
		for (const w of eased.weeks) {
			const long = w.sessions.find((s) => s.type === 'long');
			if (!long) continue;
			for (const r of w.sessions.filter((s) => s.modality === 'running')) {
				expect(r.prescription.targetDistanceKm ?? 0).toBeLessThanOrEqual(
					long.prescription.targetDistanceKm! + 0.06,
				);
			}
		}
	});

	it('ignores a volume intent in the taper', () => {
		const plain = generatePlan(base);
		const last = plain.weeks.length - 1;
		const shapes: ({ volumeIntent: 'ease' } | undefined)[] = plain.weeks.map(() => undefined);
		shapes[last] = { volumeIntent: 'ease' };
		const eased = generatePlan({ ...base, weekShapes: shapes });
		expect(eased.weeks[last]!.targetVolumeKm).toBe(plain.weeks[last]!.targetVolumeKm);
		expect(eased.weeks[last]!.phase).toBe('taper');
	});

	it('takes paces from an effective VDOT when no race time is given', () => {
		const withVdot = generatePlan({
			...base,
			baseline: { experience: 'intermediate', effectiveVdot: 50 },
		});
		const without = generatePlan({ ...base, baseline: { experience: 'intermediate' } });
		expect(withVdot.meta.vdot).toBe(50);
		expect(without.meta.vdot).toBeUndefined();
	});

	it('prefers a quality kind the runner rated well over one they rated poorly', () => {
		const week2Kind = (baseline: {
			experience: 'intermediate';
			likedTypes?: string[];
			dislikedTypes?: string[];
		}) => {
			const plan = generatePlan({ ...base, baseline });
			return plan.weeks[1]!.sessions.find((s) => s.modality === 'running' && s.type !== 'easy')
				?.type;
		};
		// By default the base week is a tempo session.
		expect(week2Kind({ experience: 'intermediate' })).toBe('tempo');
		// Rated tempo poorly and hills well, the week leans toward hills instead.
		expect(
			week2Kind({ experience: 'intermediate', dislikedTypes: ['tempo'], likedTypes: ['hills'] }),
		).toBe('hills');
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
			// A Monday start, so week one is whole and its shape can be compared with
			// the weeks after it. A mid-week start leaves week one partial by design.
			startDate: '2026-11-30',
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

describe('favorites', () => {
	const base = {
		profile: marathon,
		availableDays: [0, 2, 4, 6],
		startDate: '2026-12-01',
		targetDate: '2027-05-01',
	};
	const strengthMoves = (input: Parameters<typeof generatePlan>[0]) =>
		generatePlan(input)
			.weeks.flatMap((w) => w.sessions)
			.find((s) => s.modality === 'strength')!
			.prescription.blocks!.map((b) => b.machine);

	it('chooses a favorite machine when it fits the circuit', () => {
		const plain = strengthMoves({
			...base,
			baseline: { experience: 'intermediate', equipment: 'machines' },
		});
		expect(plain).not.toContain('Bicep curl');
		const favored = strengthMoves({
			...base,
			baseline: { experience: 'intermediate', equipment: 'machines' },
			favoriteMachines: ['Bicep curl'],
		});
		expect(favored).toContain('Bicep curl');
	});

	it('still builds when a favorite machine is not available', () => {
		const p = generatePlan({
			...base,
			baseline: { experience: 'intermediate', equipment: 'machines' },
			machines: ['Leg press'],
			favoriteMachines: ['Leg press', 'Not a real machine'],
		});
		const strength = p.weeks.flatMap((w) => w.sessions).find((s) => s.modality === 'strength')!;
		expect(p.weeks.length).toBeGreaterThan(0);
		expect(strength.prescription.blocks!.length).toBeGreaterThan(0);
		// The one favorite the runner has is used; the unknown name is ignored.
		expect(strength.prescription.blocks!.map((b) => b.machine)).toContain('Leg press');
	});

	it('ignores a favorite machine the runner does not have', () => {
		const moves = strengthMoves({
			...base,
			baseline: { experience: 'intermediate', equipment: 'bodyweight' },
			favoriteMachines: ['Leg press'],
		});
		expect(moves).not.toContain('Leg press');
		expect(moves.length).toBeGreaterThan(0);
	});

	it('names a favorite mobility workout over its own pick', () => {
		const mobilityTitle = (input: Parameters<typeof generatePlan>[0]) =>
			generatePlan(input)
				.weeks.flatMap((w) => w.sessions)
				.find((s) => s.type === 'mobility')!.title;
		const flexible = {
			...base,
			baseline: { experience: 'intermediate' as const, flexibility: { current: 2, goal: 4 } },
		};
		// The gap alone earns the 12 minute routine.
		expect(mobilityTitle(flexible)).toBe('Mobility and stretching, 12 minutes');
		// A favorite mobility workout is used instead.
		expect(mobilityTitle({ ...flexible, favoriteWorkouts: ['mobility-build-general'] })).toBe(
			'Mobility and stretching, 20 minutes',
		);
	});

	it('keeps its own routine when the favorite does not fit the slot', () => {
		const title = generatePlan({
			...base,
			baseline: { experience: 'intermediate', flexibility: { current: 2, goal: 4 } },
			favoriteWorkouts: ['easy-run-30'],
		})
			.weeks.flatMap((w) => w.sessions)
			.find((s) => s.type === 'mobility')!.title;
		expect(title).toBe('Mobility and stretching, 12 minutes');
	});

	it('builds a favorite strength workout when the runner has one', () => {
		const moves = strengthMoves({
			...base,
			baseline: { experience: 'intermediate', equipment: 'bodyweight' },
			favoriteWorkouts: ['runners-strength-40'],
		});
		expect(moves).toContain('Split squat');
		expect(moves).not.toContain('Leg press');
	});

	it('uses a favorite run workout for a session of the same type', () => {
		const longTitle = (input: Parameters<typeof generatePlan>[0]) =>
			generatePlan(input)
				.weeks.flatMap((w) => w.sessions)
				.find((s) => s.type === 'long')!.title;
		const fav = WORKOUT_LIBRARY.find((w) => w.id === 'long-run-90')!;
		expect(
			longTitle({
				...base,
				baseline: { experience: 'intermediate' },
				favoriteWorkouts: ['long-run-90'],
			}),
		).toBe(fav.title);
	});

	it('keeps its own run shape when the favorite does not match the type', () => {
		const longTitle = (input: Parameters<typeof generatePlan>[0]) =>
			generatePlan(input)
				.weeks.flatMap((w) => w.sessions)
				.find((s) => s.type === 'long')!.title;
		// An easy favorite does not match a long run, so the plan keeps its own.
		expect(
			longTitle({
				...base,
				baseline: { experience: 'intermediate' },
				favoriteWorkouts: ['easy-run-30'],
			}),
		).not.toBe(WORKOUT_LIBRARY.find((w) => w.id === 'easy-run-30')!.title);
	});
});

describe('week alignment when the plan starts on a non-Monday', () => {
	const isoToDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
	const addDays = (iso: string, n: number) => {
		const d = isoToDate(iso);
		d.setUTCDate(d.getUTCDate() + n);
		return d.toISOString().slice(0, 10);
	};
	/** 0 = Monday … 6 = Sunday for an ISO date. */
	const weekdayOf = (iso: string) => (isoToDate(iso).getUTCDay() + 6) % 7;

	// 2026-12-01 is a Tuesday. The runner trains Tuesday, Thursday and Saturday,
	// and asks the plan to start today.
	const tuesdayStart = '2026-12-01';
	const plan = generatePlan({
		profile: marathon,
		baseline: { experience: 'intermediate' },
		availableDays: [1, 3, 5],
		startDate: tuesdayStart,
		targetDate: '2027-05-01',
	});

	it('anchors every week to its Monday', () => {
		for (const w of plan.weeks) {
			expect(weekdayOf(w.startDate)).toBe(0);
			expect(w.endDate).toBe(addDays(w.startDate, 6));
		}
		// Week one is the calendar week that holds the chosen Tuesday.
		expect(plan.weeks[0]!.startDate).toBe('2026-11-30');
	});

	it('lands every session on the weekday its day index names', () => {
		for (const w of plan.weeks) {
			for (const s of w.sessions) {
				expect(weekdayOf(addDays(w.startDate, s.day))).toBe(s.day);
			}
		}
	});

	it('keeps week one free of sessions before the chosen start date', () => {
		const w1 = plan.weeks[0]!;
		for (const s of w1.sessions) {
			expect(addDays(w1.startDate, s.day) >= tuesdayStart).toBe(true);
		}
	});

	it('puts the runner Tuesday training day on the actual Tuesday', () => {
		const w1 = plan.weeks[0]!;
		const tuesday = w1.sessions.find((s) => s.day === 1)!;
		expect(tuesday).toBeTruthy();
		expect(addDays(w1.startDate, tuesday.day)).toBe(tuesdayStart);
	});

	it('puts a session on the same date in the day view and the calendar', () => {
		const w1 = plan.weeks[0]!;
		// The calendar maps a session to weekStart + day. The day view selects a
		// date by its offset from the week start, which is the same number only when
		// the week is a Monday. This pins that agreement.
		const offsetFromWeekStart = (iso: string) =>
			((Math.round((isoToDate(iso).getTime() - isoToDate(w1.startDate).getTime()) / 86400000) % 7) +
				7) %
			7;
		for (const s of w1.sessions) {
			const calendarDate = addDays(w1.startDate, s.day);
			expect(offsetFromWeekStart(calendarDate)).toBe(s.day);
			expect(weekdayOf(calendarDate)).toBe(s.day);
		}
	});

	it('leaves a Monday start unchanged', () => {
		const monday = generatePlan({
			profile: marathon,
			baseline: { experience: 'intermediate' },
			availableDays: [1, 3, 5],
			startDate: '2026-11-30',
			targetDate: '2027-05-01',
		});
		expect(monday.weeks[0]!.startDate).toBe('2026-11-30');
		// Week one is whole, so its Tuesday session is still there.
		expect(monday.weeks[0]!.sessions.some((s) => s.day === 1)).toBe(true);
	});
});

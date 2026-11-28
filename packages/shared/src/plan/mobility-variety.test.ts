import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { generatePlan } from './engine';
import {
	ANCHOR_SECOND_OPTIONS,
	ANCHOR_STRETCHES,
	FOCUS_AREA_TITLE,
	HOLD_ROUNDS,
	MOVEMENT_DRILLS,
	ROAMING_ORDER,
	WEEKLY_STRETCH_PLATEAU_SEC,
	addHoldDose,
	mobilityAnchorFocuses,
	pickRoamingIndex,
	stretchTargets,
} from './mobility-plan';
import type { PlannedSession, PlannedWeek } from './types';

const marathon = GOAL_PROFILES.find((p) => p.slug === 'marathon')!;

const base = {
	profile: marathon,
	availableDays: [0, 2, 4, 6],
	// A Monday start, so week one is whole and its session counts are exact.
	startDate: '2026-11-30',
	targetDate: '2027-05-01',
};

const planWith = (baseline: Parameters<typeof generatePlan>[0]['baseline'], extra = {}) =>
	generatePlan({ ...base, baseline, ...extra });

const mobilitySessions = (week: PlannedWeek) => week.sessions.filter((s) => s.type === 'mobility');

/** The static holds of a mobility session, in run order. */
const holds = (s: PlannedSession) =>
	s.prescription.workout!.blocks.flatMap((b) => b.steps).filter((st) => st.kind === 'cooldown');

/** The session's roaming stretch: the last hold, after the anchor holds. */
const roamOf = (s: PlannedSession) => holds(s).at(-1)!.label;

/** The focus a session anchors on, read from the title the engine gave it. */
const focusOf = (s: PlannedSession) => {
	const title = s.title.replace(/, \d+ minutes$/, '');
	const focus = (Object.entries(FOCUS_AREA_TITLE) as [string, string][]).find(
		([, name]) => name === title,
	)?.[0];
	expect(focus, s.title).toBeDefined();
	return focus as keyof typeof ANCHOR_STRETCHES;
};

describe('mobility variety and dose (17b)', () => {
	// A gap of four earns a session every day, so the rotation has room to show.
	const daily = { experience: 'intermediate' as const, flexibility: { current: 1, goal: 5 } };

	it('varies the routine across sessions and weeks', () => {
		const p = planWith(daily);
		const w0 = mobilitySessions(p.weeks[0]!);
		const w1 = mobilitySessions(p.weeks[1]!);
		expect(w0).toHaveLength(7);
		// The week's sessions are not one routine repeated: the roaming stretch
		// changes from session to session.
		const roams0 = w0.map(roamOf);
		expect(new Set(roams0).size).toBeGreaterThan(1);
		// And the next week does not replay the same seven sessions: its roaming
		// stretches have moved on.
		const roams1 = w1.map(roamOf);
		expect(roams1).not.toEqual(roams0);
	});

	it('anchors every session on the stated area at the full dose', () => {
		const p = planWith({ ...daily, niggles: 'sore knee' });
		const sessions = p.weeks.flatMap((w) => mobilitySessions(w));
		expect(sessions.length).toBeGreaterThan(0);
		for (const s of sessions) {
			const focus = focusOf(s);
			const first = ANCHOR_STRETCHES[focus][0]!;
			// The first hold is the focus's signature and repeats at every session.
			expect(
				holds(s).filter((st) => st.label === first),
				`${s.title}: ${first}`,
			).toHaveLength(1);
			// The second hold rotates within the focus, so it is always one of the
			// focus's own holds and the session keeps the stated area.
			const second = holds(s).find((st) => st.label !== first)!.label;
			expect(ANCHOR_SECOND_OPTIONS[focus], `${s.title}: ${second}`).toContain(second);
			// Each hold is one row carrying its rounds, so the dose reads as a dose:
			// two rounds inside the 30 to 45 second band, at every session, whatever
			// the rotation or the swap did around it.
			for (const name of [first, second]) {
				const steps = holds(s).filter((st) => st.label === name);
				expect(steps, `${s.title}: ${name}`).toHaveLength(1);
				expect(steps[0]!.sets, `${s.title}: ${name}`).toBe(HOLD_ROUNDS);
				expect(steps[0]!.durationSec).toBeGreaterThanOrEqual(30);
				expect(steps[0]!.durationSec).toBeLessThanOrEqual(45);
			}
			// The two anchor holds run first, in order, the roaming stretch last.
			const labels = holds(s).map((st) => st.label);
			expect(labels.slice(0, 2)).toEqual([first, second]);
		}
	});

	it('shows one row per hold at its full dose, without changing the time under stretch', () => {
		const p = planWith(daily);
		const sessions = p.weeks.flatMap((w) => mobilitySessions(w));
		expect(sessions.length).toBeGreaterThan(0);
		for (const s of sessions) {
			const hs = holds(s);
			// One step per hold, so no hold reads twice: the detail shows one row
			// per hold and the player runs its rounds from the step's own count.
			const labels = hs.map((st) => st.label);
			expect(new Set(labels).size, s.title).toBe(labels.length);
			for (const st of hs) {
				expect(st.durationSec, s.title).toBeGreaterThanOrEqual(30);
				expect(st.durationSec, s.title).toBeLessThanOrEqual(45);
				expect(st.sets, s.title).toBe(HOLD_ROUNDS);
			}
			// The session's declared length is the sum of the dynamic drills and
			// every hold at its full rounds, so folding the rounds into one row
			// changed no time under stretch.
			const totalSec = s.prescription.workout!.blocks
				.flatMap((b) => b.steps)
				.reduce((n, st) => n + (st.durationSec ?? 0) * (st.sets ?? 1), 0);
			expect(s.prescription.workout!.estimatedDurationMin, s.title).toBe(
				Math.max(1, Math.round(totalSec / 60)),
			);
		}
	});

	it('rotates the roaming stretch by session index', () => {
		const p = planWith({ ...daily, niggles: 'sore knee' });
		const w0 = mobilitySessions(p.weeks[0]!);
		const roams = w0.map(roamOf);
		// One roaming stretch per session, drawn from outside the anchor pair.
		for (const s of w0) {
			expect(roamOf(s)).not.toBeNull();
			expect(ANCHOR_STRETCHES[focusOf(s)]).not.toContain(roamOf(s));
		}
		// Consecutive sessions roam somewhere new: the cursor only revisits a
		// stretch once the pool has cycled, and the pool outgrows a week.
		for (let i = 1; i < roams.length; i++) expect(roams[i]).not.toEqual(roams[i - 1]);
		expect(new Set(roams).size).toBe(roams.length);
		// The rotation keeps moving into the next week.
		const roams1 = mobilitySessions(p.weeks[1]!).map(roamOf);
		expect(roams1[0]).not.toEqual(roams[0]);
	});

	it('swaps one high-frequency session to the second area', () => {
		// The knee niggle votes for the hips and glutes, the hilly terrain for the
		// hamstrings and calves, so the week has a runner-up to swap to.
		const baseline = { ...daily, niggles: 'sore knee', terrain: 'hilly' as const };
		const { primary, secondary } = mobilityAnchorFocuses(baseline);
		expect(primary).toBe('hips-glutes');
		expect(secondary).toBe('hamstrings-calves');
		const p = planWith(baseline);
		const w0 = mobilitySessions(p.weeks[0]!);
		expect(w0).toHaveLength(7);
		const byArea = (area: string) => w0.filter((s) => s.title.startsWith(area)).length;
		// The stated focus keeps the majority; exactly one session anchors on the
		// runner-up.
		expect(byArea('Hips and glutes')).toBe(6);
		expect(byArea('Hamstrings and calves')).toBe(1);
		// A low-frequency week has nothing to swap: every session keeps the
		// stated area.
		const small = planWith({
			experience: 'intermediate',
			flexibility: { current: 3, goal: 5 },
			niggles: 'sore knee',
			terrain: 'hilly',
		});
		const w0Small = mobilitySessions(small.weeks[0]!);
		expect(w0Small).toHaveLength(2);
		for (const s of w0Small) expect(s.title.startsWith('Hips and glutes')).toBe(true);
	});

	it('weights a favorite workout into the rotation instead of overriding', () => {
		const p = planWith(daily, { favoriteWorkouts: ['mobility-build-general'] });
		const w0 = mobilitySessions(p.weeks[0]!);
		expect(w0).toHaveLength(7);
		const favorite = w0.filter((s) => s.prescription.libraryId === 'mobility-build-general');
		const variants = w0.filter((s) => !s.prescription.libraryId);
		// The favorite takes the bigger share of the week...
		expect(favorite).toHaveLength(4);
		expect(variants).toHaveLength(3);
		expect(favorite.length).toBeGreaterThan(variants.length);
		// ...and the variants still cycle: their roaming stretches differ, and
		// each keeps the full anchor dose.
		expect(new Set(variants.map(roamOf)).size).toBeGreaterThan(1);
		for (const s of variants) {
			const focus = focusOf(s);
			const first = ANCHOR_STRETCHES[focus][0]!;
			expect(holds(s).filter((st) => st.label === first)).toHaveLength(1);
			const second = holds(s).find((st) => st.label !== first)!.label;
			expect(ANCHOR_SECOND_OPTIONS[focus]).toContain(second);
			expect(holds(s).filter((st) => st.label === second)).toHaveLength(1);
			expect(holds(s).find((st) => st.label === second)!.sets).toBe(HOLD_ROUNDS);
		}
	});

	it('keeps the stated focus in the majority of composed sessions', () => {
		// Three sessions a week with a favorite leaves a single composed session,
		// which stays on the stated area instead of swapping, since a swap would
		// leave the stated focus a minority of the composed work.
		const three = planWith(
			{
				experience: 'intermediate',
				flexibility: { current: 2, goal: 5 },
				niggles: 'sore knee',
				terrain: 'hilly',
			},
			{ favoriteWorkouts: ['mobility-build-hips-glutes'] },
		);
		const w0Three = mobilitySessions(three.weeks[0]!);
		expect(w0Three).toHaveLength(3);
		const composedThree = w0Three.filter((s) => !s.prescription.libraryId);
		expect(composedThree).toHaveLength(1);
		expect(composedThree[0]!.title.startsWith('Hips and glutes')).toBe(true);
		// Seven a week with a favorite leaves three composed sessions, so the swap
		// runs and the stated focus keeps two of them.
		const seven = planWith(daily, { favoriteWorkouts: ['mobility-build-hips-glutes'] });
		const w0Seven = mobilitySessions(seven.weeks[0]!);
		const composedSeven = w0Seven.filter((s) => !s.prescription.libraryId);
		expect(composedSeven).toHaveLength(3);
		expect(composedSeven.filter((s) => s.title.startsWith('Mobility and stretching'))).toHaveLength(2);
		expect(composedSeven.filter((s) => s.title.startsWith('Hips and glutes'))).toHaveLength(1);
	});

	it('alternates the favorite across the whole plan, even in a one-session week', () => {
		// A gap of one earns one mobility session a week, so the favorite must not
		// run every week: the composed variant takes the weeks it does not.
		const p = planWith(
			{ experience: 'intermediate', flexibility: { current: 4, goal: 5 } },
			{ favoriteWorkouts: ['mobility-build-general'] },
		);
		const sessions = p.weeks.flatMap((w) => mobilitySessions(w));
		expect(sessions.length).toBeGreaterThan(3);
		sessions.forEach((s, i) => {
			const isFavorite = s.prescription.libraryId === 'mobility-build-general';
			expect(isFavorite, `session ${i}`).toBe(i % 2 === 0);
		});
	});

	it('counts a roaming stretch that overlaps the anchor toward the weekly dose', () => {
		const ledger = new Map<string, number>();
		// Three sessions of the hips-and-glutes anchor put the glute max at 80
		// seconds a session.
		for (let i = 0; i < 3; i++) addHoldDose(ledger, 'Seated glute figure-4 stretch', 80);
		expect(ledger.get('gluteus maximus')).toBe(240);
		// The order carries a stretch that also hits the glute max. With room under
		// the plateau it is picked, and its seconds join the muscle's total.
		const overlapping = ROAMING_ORDER.indexOf('Supine figure-4 piriformis stretch');
		expect(overlapping).toBeGreaterThan(-1);
		const picked = pickRoamingIndex('hips-glutes', ledger, overlapping);
		expect(picked).toBe(overlapping);
		addHoldDose(ledger, ROAMING_ORDER[picked]!, 80);
		expect(ledger.get('gluteus maximus')).toBe(320);
		// With the week nearly full, the same candidate would push the muscle
		// past the plateau, so the cursor skips to the next one that fits and
		// the anchor dose is never trimmed to make room.
		const full = new Map<string, number>();
		for (let i = 0; i < 7; i++) {
			addHoldDose(full, 'Seated glute figure-4 stretch', 80);
			addHoldDose(full, 'Kneeling hip flexor stretch', 80);
		}
		expect(full.get('gluteus maximus')).toBe(560);
		const skipped = pickRoamingIndex('hips-glutes', full, overlapping);
		expect(skipped).toBeGreaterThan(overlapping);
		expect(stretchTargets(ROAMING_ORDER[skipped]!)).not.toContain('gluteus maximus');
	});

	it('never repeats a roaming stretch across a change of anchor', () => {
		// The cursor walks one shared order, so the pick that follows a pick is a
		// different stretch even when the next session anchors on another area and
		// therefore picks from different candidates. The engine carries the cursor
		// past the stretch a session took, so the boundary pair to check is one
		// pick and the pick that starts just after it.
		const ledger = new Map<string, number>();
		const faces = ['general', 'hips-glutes'] as const;
		for (let c = 0; c < ROAMING_ORDER.length; c++) {
			for (const first of faces) {
				for (const second of faces) {
					const picked = pickRoamingIndex(first, ledger, c);
					const next = pickRoamingIndex(second, ledger, picked + 1);
					expect(ROAMING_ORDER[next], `${first} then ${second} at ${c}`).not.toBe(
						ROAMING_ORDER[picked],
					);
				}
			}
		}
	});

	it('anchors the ankles on static holds and never counts a movement as dose', () => {
		// The two rocking and circling drills stay out of the anchor pair, and no
		// anchor anywhere is a movement.
		for (const anchors of Object.values(ANCHOR_STRETCHES)) {
			for (const name of anchors) expect(MOVEMENT_DRILLS).not.toContain(name);
		}
		// The ankles anchor runs as two static holds at every session.
		const p = planWith({ experience: 'intermediate', flexibility: { current: 1, goal: 5 }, terrain: 'flat' });
		const sessions = p.weeks.flatMap((w) => mobilitySessions(w)).filter((s) => s.title.startsWith('Ankles'));
		expect(sessions.length).toBeGreaterThan(0);
		for (const s of sessions) {
			const first = ANCHOR_STRETCHES.ankles[0]!;
			expect(holds(s).filter((st) => st.label === first)).toHaveLength(1);
			const second = holds(s).find((st) => st.label !== first)!.label;
			expect(ANCHOR_SECOND_OPTIONS.ankles).toContain(second);
			expect(holds(s).filter((st) => st.label === second)).toHaveLength(1);
			expect(holds(s).find((st) => st.label === second)!.sets).toBe(HOLD_ROUNDS);
		}
		// A movement drill adds nothing to the ledger, so the dose stays honest.
		const ledger = new Map<string, number>();
		for (const movement of MOVEMENT_DRILLS) addHoldDose(ledger, movement, 80);
		expect(ledger.size).toBe(0);
	});

	it('never lets a week pass the static plateau on any target', () => {
		for (const baseline of [
			daily,
			{ ...daily, niggles: 'sore knee', terrain: 'hilly' as const },
			// The ankles anchor, whose two holds share no target.
			{ experience: 'intermediate' as const, flexibility: { current: 1, goal: 5 }, terrain: 'flat' as const },
		]) {
			const p = planWith(baseline);
			for (const week of p.weeks) {
				const totals = new Map<string, number>();
				for (const s of mobilitySessions(week)) {
					for (const st of holds(s)) {
						// One add per hold: the step carries its rounds as `sets`, so
						// the dose is the step's seconds times its rounds, split across
						// every target the stretch names.
						addHoldDose(totals, st.label, (st.durationSec ?? 0) * (st.sets ?? 1));
					}
				}
				for (const [target, seconds] of totals) {
					expect(seconds, `${week.weekNumber}: ${target}`).toBeLessThanOrEqual(
						WEEKLY_STRETCH_PLATEAU_SEC,
					);
				}
			}
		}
	});

	it('refuses a roaming stretch that shares an aliased target with an anchor', () => {
		// 'Calf stretch' names 'Achilles' and 'calves'; the anchor names 'Achilles
		// tendon' and 'gastrocnemius'. They fold to the same keys, so a week near
		// the plateau on the calf refuses the roam instead of reading zero on the
		// alias and slipping past the plateau.
		expect(stretchTargets('Calf stretch')).toContain('Achilles tendon');
		expect(stretchTargets('Calf stretch')).toContain('gastrocnemius');
		const calf = ROAMING_ORDER.indexOf('Calf stretch');
		expect(calf).toBeGreaterThan(-1);
		// With room on the calf, the roam is taken.
		expect(pickRoamingIndex('hamstrings-calves', new Map(), calf)).toBe(calf);
		// With the calf near the plateau, it is refused and the scan moves on to a
		// stretch whose targets are clear.
		const near = new Map<string, number>();
		near.set('Achilles tendon', WEEKLY_STRETCH_PLATEAU_SEC - 40);
		near.set('gastrocnemius', WEEKLY_STRETCH_PLATEAU_SEC - 40);
		const picked = pickRoamingIndex('hamstrings-calves', near, calf);
		expect(picked).not.toBe(calf);
		expect(picked).toBeGreaterThanOrEqual(0);
	});

	it('cycles the whole roaming pool before it repeats', () => {
		// The pool is wider than the focus routines alone: it carries the extra and
		// cool-down holds the mobility library keeps, so the roam reaches the whole
		// library.
		expect(ROAMING_ORDER.length).toBeGreaterThan(17);
		expect(ROAMING_ORDER).toContain('Glute stretch');
		expect(ROAMING_ORDER).toContain('Adductor stretch');
		// Walk the cursor with an empty ledger: it names a fresh stretch on every
		// step until the whole candidate pool has cycled, then it starts again.
		const focus = 'hips-glutes' as const;
		const candidates = ROAMING_ORDER.filter((name) => !ANCHOR_STRETCHES[focus].includes(name));
		const ledger = new Map<string, number>();
		const seen = new Set<string>();
		let cursor = 0;
		for (let i = 0; i < candidates.length; i++) {
			const picked = pickRoamingIndex(focus, ledger, cursor);
			expect(picked).toBeGreaterThanOrEqual(0);
			const name = ROAMING_ORDER[picked]!;
			expect(seen.has(name), `${i}: ${name}`).toBe(false);
			seen.add(name);
			cursor = picked + 1;
		}
		expect(seen.size).toBe(candidates.length);
	});

	it('regenerates the same plan from the same seed', () => {
		const baseline = { ...daily, niggles: 'sore knee' };
		expect(planWith(baseline)).toEqual(planWith(baseline));
	});

	it('rotates the run warm-up and cool-down drills while holding their time', () => {
		const p = planWith(daily);
		const block = (s: PlannedSession, label: string) =>
			s.prescription.workout!.blocks.find((b) => b.label === label);
		const runs = p.weeks.flatMap((w) => w.sessions.filter((s) => s.modality === 'running'));
		expect(runs.length).toBeGreaterThan(0);
		const warmupSeconds = new Set<number>();
		const cooldownSeconds = new Set<number>();
		const warmupLabels = new Set<string>();
		const cooldownLabels = new Set<string>();
		for (const s of runs) {
			const warmup = block(s, 'Dynamic warm-up');
			if (warmup) {
				// Five drills at one dose, so the warm-up time is unchanged run to
				// run; only which drills change.
				expect(warmup.steps, s.title).toHaveLength(5);
				warmupSeconds.add(warmup.steps.reduce((n, st) => n + (st.durationSec ?? 0), 0));
				for (const st of warmup.steps) warmupLabels.add(st.label);
			}
			const cooldown = block(s, 'Cool-down stretches');
			if (cooldown) {
				expect(cooldown.steps, s.title).toHaveLength(4);
				cooldownSeconds.add(cooldown.steps.reduce((n, st) => n + (st.durationSec ?? 0), 0));
				for (const st of cooldown.steps) cooldownLabels.add(st.label);
			}
		}
		// Five warm-up drills of 30 seconds on easy and long runs and 50 on quality,
		// four cool-down stretches of 40 seconds, so the totals never drift.
		for (const seconds of warmupSeconds) expect([150, 250]).toContain(seconds);
		expect([...cooldownSeconds]).toEqual([160]);
		// The drills vary: more labels appear across the plan than one fixed block
		// would carry.
		expect(warmupLabels.size).toBeGreaterThan(5);
		expect(cooldownLabels.size).toBeGreaterThan(4);
		// The same run in a later week carries a different set of drills.
		const longOf = (week: PlannedWeek) => week.sessions.find((s) => s.type === 'long');
		const warmupOf = (s: PlannedSession | undefined) =>
			block(s!, 'Dynamic warm-up')?.steps.map((st) => st.label);
		expect(warmupOf(longOf(p.weeks[0]!))).not.toEqual(warmupOf(longOf(p.weeks[1]!)));
	});
});

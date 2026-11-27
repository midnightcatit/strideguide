import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { generatePlan } from './engine';
import {
	ANCHOR_STRETCHES,
	FOCUS_AREA_TITLE,
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
			const anchors = ANCHOR_STRETCHES[focusOf(s)];
			for (const name of anchors) {
				// Two sets of the hold, each inside the 30 to 45 second band, at
				// every session, whatever the rotation or the swap did around it.
				const steps = holds(s).filter((st) => st.label === name);
				expect(steps, `${s.title}: ${name}`).toHaveLength(2);
				for (const st of steps) {
					expect(st.durationSec).toBeGreaterThanOrEqual(30);
					expect(st.durationSec).toBeLessThanOrEqual(45);
				}
			}
			// The roaming stretch never replaces an anchor: the holds run the anchor
			// pair first, each hold's two rounds back to back, in order.
			const labels = holds(s).map((st) => st.label);
			expect(labels.slice(0, anchors.length * 2)).toEqual(anchors.flatMap((n) => [n, n]));
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
			const anchors = ANCHOR_STRETCHES[focusOf(s)];
			for (const name of anchors) {
				expect(holds(s).filter((st) => st.label === name)).toHaveLength(2);
			}
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
			for (const name of ANCHOR_STRETCHES.ankles) {
				const steps = holds(s).filter((st) => st.label === name);
				expect(steps, `${s.title}: ${name}`).toHaveLength(2);
			}
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
						// One add per step: the ledger splits the step's seconds across
						// every target the stretch names.
						addHoldDose(totals, st.label, st.durationSec ?? 0);
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
});

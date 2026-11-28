import { describe, expect, it } from 'vitest';
import { GOAL_PROFILES } from '../goal-profiles';
import { generatePlan } from './engine';
import {
	buildStrengthCircuit,
	compositionTitle,
	findMove,
	planSeed,
	strengthTierOf,
} from './catalog';
import { leanFocusLabel } from './strength-focus';
import type { MovePattern } from './machines';
import type { PlannedSession, PlanInput } from './types';

const marathon = GOAL_PROFILES.find((p) => p.slug === 'marathon')!;

/** The lower-body spine every strength session keeps (research/wave-7/17a). */
const SPINE: MovePattern[] = ['squat', 'hinge', 'knee-flexion', 'calf'];

const base: PlanInput = {
	profile: marathon,
	availableDays: [0, 1, 2, 3, 4, 5, 6],
	startDate: '2026-12-01',
	targetDate: '2027-06-01',
	baseline: { experience: 'intermediate', equipment: 'machines', sessionMinutes: 60 },
};

const movesOf = (s: PlannedSession): string[] =>
	(s.prescription.blocks ?? []).flatMap((b) => (b.machine ? [b.machine] : []));
const patternsOf = (s: PlannedSession): (MovePattern | undefined)[] =>
	movesOf(s).map((name) => findMove(name)?.pattern);
const strengthOf = (input: PlanInput): PlannedSession[] =>
	generatePlan(input)
		.weeks.flatMap((w) => w.sessions)
		.filter((s) => s.modality === 'strength');
const coversSpine = (s: PlannedSession) => {
	const patterns = new Set(patternsOf(s));
	return SPINE.every((p) => patterns.has(p));
};

describe('strength variety: composition', () => {
	it('keeps the lower-body spine in every strength session', () => {
		for (const s of strengthOf(base)) {
			expect(coversSpine(s), `session on day ${s.day} misses the spine`).toBe(true);
		}
	});

	it('labels every session by the equipment tiers its moves are actually made of', () => {
		for (const s of strengthOf(base)) {
			const moves = movesOf(s).map((n) => findMove(n)!);
			expect(s.title).toBe(compositionTitle(moves));
			// One tier reads "<Tier> circuit" and a blend reads the mixed wording.
			const tiers = new Set(moves.map((m) => strengthTierOf(m)));
			if (tiers.size === 1) expect(s.title).toMatch(/circuit$/);
			else if (tiers.size >= 3) expect(s.title).toBe('Mixed circuit');
		}
	});

	it('derives the composition title from the tiers, not the mode', () => {
		const legPress = findMove('Leg press')!;
		const goblet = findMove('Goblet squat')!;
		const squat = findMove('Bodyweight squat')!;
		expect(compositionTitle([legPress, goblet])).toBe('Machine and Dumbbell circuit');
		expect(compositionTitle([squat])).toBe('Bodyweight circuit');
		expect(compositionTitle([legPress, goblet, squat])).toBe('Mixed circuit');
	});
});

describe('strength variety: rotation', () => {
	const plan = generatePlan(base);
	const sessions = plan.weeks
		.flatMap((w) => w.sessions)
		.filter((s) => s.modality === 'strength');

	it('never repeats a move inside the recent-session window where the pool allows it', () => {
		// The machine tier gives every spine pattern at least four moves, so the
		// window of three holds for the spine. A move used in one session must not
		// come back in either of the next two.
		for (let i = 0; i < sessions.length; i++) {
			const usedHere = movesOf(sessions[i]!);
			for (let j = i + 1; j < Math.min(i + 3, sessions.length); j++) {
				for (const name of movesOf(sessions[j]!)) {
					const move = findMove(name)!;
					if (!SPINE.includes(move.pattern)) continue;
					expect(
						usedHere.includes(name),
						`${name} repeated within three sessions at ${i} vs ${j}`,
					).toBe(false);
				}
			}
		}
	});

	it('changes week to week by at least two moves across the same session shape', () => {
		const byWeek = plan.weeks.map((w) =>
			w.sessions.filter((s) => s.modality === 'strength').flatMap(movesOf),
		);
		let compared = 0;
		for (let w = 1; w < byWeek.length; w++) {
			const prev = byWeek[w - 1]!;
			const cur = byWeek[w]!;
			if (prev.length === 0 || prev.length !== cur.length) continue;
			const changed =
				prev.filter((x) => !cur.includes(x)).length + cur.filter((x) => !prev.includes(x)).length;
			expect(changed, `week ${w + 1} barely changed from week ${w}`).toBeGreaterThanOrEqual(2);
			compared++;
		}
		expect(compared).toBeGreaterThan(0);
	});

	it('replays the same plan for the same seed and differs for another', () => {
		const a = generatePlan(base);
		const b = generatePlan({ ...base });
		expect(JSON.stringify(a.weeks)).toBe(JSON.stringify(b.weeks));
		const other = generatePlan({ ...base, seed: 987654 });
		const aMoves = a.weeks.flatMap((w) => w.sessions.filter((s) => s.modality === 'strength')).flatMap(movesOf);
		const oMoves = other.weeks.flatMap((w) => w.sessions.filter((s) => s.modality === 'strength')).flatMap(movesOf);
		expect(oMoves).not.toEqual(aMoves);
	});

	it('derives a stable plan seed from the runner and start date, different per runner', () => {
		// Stable: the same runner and start date always give the same seed, so a
		// regeneration rebuilds the plan identically.
		expect(planSeed('runner-a', '2026-12-01')).toBe(planSeed('runner-a', '2026-12-01'));
		// Different runners, or a different start date, give a different seed.
		expect(planSeed('runner-a', '2026-12-01')).not.toBe(planSeed('runner-b', '2026-12-01'));
		expect(planSeed('runner-a', '2026-12-01')).not.toBe(planSeed('runner-a', '2026-12-08'));
	});

	it('walks each pattern so no circuit repeats within six weeks', () => {
		// Two strength sessions a week, so six weeks is twelve circuits. The
		// machine tier gives every spine pattern a pool of four or more, and the
		// walking cursor cycles a pattern's order before a move comes back, so a
		// whole circuit does not recur inside the window.
		const twoDay: PlanInput = { ...base, baseline: { ...base.baseline, strengthDays: 2 } };
		const circuits = strengthOf(twoDay).map((s) => movesOf(s).join('|'));
		const window = 12;
		expect(circuits.length).toBeGreaterThan(window);
		for (let i = 0; i < circuits.length; i++) {
			for (let j = i + 1; j < Math.min(i + window, circuits.length); j++) {
				expect(circuits[i], `circuit repeated at session ${i} and ${j}`).not.toBe(circuits[j]);
			}
		}
	});

	it('picks deterministically from a seed and differently from another seed', () => {
		const one = buildStrengthCircuit({ mode: 'machines', minutes: 60, level: 'intermediate', seed: 42 });
		const same = buildStrengthCircuit({ mode: 'machines', minutes: 60, level: 'intermediate', seed: 42 });
		const two = buildStrengthCircuit({ mode: 'machines', minutes: 60, level: 'intermediate', seed: 43 });
		expect(one.map((m) => m.name)).toEqual(same.map((m) => m.name));
		expect(one.map((m) => m.name)).not.toEqual(two.map((m) => m.name));
	});

	it('keeps the spine order and rotates the spine exercise within its pattern', () => {
		const squats = new Set<string>();
		for (let week = 0; week < 8; week++) {
			const circuit = buildStrengthCircuit({
				mode: 'machines',
				minutes: 60,
				level: 'intermediate',
				seed: week,
			});
			expect(circuit.slice(0, 4).map((m) => m.pattern)).toEqual(SPINE);
			squats.add(circuit[0]!.name);
		}
		// The squat slot is not one fixed machine across weeks.
		expect(squats.size).toBeGreaterThan(1);
	});
});

describe('strength variety: the lean pill', () => {
	const plan = generatePlan(base);

	it('names the lean as up to three body parts, or full body when there is no lean', () => {
		for (const s of strengthOf(base)) {
			const focus = s.prescription.focus;
			if (focus) {
				if (focus === 'full body') continue;
				const parts = focus.split(' + ');
				expect(parts.length).toBeLessThanOrEqual(3);
				for (const part of parts) {
					expect(part).toMatch(/^(quads|hamstrings|glutes|calves|adductors|hips|core|chest|back|shoulders|arms)$/);
				}
			}
		}
		void plan;
	});

	it('matches the lean: a legs day shows lower-body parts, an upper day shows upper ones', () => {
		const legs = buildStrengthCircuit({
			mode: 'machines',
			minutes: 60,
			level: 'intermediate',
			seed: 7,
			focus: { id: 'legs', label: 'legs and hips', title: 'Leg day', patterns: ['squat', 'hinge', 'knee-flexion', 'calf', 'knee-extension', 'push', 'core', 'squat'] },
		});
		const label = leanFocusLabel('legs', legs);
		expect(label).toMatch(/quads|hamstrings|glutes|calves|adductors|hips/);
		expect(label).not.toMatch(/core|chest|back|shoulders|arms/);

		const upper = buildStrengthCircuit({
			mode: 'machines',
			minutes: 60,
			level: 'intermediate',
			seed: 7,
			focus: { id: 'upper-core', label: 'upper body and core', title: 'Upper body day', patterns: ['squat', 'hinge', 'knee-flexion', 'calf', 'core', 'push', 'squat', 'pull'] },
		});
		const upperLabel = leanFocusLabel('upper-core', upper);
		expect(upperLabel).toMatch(/core|chest|back|shoulders|arms/);
		expect(upperLabel).not.toMatch(/quads|hamstrings|glutes|calves|adductors|hips/);

		expect(leanFocusLabel(null, legs)).toBe('full body');
	});
});

describe('strength variety: within-phase progression', () => {
	const BANDS: Record<string, [number, number]> = {
		base: [10, 12],
		build: [8, 10],
		peak: [6, 8],
	};

	it('ramps reps across a phase and resets at the phase change', () => {
		const plan = generatePlan(base);
		for (const [phase, [lo, hi]] of Object.entries(BANDS)) {
			const weeks = plan.weeks.filter((w) => w.phase === phase);
			if (!weeks.length) continue;
			const reps = weeks.map((w) => {
				const s = w.sessions.find((x) => x.modality === 'strength')!;
				return s.prescription.blocks![0]!.sets[0]!.reps;
			});
			// Every week sits in the phase's band, and the reps never fall inside it.
			for (const r of reps) {
				expect(r).toBeGreaterThanOrEqual(lo);
				expect(r).toBeLessThanOrEqual(hi);
			}
			for (let i = 1; i < reps.length; i++) {
				expect(reps[i]).toBeGreaterThanOrEqual(reps[i - 1]!);
			}
			if (reps.length > 1) expect(reps[reps.length - 1]!).toBeGreaterThan(reps[0]!);
		}
	});

	it('drifts RPE up across a phase by a point', () => {
		const plan = generatePlan(base);
		const baseWeeks = plan.weeks.filter((w) => w.phase === 'base');
		if (baseWeeks.length > 1) {
			const first = baseWeeks[0]!.sessions.find((s) => s.modality === 'strength')!;
			const last = baseWeeks[baseWeeks.length - 1]!.sessions.find((s) => s.modality === 'strength')!;
			expect(first.prescription.targetRpe![0]).toBe(6);
			expect(last.prescription.targetRpe![0]).toBe(7);
		}
	});
});

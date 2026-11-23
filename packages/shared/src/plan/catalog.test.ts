import { describe, expect, it } from 'vitest';
import { ALL_MOVES, circuitFor, findMove, moveCategory } from './catalog';
import { COOLDOWN_STRETCHES, EXTRA_STRETCHES, WARMUP_DRILLS } from './mobility';
import { DYNAMIC_DRILLS, RECOVERY_DRILLS, STRETCHES, findDrill } from './stretches';
import { WORKOUT_LIBRARY } from './library';

describe('exercise catalog', () => {
	it('has no duplicate move names, so lookups cannot hit the wrong entry', () => {
		const seen = new Set<string>();
		for (const m of ALL_MOVES) {
			const key = m.name.toLowerCase();
			expect(seen.has(key), `duplicate move: ${m.name}`).toBe(false);
			seen.add(key);
		}
	});

	it('resolves every strength move named in a workout, so the drilldown never breaks', () => {
		for (const w of WORKOUT_LIBRARY) {
			if (w.modality !== 'strength') continue;
			for (const b of w.workout.blocks) {
				for (const s of b.steps) {
					if (s.kind === 'work') {
						expect(
							findMove(s.label),
							`${w.id} references an unknown move: ${s.label}`,
						).toBeTruthy();
					}
				}
			}
		}
	});
});

describe('drill catalog', () => {
	it('has no duplicate drill names across every library', () => {
		const all = [
			...WARMUP_DRILLS,
			...COOLDOWN_STRETCHES,
			...EXTRA_STRETCHES,
			...STRETCHES,
			...DYNAMIC_DRILLS,
			...RECOVERY_DRILLS,
		];
		const seen = new Set<string>();
		for (const d of all) {
			const key = d.name.toLowerCase();
			expect(seen.has(key), `duplicate drill: ${d.name}`).toBe(false);
			seen.add(key);
		}
	});

	it('resolves a stretch, a dynamic drill and a recovery drill by name', () => {
		expect(findDrill('Standing hamstring stretch')?.durationSec).toBeGreaterThan(0);
		expect(findDrill('Hip circles')).toBeTruthy();
		expect(findDrill('Foam roll calves')).toBeTruthy();
	});
});

describe('circuitFor', () => {
	it('draws moves from the chosen equipment', () => {
		expect(circuitFor('kettlebell', 45).some((m) => m.equipment === 'kettlebell')).toBe(true);
		expect(
			circuitFor('bands', 45).some((m) => m.equipment === 'bands' || m.equipment === 'home'),
		).toBe(true);
	});

	it('balances patterns and avoids duplicates', () => {
		const c = circuitFor('machines', 60);
		const names = c.map((m) => m.name);
		expect(new Set(names).size).toBe(names.length);
		expect(new Set(c.map((m) => m.pattern)).size).toBeGreaterThanOrEqual(3);
	});

	it('narrows to the equipment the runner actually has', () => {
		for (const m of circuitFor('full-gym', 45, ['bands'])) {
			const cat = moveCategory(m);
			expect(cat === 'bodyweight' || cat === 'bands').toBe(true);
		}
	});

	it('keeps advanced progressions out of a beginner circuit', () => {
		expect(
			circuitFor('bodyweight', 60, undefined, false, 'beginner').some(
				(m) => m.level === 'advanced',
			),
		).toBe(false);
	});
});

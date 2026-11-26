import { describe, expect, it } from 'vitest';
import { ALL_MOVES, circuitFor, findMove, focusFor, moveCategory, strengthShape } from './catalog';
import { PF_MACHINES } from './machines';
import { GYM_PRESETS } from './gyms';
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

describe('strength focus rotation', () => {
	it('gives one strength day a full-body circuit and splits two days into legs and upper body', () => {
		expect(focusFor(0, 1)).toBeNull();
		expect(focusFor(0, 2)?.id).toBe('legs');
		expect(focusFor(1, 2)?.id).toBe('upper');
	});

	it('rotates legs, push, pull and core across three or more days', () => {
		expect([0, 1, 2].map((i) => focusFor(i, 3)?.id)).toEqual(['legs', 'upper-push', 'upper-pull']);
		expect([0, 1, 2, 3].map((i) => focusFor(i, 4)?.id)).toEqual([
			'legs',
			'upper-push',
			'upper-pull',
			'core',
		]);
	});

	it('leans the circuit on the focus and rotates the move by the variant', () => {
		const lower = new Set(['squat', 'hinge', 'knee-extension', 'posterior-chain']);
		const legs = circuitFor(
			'machines',
			45,
			undefined,
			false,
			'intermediate',
			undefined,
			undefined,
			focusFor(0, 3),
			0,
		);
		const legsNext = circuitFor(
			'machines',
			45,
			undefined,
			false,
			'intermediate',
			undefined,
			undefined,
			focusFor(0, 3),
			1,
		);
		// The legs focus draws mostly lower-body patterns.
		expect(legs.filter((m) => lower.has(m.pattern)).length).toBeGreaterThanOrEqual(4);
		// A different variant picks a different circuit, so the same squat is not
		// chosen every time.
		expect(legsNext.map((m) => m.name)).not.toEqual(legs.map((m) => m.name));
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

describe('circuitFor filters and phasing', () => {
	const FREE = new Set(['dumbbells', 'barbell', 'kettlebell', 'bands']);

	it('never shows equipment the runner does not have', () => {
		for (const m of circuitFor('machines', 45, ['bands'])) {
			const cat = moveCategory(m);
			expect(cat === 'bodyweight' || cat === 'bands').toBe(true);
		}
	});

	it('narrows machines to the ones the runner has', () => {
		for (const m of circuitFor('machines', 60, undefined, false, 'intermediate', ['Leg press'])) {
			if (moveCategory(m) === 'machines') expect(m.name).toBe('Leg press');
		}
	});

	it('adds heavy free weights to a full gym only after the base phase', () => {
		const base = circuitFor('full-gym', 60, undefined, false, 'intermediate');
		expect(base.every((m) => !FREE.has(moveCategory(m) as string))).toBe(true);
		const later = circuitFor('full-gym', 60, undefined, true, 'intermediate');
		expect(later.some((m) => FREE.has(moveCategory(m) as string))).toBe(true);
	});
});

describe('strengthShape', () => {
	it('reads the moves, not the equipment mode', () => {
		expect(strengthShape(circuitFor('machines', 60))).toBe('machines');
		expect(strengthShape(circuitFor('bodyweight', 60))).toBe('bodyweight');
		// A machines-mode circuit with a kit that has no machines fills with
		// bodyweight, so it must not be reported as a machine circuit.
		expect(strengthShape(circuitFor('machines', 60, ['bands']))).toBe('bodyweight');
	});

	it('calls a blend mixed', () => {
		const legPress = findMove('Leg press')!;
		const squat = findMove('Bodyweight squat')!;
		expect(strengthShape([legPress, squat])).toBe('mixed');
		expect(strengthShape([])).toBe('mixed');
	});
});

describe('gym presets', () => {
	it('reference real catalog moves, with unique ids', () => {
		const ids = GYM_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const p of GYM_PRESETS) {
			for (const name of p.machines) {
				expect(findMove(name), `${p.id} references an unknown machine: ${name}`).toBeTruthy();
			}
		}
	});

	it('reference the machine catalog directly, so a preset name is always a machine', () => {
		// Every name a preset lists has to be an entry in the machine catalog, not
		// a bodyweight or free-weight move that happens to share the name.
		const catalog = new Set(PF_MACHINES.map((m) => m.name));
		for (const p of GYM_PRESETS) {
			for (const name of p.machines) {
				expect(catalog.has(name), `${p.id} lists a non-machine: ${name}`).toBe(true);
			}
		}
	});
});

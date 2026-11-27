import { describe, expect, it } from 'vitest';
import { ALL_MOVES, circuitFor, findMove, focusFor, moveCategory, strengthShape } from './catalog';
import { PF_MACHINES, type MovePattern } from './machines';
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

describe('strength focus lean', () => {
	const SPINE: MovePattern[] = ['squat', 'hinge', 'knee-flexion', 'calf'];

	it('keeps one strength day full-body and leans both days of a two-day week on legs', () => {
		expect(focusFor(0, 1)).toBeNull();
		expect(focusFor(0, 2)?.id).toBe('legs');
		expect(focusFor(1, 2)?.id).toBe('legs');
	});

	it('leans two of three days on legs and one on upper body and core', () => {
		expect([0, 1, 2].map((i) => focusFor(i, 3)?.id)).toEqual(['legs', 'legs', 'upper-core']);
		expect([0, 1, 2, 3].map((i) => focusFor(i, 4)?.id)).toEqual([
			'legs',
			'legs',
			'upper-core',
			'legs',
		]);
	});

	it('carries the whole lower-body spine in the bodyweight and band pools', () => {
		// The spine promises knee flexion, so every pool a session can be built
		// from must carry a knee-flexion move at the level's rung; otherwise the
		// slot falls back to the next unused move in pool order.
		for (const mode of ['bodyweight', 'bands', 'bodyweight-dumbbells'] as const) {
			const circuit = circuitFor(
				mode,
				undefined,
				undefined,
				false,
				'beginner',
				undefined,
				undefined,
				focusFor(0, 2),
				0,
			);
			const patterns = new Set(circuit.map((m) => m.pattern));
			for (const p of SPINE) {
				expect(patterns.has(p), `${mode} circuit misses ${p}`).toBe(true);
			}
		}
	});

	it('runs the lower-body spine first, so a short session cuts the accessory before a spine move', () => {
		// A 30-minute legs-lean session is all lower body: the spine and the
		// lean's extra move fill it, and no accessory takes a slot.
		const short = circuitFor(
			'machines',
			30,
			undefined,
			false,
			'intermediate',
			undefined,
			undefined,
			focusFor(0, 2),
			0,
		);
		expect(short.map((m) => m.pattern)).toEqual([...SPINE, 'knee-extension']);
		// A short session with no lean keeps one accessory after the spine.
		const plain = circuitFor('machines', 30);
		expect(plain.slice(0, 4).map((m) => m.pattern)).toEqual(SPINE);
	});

	it('leans the circuit on the focus and rotates the move by the variant', () => {
		const lower = new Set([...SPINE, 'knee-extension']);
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
		// The legs-lean day draws mostly lower-body patterns: at the default
		// circuit size five of six moves are lower body, one accessory.
		expect(legs.filter((m) => lower.has(m.pattern)).length).toBe(5);
		expect(legs.some((m) => m.pattern === 'push' || m.pattern === 'pull')).toBe(true);
		// A different variant picks a different circuit, so the same squat is not
		// chosen every time.
		expect(legsNext.map((m) => m.name)).not.toEqual(legs.map((m) => m.name));
	});

	it('keeps the upper-body accessories last, so the legs still carry the session', () => {
		const upper = circuitFor(
			'machines',
			45,
			undefined,
			false,
			'intermediate',
			undefined,
			undefined,
			focusFor(2, 3),
			2,
		);
		const patterns = upper.map((m) => m.pattern);
		// The spine leads, then the core and push accessories.
		expect(patterns.slice(0, 4)).toEqual(SPINE);
		expect(patterns.slice(4)).toEqual(['core', 'push']);
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

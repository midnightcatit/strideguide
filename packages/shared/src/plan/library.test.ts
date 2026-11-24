import { describe, expect, it } from 'vitest';
import { findMove } from './catalog';
import { WORKOUT_LIBRARY } from './library';

describe('workout library', () => {
	it('has unique ids, so a session lookup by id cannot hit the wrong workout', () => {
		const seen = new Set<string>();
		for (const w of WORKOUT_LIBRARY) {
			expect(w.id, 'a workout is missing an id').toBeTruthy();
			expect(seen.has(w.id), `duplicate workout id: ${w.id}`).toBe(false);
			seen.add(w.id);
		}
	});

	it('resolves every exercise named in a strength workout, so the drilldown never breaks', () => {
		for (const w of WORKOUT_LIBRARY) {
			if (w.modality !== 'strength') continue;
			for (const b of w.workout.blocks) {
				for (const s of b.steps) {
					if (s.kind !== 'work') continue;
					expect(
						findMove(s.label),
						`${w.id} references an unknown move: ${s.label}`,
					).toBeTruthy();
				}
			}
		}
	});

	it('gives every workout the copy and structure the detail view needs', () => {
		for (const w of WORKOUT_LIBRARY) {
			expect(w.title.trim().length, `${w.id} has no title`).toBeGreaterThan(0);
			expect(w.summary.trim().length, `${w.id} has no summary`).toBeGreaterThan(0);
			expect(w.purpose.trim().length, `${w.id} has no purpose`).toBeGreaterThan(0);
			expect(w.durationMin, `${w.id} has no duration`).toBeGreaterThan(0);
			expect(w.refs.length, `${w.id} cites no research`).toBeGreaterThan(0);
			expect(w.workout.blocks.length, `${w.id} has no blocks`).toBeGreaterThan(0);
			for (const b of w.workout.blocks) {
				expect(b.repeat, `${w.id} has a block with repeat below 1`).toBeGreaterThanOrEqual(1);
				expect(b.steps.length, `${w.id} has an empty block`).toBeGreaterThan(0);
			}
		}
	});
});

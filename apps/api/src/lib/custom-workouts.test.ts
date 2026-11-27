import { describe, expect, it } from 'vitest';
import {
	CUSTOM_WORKOUT_LIMITS,
	validateCustomWorkout,
	type CustomWorkout,
	type CustomWorkoutDraft,
} from '@strideguide/shared';
import { DEFAULT_PREFS } from '@strideguide/shared/units';
import {
	changeStoredWorkouts,
	createCustomWorkout,
	customWorkoutDraftSchema,
	deleteCustomWorkout,
	readCustomWorkouts,
	updateCustomWorkout,
	type PrefsStore,
} from './custom-workouts';

/** A minimal valid draft; each test bends one part of it. */
function draft(name = 'Leg day'): CustomWorkoutDraft {
	return {
		name,
		category: 'strength',
		sections: {
			warmup: { items: [{ kind: 'mobility', ref: 'Hip circles', durationSec: 30 }] },
			main: { items: [{ kind: 'strength', ref: 'Leg press', sets: 3, reps: 10 }] },
			cooldown: {
				items: [{ kind: 'mobility', ref: 'Standing straight-knee calf stretch', durationSec: 40 }],
			},
		},
	};
}

describe('custom workout store', () => {
	it('carries a create, list, update and delete round trip on the prefs', () => {
		const prefs = { ...DEFAULT_PREFS };

		const created = createCustomWorkout(prefs, draft(), 'w1', '2026-11-27T00:00:00.000Z');
		expect(created.ok).toBe(true);
		if (!created.ok || !created.workout) throw new Error('unreachable');
		expect(created.workout).toMatchObject({ id: 'w1', name: 'Leg day', category: 'strength' });
		expect(created.workout.createdAt).toBe(created.workout.updatedAt);

		expect(readCustomWorkouts(created.prefs)).toHaveLength(1);

		const updated = updateCustomWorkout(
			created.prefs,
			'w1',
			draft('Heavy leg day'),
			'2026-11-28T00:00:00.000Z',
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok || !updated.workout) throw new Error('unreachable');
		expect(updated.workout.name).toBe('Heavy leg day');
		expect(updated.workout.createdAt).toBe('2026-11-27T00:00:00.000Z');
		expect(updated.workout.updatedAt).toBe('2026-11-28T00:00:00.000Z');

		const removed = deleteCustomWorkout(updated.prefs, 'w1');
		expect(removed.ok).toBe(true);
		expect(readCustomWorkouts(removed.ok ? removed.prefs : null)).toEqual([]);
	});

	it('keeps the other prefs keys while the workouts change', () => {
		const prefs = { ...DEFAULT_PREFS, units: 'metric' as const, favoriteMachines: ['Leg press'] };
		const created = createCustomWorkout(prefs, draft(), 'w1', 'now');
		expect(created.ok).toBe(true);
		if (!created.ok) throw new Error('unreachable');
		expect(created.prefs.units).toBe('metric');
		expect(created.prefs.favoriteMachines).toEqual(['Leg press']);
	});

	it('refuses an update or delete for a workout that is not there', () => {
		const missing = updateCustomWorkout({ ...DEFAULT_PREFS }, 'nope', draft(), 'now');
		expect(missing.ok).toBe(false);
		const removed = deleteCustomWorkout({ ...DEFAULT_PREFS }, 'nope');
		expect(removed.ok).toBe(false);
	});

	it('caps the workouts one runner can keep', () => {
		let prefs = { ...DEFAULT_PREFS };
		for (let i = 0; i < CUSTOM_WORKOUT_LIMITS.maxWorkouts; i += 1) {
			const result = createCustomWorkout(prefs, draft(`Workout ${i}`), `w${i}`, 'now');
			if (!result.ok) throw new Error('unreachable');
			prefs = result.prefs;
		}
		const over = createCustomWorkout(prefs, draft('One too many'), 'w-over', 'now');
		expect(over.ok).toBe(false);
	});
});

describe('customWorkoutDraftSchema', () => {
	it('parses a well-formed draft', () => {
		const parsed = customWorkoutDraftSchema.parse(draft());
		expect(parsed.category).toBe('strength');
	});

	it('rejects a section with no items and an empty name', () => {
		const empty = draft();
		empty.sections.warmup = { items: [], note: 'Just a line of text.' };
		expect(customWorkoutDraftSchema.safeParse(empty).success).toBe(false);
		expect(customWorkoutDraftSchema.safeParse(draft('')).success).toBe(false);
	});

	it('rejects dose fields outside their bounds', () => {
		const manySets = draft();
		manySets.sections.main = { items: [{ kind: 'strength', ref: 'Leg press', sets: 21, reps: 10 }] };
		expect(customWorkoutDraftSchema.safeParse(manySets).success).toBe(false);
		const longNote = draft();
		longNote.sections.main.note = 'x'.repeat(CUSTOM_WORKOUT_LIMITS.maxNoteLen + 1);
		expect(customWorkoutDraftSchema.safeParse(longNote).success).toBe(false);
	});

	it('sends a payload that outruns the step cap to the shared validator, which refuses it', () => {
		// The backlog regression: 30 items of 20 sets each passes every per-field
		// bound, and would convert to 600 steps in one block. The set-sum check is
		// what keeps such a workout from ever being stored.
		const monster = draft('Too many sets');
		monster.sections.main = {
			items: Array.from({ length: CUSTOM_WORKOUT_LIMITS.maxItemsPerSection }, () => ({
				kind: 'strength' as const,
				ref: 'Leg press',
				sets: 20,
				reps: 10,
			})),
		};
		expect(customWorkoutDraftSchema.safeParse(monster).success).toBe(true);
		expect(validateCustomWorkout(monster).some((p) => p.includes('step limit'))).toBe(true);
	});
});

describe('changeStoredWorkouts', () => {
	it('re-reads and retries when another write lands first, so neither workout is lost', async () => {
		// A store that lets a second writer land between the read and the guarded
		// write once, then guards every write on the text it last read.
		let stored: string | null = null;
		let raced = false;
		const theirs: CustomWorkout = {
			...draft('Theirs'),
			id: 'theirs',
			createdAt: 'x',
			updatedAt: 'x',
		};
		const store: PrefsStore = {
			read: async () => stored,
			write: async (_userId, next, expected) => {
				if (!raced) {
					raced = true;
					stored = JSON.stringify({ ...DEFAULT_PREFS, customWorkouts: [theirs] });
					return false;
				}
				if (stored !== expected) return false;
				stored = next;
				return true;
			},
		};
		const outcome = await changeStoredWorkouts(store, 'u1', (prefs) =>
			createCustomWorkout(prefs, draft('Mine'), 'mine', 'now'),
		);
		expect(outcome.kind).toBe('ok');
		const saved = JSON.parse(stored ?? '{}') as { customWorkouts: { id: string }[] };
		expect(saved.customWorkouts.map((w) => w.id).sort()).toEqual(['mine', 'theirs']);
	});

	it('gives up with a conflict once the retries run out', async () => {
		const store: PrefsStore = {
			read: async () => null,
			write: async () => false,
		};
		const outcome = await changeStoredWorkouts(store, 'u1', (prefs) =>
			createCustomWorkout(prefs, draft(), 'w1', 'now'),
		);
		expect(outcome.kind).toBe('conflict');
	});
});

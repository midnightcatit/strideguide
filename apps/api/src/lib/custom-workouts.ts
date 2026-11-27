import { z } from 'zod';
import {
	CUSTOM_WORKOUT_CATEGORIES,
	CUSTOM_WORKOUT_LIMITS,
	type CustomWorkout,
	type CustomWorkoutDraft,
} from '@strideguide/shared';
import type { Prefs } from '@strideguide/shared/units';

/**
 * The request shape for a runner-built custom workout, and the pure store
 * helpers for the workouts on the profile. The workouts live in the
 * settings.prefs JSON next to the favorites, so there is no table of their own;
 * the guarded read-modify-write of the prefs column lives in prefs-store.ts.
 * Every string and list is bounded here, and the reference checks run through
 * validateCustomWorkout in the shared package.
 */

const itemSchema = z.object({
	kind: z.enum(['strength', 'mobility', 'run']),
	ref: z.string().trim().min(1).max(CUSTOM_WORKOUT_LIMITS.maxRefLen),
	sets: z.number().int().min(1).max(20).optional(),
	reps: z.number().int().min(1).max(500).optional(),
	durationSec: z.number().int().min(1).max(7200).optional(),
	distanceKm: z.number().min(0.1).max(200).optional(),
	note: z.string().max(CUSTOM_WORKOUT_LIMITS.maxNoteLen).optional(),
});

const sectionSchema = z.object({
	items: z.array(itemSchema).min(1).max(CUSTOM_WORKOUT_LIMITS.maxItemsPerSection),
	note: z.string().max(CUSTOM_WORKOUT_LIMITS.maxNoteLen).optional(),
});

export const customWorkoutDraftSchema = z.object({
	name: z.string().trim().min(1).max(CUSTOM_WORKOUT_LIMITS.maxNameLen),
	category: z.enum(CUSTOM_WORKOUT_CATEGORIES),
	sections: z.object({
		warmup: sectionSchema,
		main: sectionSchema,
		cooldown: sectionSchema,
	}),
});

/** The runner's own workouts as stored, empty when they have none. */
export function readCustomWorkouts(prefs: Prefs | null | undefined): CustomWorkout[] {
	return Array.isArray(prefs?.customWorkouts) ? prefs.customWorkouts : [];
}

export type CustomWorkoutStoreResult =
	| { ok: true; prefs: Prefs; workout?: CustomWorkout }
	| { ok: false; error: string };

/** Add one workout to the runner's list, newest last. */
export function createCustomWorkout(
	prefs: Prefs,
	draft: CustomWorkoutDraft,
	id: string,
	now: string,
): CustomWorkoutStoreResult {
	const list = readCustomWorkouts(prefs);
	if (list.length >= CUSTOM_WORKOUT_LIMITS.maxWorkouts) {
		return {
			ok: false,
			error: `You can keep ${CUSTOM_WORKOUT_LIMITS.maxWorkouts} custom workouts. Delete one to make room.`,
		};
	}
	const workout: CustomWorkout = { ...draft, id, createdAt: now, updatedAt: now };
	return { ok: true, prefs: { ...prefs, customWorkouts: [...list, workout] }, workout };
}

/** Replace one workout's fields, keeping its id and created time. */
export function updateCustomWorkout(
	prefs: Prefs,
	id: string,
	draft: CustomWorkoutDraft,
	now: string,
): CustomWorkoutStoreResult {
	const list = readCustomWorkouts(prefs);
	const index = list.findIndex((w) => w.id === id);
	if (index === -1) return { ok: false, error: 'That custom workout is not in your list.' };
	const previous = list[index]!;
	const workout: CustomWorkout = { ...draft, id, createdAt: previous.createdAt, updatedAt: now };
	const workouts = [...list];
	workouts[index] = workout;
	return { ok: true, prefs: { ...prefs, customWorkouts: workouts }, workout };
}

/** Remove one workout from the runner's list. */
export function deleteCustomWorkout(prefs: Prefs, id: string): CustomWorkoutStoreResult {
	const list = readCustomWorkouts(prefs);
	if (!list.some((w) => w.id === id)) {
		return { ok: false, error: 'That custom workout is not in your list.' };
	}
	return { ok: true, prefs: { ...prefs, customWorkouts: list.filter((w) => w.id !== id) } };
}

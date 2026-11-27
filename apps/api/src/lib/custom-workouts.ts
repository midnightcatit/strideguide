import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import {
	CUSTOM_WORKOUT_CATEGORIES,
	CUSTOM_WORKOUT_LIMITS,
	type CustomWorkout,
	type CustomWorkoutDraft,
} from '@strideguide/shared';
import { DEFAULT_PREFS, type Prefs } from '@strideguide/shared/units';

/**
 * The request shape for a runner-built custom workout, and the store that keeps
 * them on the profile. The workouts live in the settings.prefs JSON next to the
 * favorites, so there is no table of their own; these helpers do the array work
 * and the routes stay thin. Every string and list is bounded here, and the
 * reference checks run through validateCustomWorkout in the shared package.
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

/**
 * The two operations a guarded workout mutation needs: a raw text read of the
 * prefs column, and a compare-and-swap write that lands only while the stored
 * text still equals what the caller read. The raw text is deliberate: the guard
 * compares the stored JSON byte for byte, which a parsed value cannot do.
 */
export interface PrefsStore {
	read: (userId: string) => Promise<string | null>;
	write: (userId: string, nextPrefs: string, expectedText: string | null) => Promise<boolean>;
}

/** How many times a mutation re-reads and retries when another write lands first. */
const WRITE_ATTEMPTS = 3;

/**
 * The outcome of a guarded workout mutation. `refused` is the change's own
 * answer (the cap is full, or the workout is not there); `conflict` is the rare
 * case of losing every retry to concurrent writers.
 */
export type CustomWorkoutChange =
	| { kind: 'ok'; workout?: CustomWorkout }
	| { kind: 'refused'; error: string }
	| { kind: 'conflict' };

/**
 * Read the stored prefs, apply a pure change, and write the result back guarded
 * on the text that was read. D1 has no interactive transaction, so this is a
 * compare-and-swap: when another write lands between the read and the write, the
 * write changes nothing, the loop re-reads and retries, and no workout is lost.
 */
export async function changeStoredWorkouts(
	store: PrefsStore,
	userId: string,
	change: (prefs: Prefs) => CustomWorkoutStoreResult,
): Promise<CustomWorkoutChange> {
	for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt += 1) {
		const text = await store.read(userId);
		const result = change(storedPrefs(text));
		if (!result.ok) return { kind: 'refused', error: result.error };
		const wrote = await store.write(userId, JSON.stringify(result.prefs), text);
		if (wrote) return { kind: 'ok', workout: result.workout };
	}
	return { kind: 'conflict' };
}

/** Parse a stored prefs text, with the defaults behind an empty row. */
function storedPrefs(text: string | null): Prefs {
	if (!text) return { ...DEFAULT_PREFS };
	return { ...DEFAULT_PREFS, ...(JSON.parse(text) as Prefs) };
}

/** The D1-backed store: a raw text read and a guarded upsert on the prefs column. */
export function d1PrefsStore(db: D1Database): PrefsStore {
	return {
		read: async (userId) => {
			const row = await db
				.prepare('SELECT prefs FROM settings WHERE user_id = ?1')
				.bind(userId)
				.first<{ prefs: string | null }>();
			return row?.prefs ?? null;
		},
		write: async (userId, nextPrefs, expectedText) => {
			const result = await db
				.prepare(
					`INSERT INTO settings (user_id, prefs) VALUES (?1, ?2)
					 ON CONFLICT(user_id) DO UPDATE SET prefs = ?2
					 WHERE settings.prefs = ?3`,
				)
				.bind(userId, nextPrefs, expectedText)
				.run();
			return result.meta.changes > 0;
		},
	};
}

import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, type Prefs } from '@strideguide/shared/units';
import { createCustomWorkout } from './custom-workouts';
import { changeStoredPrefs, type PrefsStore } from './prefs-store';

/** A store that guards every write on the text it read, like the D1 upsert. */
function textStore(): { store: PrefsStore; text: () => string | null } {
	let stored: string | null = null;
	return {
		store: {
			read: async () => stored,
			write: async (_userId, next, expected) => {
				if (stored !== expected) return false;
				stored = next;
				return true;
			},
		},
		text: () => stored,
	};
}

const paint: Prefs['equipmentItems'] = ['dumbbells'];

describe('changeStoredPrefs', () => {
	it('keeps both writes when a plan prefs change races a workout save', async () => {
		// Every read waits until both writers have read, so both see the same
		// snapshot before either writes. That is the window the unguarded writers
		// lost a change in; the guard makes the one that lost the race re-read
		// and retry, so neither key is lost.
		const mem = textStore();
		let reads = 0;
		let release!: () => void;
		const bothRead = new Promise<void>((resolve) => {
			release = resolve;
		});
		const store: PrefsStore = {
			read: async () => {
				const value = mem.text();
				reads += 1;
				if (reads === 2) release();
				await bothRead;
				return value;
			},
			write: mem.store.write,
		};

		const plan = changeStoredPrefs(store, 'u1', (prefs) => ({
			ok: true,
			prefs: { ...prefs, equipmentItems: paint },
		}));
		const workout = changeStoredPrefs(store, 'u1', (prefs) =>
			createCustomWorkout(prefs, draft(), 'w1', 'now'),
		);
		const [first, second] = await Promise.all([plan, workout]);
		expect(first.kind).toBe('ok');
		expect(second.kind).toBe('ok');

		const saved = JSON.parse(mem.text() ?? '{}') as Prefs;
		expect(saved.equipmentItems).toEqual(paint);
		expect(saved.customWorkouts?.map((w) => w.id)).toEqual(['w1']);
	});

	it('gives up with a conflict once the retries run out', async () => {
		const store: PrefsStore = {
			read: async () => null,
			write: async () => false,
		};
		const outcome = await changeStoredPrefs(store, 'u1', (prefs) => ({
			ok: true,
			prefs: { ...prefs, equipmentItems: paint },
		}));
		expect(outcome.kind).toBe('conflict');
	});

	it('starts from the defaults when the runner has no settings row yet', async () => {
		const mem = textStore();
		const outcome = await changeStoredPrefs(mem.store, 'u1', (prefs) => ({
			ok: true,
			prefs: { ...prefs, equipmentItems: paint },
		}));
		expect(outcome.kind).toBe('ok');
		const saved = JSON.parse(mem.text() ?? '{}') as Prefs;
		expect(saved.units).toBe(DEFAULT_PREFS.units);
		expect(saved.equipmentItems).toEqual(paint);
	});
});

/** A minimal valid custom workout draft. */
function draft() {
	return {
		name: 'Leg day',
		category: 'strength' as const,
		sections: {
			warmup: { items: [{ kind: 'mobility' as const, ref: 'Hip circles', durationSec: 30 }] },
			main: { items: [{ kind: 'strength' as const, ref: 'Leg press', sets: 3, reps: 10 }] },
			cooldown: {
				items: [
					{ kind: 'mobility' as const, ref: 'Standing straight-knee calf stretch', durationSec: 40 },
				],
			},
		},
	};
}

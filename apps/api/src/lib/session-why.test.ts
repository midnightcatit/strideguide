import { expect, it } from 'vitest';
import type { WhyRephraseInput } from '@strideguide/shared/plan';
import type { Env } from '../env';
import type { Db } from '../db';
import { rephraseAndStore, rephraseSessionWhys, WHY_BATCH_SIZE } from './session-why';

/** A stub Env whose Workers AI binding is whatever the test hands it. */
function envWithAi(run: (model: unknown, opts: unknown) => Promise<unknown>): Env {
	return { AI: { run } } as unknown as Env;
}

/**
 * A fake db that records the rows the pass inserts into the error table and
 * answers the reads and writes the store step makes, so both the failure path and
 * the happy path run without a live D1.
 */
function fakeDb(args: {
	inserted: Record<string, unknown>[];
	selectRows?: { id: string; prescription: unknown }[];
}): Db {
	return {
		insert: () => ({
			values: async (row: Record<string, unknown>) => {
				args.inserted.push(row);
				return [];
			},
		}),
		select: () => ({
			from: () => ({ where: async () => args.selectRows ?? [] }),
		}),
		update: () => ({ set: () => ({ where: async () => [] }) }),
	} as unknown as Db;
}

const input: WhyRephraseInput = {
	day: 6,
	title: 'Long run',
	weekNumber: 1,
	phase: 'base',
	goalName: 'Marathon',
	reason: { role: "This is the week's anchor run, the longest run of the week." },
};

it('falls back when the model is unavailable and no key is set', async () => {
	const env = envWithAi(async () => {
		throw new Error('daily limit');
	});
	expect(await rephraseSessionWhys(env, [input])).toBeNull();
});

it('gates a reworded reply from a stubbed model', async () => {
	const env = envWithAi(async () => ({
		response: JSON.stringify([
			{ role: 'Your long run anchors the week, the longest run of the week.' },
		]),
	}));
	const out = await rephraseSessionWhys(env, [input]);
	expect(out?.[0]?.role).toBe('Your long run anchors the week, the longest run of the week.');
});

it('drops a line that adds a number the reason did not have', async () => {
	const env = envWithAi(async () => ({
		response: JSON.stringify([{ role: 'You have 3 easy days around this anchor run.' }]),
	}));
	const out = await rephraseSessionWhys(env, [input]);
	expect(out?.[0]).toBeUndefined();
});

it('returns null when the reply carries no array', async () => {
	const env = envWithAi(async () => ({ response: 'I cannot help with that.' }));
	expect(await rephraseSessionWhys(env, [input])).toBeNull();
});

/* --------------------------- batching and reporting ------------------------ */

/** The user message of a model call, so a stub can see how many sessions it holds. */
function userTextFrom(opts: unknown): string {
	const messages = (opts as { messages?: { role: string; content: string }[] })?.messages ?? [];
	return messages.find((m) => m.role === 'user')?.content ?? '';
}

/** The session rows the prompt embedded, read back out of the user message. */
function rowsFromUser(user: string): Record<string, unknown>[] {
	const start = user.indexOf('[');
	const end = user.lastIndexOf(']');
	return JSON.parse(user.slice(start, end + 1));
}

/** A reword the gate keeps: the same content words, a little more wording. */
function rewordLine(text: string): string {
	return `${text} Keep it steady.`;
}

/**
 * A stub that rewords every row, but mimics an oversized reply: once it is asked
 * for more sessions than the cap, it hands back a reply cut off before the
 * closing bracket, exactly as a reply past maxTokens does. It counts its calls.
 */
function batchStub(maxSessions: number) {
	let calls = 0;
	const run = async (_model: unknown, opts: unknown) => {
		calls++;
		const rows = rowsFromUser(userTextFrom(opts));
		const json = JSON.stringify(
			rows.map((row) => {
				const entry: Record<string, string> = {};
				for (const key of ['role', 'dayReason', 'planContext']) {
					const value = row[key];
					if (typeof value === 'string' && value) entry[key] = rewordLine(value);
				}
				return entry;
			}),
		);
		return { response: rows.length > maxSessions ? json.slice(0, -2) : json };
	};
	return { run, calls: () => calls };
}

it('rewords a plan far larger than one call can carry', async () => {
	// Before batching, all sessions went in one call, the reply ran past the model's
	// output cap, and the missing closing bracket read as no reply at all. A plan of
	// two batches now lands, one call per batch.
	const stub = batchStub(WHY_BATCH_SIZE);
	const env = envWithAi(stub.run);
	const inputs: WhyRephraseInput[] = Array.from({ length: WHY_BATCH_SIZE * 2 }, (_, i) => ({
		...input,
		title: `Session ${i}`,
	}));
	const out = await rephraseSessionWhys(env, inputs);
	expect(out).not.toBeNull();
	expect(out).toHaveLength(WHY_BATCH_SIZE * 2);
	expect(out!.every((row) => row?.role)).toBe(true);
	expect(stub.calls()).toBe(2);
});

it('records a plain failure row when the model is unreachable', async () => {
	const inserted: Record<string, unknown>[] = [];
	const env = envWithAi(async () => {
		throw new Error('daily limit');
	});
	await rephraseAndStore(env, fakeDb({ inserted }), [{ sessionId: 's1', input }], {
		userId: 'u1',
		path: '/api/plans/generate',
	});
	expect(inserted).toHaveLength(1);
	const row = inserted[0]!;
	expect(row.name).toBe('SessionWhyPass');
	expect(String(row.message)).toContain('stage=model');
	expect(row.userId).toBe('u1');
	expect(row.path).toBe('/api/plans/generate');
	// The record names the stage and counts only: no runner text.
	expect(JSON.stringify(row)).not.toContain('anchor');
});

it('records the gate as the stage when the reply keeps nothing', async () => {
	const inserted: Record<string, unknown>[] = [];
	const env = envWithAi(async () => ({
		response: JSON.stringify([
			{ role: "This is the week's anchor run, the longest run of the week." },
		]),
	}));
	await rephraseAndStore(env, fakeDb({ inserted }), [{ sessionId: 's1', input }], {
		userId: 'u1',
	});
	expect(inserted).toHaveLength(1);
	const row = inserted[0]!;
	expect(String(row.message)).toContain('stage=gate');
	expect(String(row.message)).toContain('unchanged=1');
	expect(JSON.stringify(row)).not.toContain('anchor');
});

it('writes no failure row when at least one reason lands', async () => {
	const inserted: Record<string, unknown>[] = [];
	const env = envWithAi(async () => ({
		response: JSON.stringify([
			{ role: 'Your long run anchors the week, the longest run of the week.' },
		]),
	}));
	const db = fakeDb({ inserted, selectRows: [{ id: 's1', prescription: { whyStructured: {} } }] });
	await rephraseAndStore(env, db, [{ sessionId: 's1', input }], { userId: 'u1' });
	expect(inserted).toHaveLength(0);
});

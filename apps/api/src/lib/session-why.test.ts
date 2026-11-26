import { expect, it } from 'vitest';
import type { WhyRephraseInput } from '@strideguide/shared/plan';
import type { Env } from '../env';
import { rephraseSessionWhys } from './session-why';

/** A stub Env whose Workers AI binding is whatever the test hands it. */
function envWithAi(run: (model: unknown, opts: unknown) => Promise<unknown>): Env {
	return { AI: { run } } as unknown as Env;
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

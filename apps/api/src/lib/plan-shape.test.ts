import { expect, it } from 'vitest';
import type { Env } from '../env';
import { shapePlan, type ShapeContext } from './plan-shape';

/** A stub Env whose Workers AI binding is whatever the test hands it. */
function envWithAi(run: (model: unknown, opts: unknown) => Promise<unknown>): Env {
	return { AI: { run } } as unknown as Env;
}

/** A stub Env that answers with the given text. */
function envResponding(text: string): Env {
	return envWithAi(async () => ({ response: text }));
}

const ctx: ShapeContext = {
	goalName: 'Marathon',
	allowed: ['tempo', 'hills', 'interval', 'race-pace'],
	prefs: { units: 'metric' },
	weeks: [
		{ weekNumber: 1, phase: 'base', volumeKm: 30, strengthDays: 2, mobilityDays: 1 },
		{ weekNumber: 2, phase: 'build', volumeKm: 33, strengthDays: 2, mobilityDays: 1 },
	],
};

it('keeps the strength and mobility intents the model chose', async () => {
	const shapes = await shapePlan(
		envResponding(
			JSON.stringify([
				{
					qualityKind: 'tempo',
					volumeIntent: 'build',
					strengthIntent: 'build',
					mobilityIntent: 'ease',
					emphasis: 'Open easy, one steady tempo.',
				},
				{
					qualityKind: 'hills',
					volumeIntent: 'hold',
					strengthIntent: 'hold',
					mobilityIntent: 'build',
				},
			]),
		),
		ctx,
	);
	expect(shapes).not.toBeNull();
	expect(shapes![0]).toMatchObject({
		qualityKind: 'tempo',
		volumeIntent: 'build',
		strengthIntent: 'build',
		mobilityIntent: 'ease',
	});
	expect(shapes![1]).toMatchObject({ strengthIntent: 'hold', mobilityIntent: 'build' });
});

it('drops a strength or mobility intent outside the closed set and keeps the rest', async () => {
	const shapes = await shapePlan(
		envResponding(
			JSON.stringify([
				{ strengthIntent: 'heavier', mobilityIntent: 'build', emphasis: 'Steady week.' },
				{ strengthIntent: 'ease', mobilityIntent: 'lighter' },
			]),
		),
		ctx,
	);
	expect(shapes![0]!.strengthIntent).toBeUndefined();
	expect(shapes![0]!.mobilityIntent).toBe('build');
	expect(shapes![0]!.emphasis).toBe('Steady week.');
	expect(shapes![1]!.strengthIntent).toBe('ease');
	expect(shapes![1]!.mobilityIntent).toBeUndefined();
});

it('shows the model the strength and mobility each week carries', async () => {
	let seen: { role: string; content: string }[] = [];
	const env = envWithAi(async (_model, opts) => {
		seen = (opts as { messages: { role: string; content: string }[] }).messages;
		return { response: JSON.stringify([{}, {}]) };
	});
	await shapePlan(env, ctx);
	const system = seen.find((m) => m.role === 'system')!.content;
	const user = seen.find((m) => m.role === 'user')!.content;
	expect(system).toContain('strengthIntent');
	expect(system).toContain('mobilityIntent');
	expect(user).toContain('"strengthDays":2');
	expect(user).toContain('"mobilityDays":1');
});

it('falls back to null when the answer is not a full array for the weeks', async () => {
	expect(await shapePlan(envResponding('not json at all'), ctx)).toBeNull();
	expect(
		await shapePlan(envResponding(JSON.stringify([{ strengthIntent: 'build' }])), ctx),
	).toBeNull();
});

it('falls back to null when the model is unavailable', async () => {
	const env = envWithAi(async () => {
		throw new Error('daily limit');
	});
	expect(await shapePlan(env, ctx)).toBeNull();
});

it('leaves a week unshaped when every field is outside the closed set', async () => {
	const shapes = await shapePlan(
		envResponding(JSON.stringify([{ strengthIntent: 'more' }, { mobilityIntent: 'less' }])),
		ctx,
	);
	expect(shapes).toEqual([undefined, undefined]);
});

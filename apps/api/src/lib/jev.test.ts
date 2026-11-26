import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('./rate-limit', () => ({
	checkRateLimit: vi.fn(async () => ({ ok: false, count: 2, limit: 1 })),
}));

import { decideChoice } from './jev';

const question = {
	id: 'risk',
	instructions: 'How risky is this?',
	options: { none: 'no concern', caution: 'a mild concern', urgent: 'a clear concern' },
	schema: z.enum(['none', 'caution', 'urgent']),
};

function ok(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
}

afterEach(() => vi.unstubAllGlobals());

it('returns null without a key and never calls the API', async () => {
	const fetchSpy = vi.fn();
	vi.stubGlobal('fetch', fetchSpy);
	expect(await decideChoice({}, 'my knee hurts', question)).toBeNull();
	expect(fetchSpy).not.toHaveBeenCalled();
});

it('maps a valid choice answer to the typed value with its confidence', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			ok({
				model: 'jev-1.14.0',
				answers: {
					risk: {
						type: 'choice',
						choice: 'urgent',
						confidence: 0.91,
						probabilities: { none: 0.01, caution: 0.08, urgent: 0.91 },
					},
				},
				usage: { input_tokens: 12, output_tokens: 4 },
			}),
		),
	);
	const decision = await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'chest pain', question);
	expect(decision).toEqual({ value: 'urgent', confidence: 0.91 });
});

it('sends the question as a choice with the option set', async () => {
	const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) =>
		ok({ answers: { risk: { type: 'choice', choice: 'none', confidence: 0.8 } } }),
	);
	vi.stubGlobal('fetch', fetchSpy);
	await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'easy run today?', question);
	const body = JSON.parse(fetchSpy.mock.calls[0]![1].body as string);
	expect(body.model).toBe('jev-latest');
	expect(body.state).toBe('easy run today?');
	expect(body.questions.risk.type).toBe('choice');
	expect(Object.keys(body.questions.risk.criteria)).toEqual(['none', 'caution', 'urgent']);
});

it('rejects a choice outside the schema and falls back to null', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ok({ answers: { risk: { type: 'choice', choice: 'maybe', confidence: 0.9 } } })),
	);
	expect(await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question)).toBeNull();
});

it('falls back to null on a non-OK response', async () => {
	vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
	expect(await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question)).toBeNull();
});

it('falls back to null on a malformed body', async () => {
	vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })));
	expect(await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question)).toBeNull();
});

it('falls back to null when the answer is missing or not a choice', async () => {
	vi.stubGlobal('fetch', vi.fn(async () => ok({ answers: {} })));
	expect(await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question)).toBeNull();
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ok({ answers: { risk: { type: 'noul', noul: 0.9 } } })),
	);
	expect(await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question)).toBeNull();
});

it('falls back to null on a confidence outside 0 to 1', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ok({ answers: { risk: { type: 'choice', choice: 'none', confidence: 1.4 } } })),
	);
	expect(await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question)).toBeNull();
});

it('falls back to null when the request times out', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			(_url: string, init?: RequestInit) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
				}),
		),
	);
	expect(
		await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question, { timeoutMs: 20 }),
	).toBeNull();
});

it('falls back to null when fetch throws', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => {
			throw new Error('network down');
		}),
	);
	expect(await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question)).toBeNull();
});

it('skips the call when the rate limit is exhausted', async () => {
	const fetchSpy = vi.fn();
	vi.stubGlobal('fetch', fetchSpy);
	const decision = await decideChoice({ TYPESAFE_API_KEY: 'k' }, 'x', question, {
		rateLimit: { db: {} as never, key: 'jev:u1', limit: 1, windowSec: 3600 },
	});
	expect(decision).toBeNull();
	expect(fetchSpy).not.toHaveBeenCalled();
});

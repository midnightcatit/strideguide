import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('./rate-limit', () => ({
	checkRateLimit: vi.fn(async () => ({ ok: false, count: 2, limit: 1 })),
}));

import { askJev, decideChoice } from './jev';

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

it('maps a valid choice answer to the typed decision', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			ok({
				answers: {
					risk: {
						type: 'choice',
						choice: 'caution',
						confidence: 0.72,
						probabilities: { none: 0.2, caution: 0.72, urgent: 0.08 },
					},
				},
			}),
		),
	);
	expect(await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'my shin aches', question)).toEqual({
		value: 'caution',
		confidence: 0.72,
	});
});

it('sends a choice question to the OpenRouter decisions endpoint', async () => {
	const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) =>
		ok({
			answers: {
				risk: { type: 'choice', choice: 'none', confidence: 0.9 },
			},
		}),
	);
	vi.stubGlobal('fetch', fetchSpy);
	await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'easy run today?', question);

	const [url, init] = fetchSpy.mock.calls[0]!;
	expect(url).toBe('https://openrouter.ai/api/alpha/decisions');
	expect(init.headers as Record<string, string>).toMatchObject({
		authorization: 'Bearer k',
		'content-type': 'application/json',
	});
	const body = JSON.parse(init.body as string);
	expect(body.model).toBe('typesafe/jev-1.14');
	expect(body.state).toBe('easy run today?');
	expect(body.questions.risk).toMatchObject({
		type: 'choice',
		instructions: 'How risky is this?',
		criteria: question.options,
	});
});

it('falls back to null when the answer is outside the schema', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			ok({
				answers: {
					risk: { type: 'choice', choice: 'maybe', confidence: 0.9 },
				},
			}),
		),
	);
	expect(await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question)).toBeNull();
});

it('falls back to null when the answer type is not a choice', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			ok({
				answers: {
					risk: { type: 'noul', noul: 0.9, confidence: 0.9 },
				},
			}),
		),
	);
	expect(await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question)).toBeNull();
});

it('falls back to null when confidence is missing or outside 0 to 1', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			ok({
				answers: {
					risk: { type: 'choice', choice: 'caution' },
				},
			}),
		),
	);
	expect(await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question)).toBeNull();

	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			ok({
				answers: {
					risk: { type: 'choice', choice: 'caution', confidence: 1.2 },
				},
			}),
		),
	);
	expect(await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question)).toBeNull();
});

it('falls back to null on a non-OK response', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response('nope', { status: 503 })),
	);
	expect(await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question)).toBeNull();
});

it('falls back to null on a malformed body', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response('not json', { status: 200 })),
	);
	expect(await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question)).toBeNull();
});

it('falls back to null when fetch throws', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => {
			throw new Error('network down');
		}),
	);
	expect(await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question)).toBeNull();
});

it('falls back to null when the request times out', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			(_url: string, init: RequestInit) =>
				new Promise((_resolve, reject) => {
					init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
				}),
		),
	);
	expect(
		await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question, { timeoutMs: 5 }),
	).toBeNull();
});

it('falls back to null when the rate limit is exhausted', async () => {
	const fetchSpy = vi.fn();
	vi.stubGlobal('fetch', fetchSpy);
	expect(
		await decideChoice({ OPENROUTER_API_KEY: 'k' }, 'state', question, {
			rateLimit: { db: {} as never, key: 'jev:u1', limit: 1, windowSec: 3600 },
		}),
	).toBeNull();
	expect(fetchSpy).not.toHaveBeenCalled();
});

it('maps a general noul answer and falls back to its probability for confidence', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			ok({
				answers: {
					ready: { type: 'noul', noul: 0.82 },
				},
			}),
		),
	);
	const decision = await askJev({ OPENROUTER_API_KEY: 'k' }, 'state', {
		type: 'noul',
		id: 'ready',
		instructions: 'Is the runner ready?',
		schema: z.number().min(0).max(1),
	});
	expect(decision).toEqual({ value: 0.82, confidence: 0.82 });
});

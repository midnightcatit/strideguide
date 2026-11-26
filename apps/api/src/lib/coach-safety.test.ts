import { afterEach, expect, it, vi } from 'vitest';
import { classifyRisk, REDIRECT_CONFIDENCE, shouldRedirect } from './coach-safety';

function ok(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
}

afterEach(() => vi.unstubAllGlobals());

it('maps a choice answer to a typed risk with its confidence', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			ok({
				answers: {
					risk: {
						type: 'choice',
						choice: 'caution',
						confidence: 0.72,
						probabilities: { none: 0.05, caution: 0.72, urgent: 0.23 },
					},
				},
			}),
		),
	);
	expect(await classifyRisk({ TYPESAFE_API_KEY: 'k' }, 'my shin aches after runs')).toEqual({
		risk: 'caution',
		confidence: 0.72,
	});
});

it('returns null without a key, so the coach answers as usual', async () => {
	const fetchSpy = vi.fn();
	vi.stubGlobal('fetch', fetchSpy);
	expect(await classifyRisk({}, 'my knee hurts')).toBeNull();
	expect(fetchSpy).not.toHaveBeenCalled();
});

it('returns null when the answer is unusable', async () => {
	vi.stubGlobal('fetch', vi.fn(async () => ok({ answers: {} })));
	expect(await classifyRisk({ TYPESAFE_API_KEY: 'k' }, 'x')).toBeNull();
});

it('redirects only when a non-none risk is confident', () => {
	expect(shouldRedirect({ risk: 'urgent', confidence: 0.9 })).toBe(true);
	expect(shouldRedirect({ risk: 'caution', confidence: 0.7 })).toBe(true);
	expect(shouldRedirect({ risk: 'none', confidence: 1 })).toBe(false);
	expect(shouldRedirect({ risk: 'urgent', confidence: REDIRECT_CONFIDENCE - 0.01 })).toBe(false);
	expect(shouldRedirect(null)).toBe(false);
});

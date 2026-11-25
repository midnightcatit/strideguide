import { afterEach, describe, expect, it, vi } from 'vitest';
import { rollUpDataPointsBounded } from './google-health';

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
}

const OPTIONS = {
	rangeStart: '2026-04-19T00:00:00Z',
	rangeEnd: '2026-04-22T00:00:00Z',
	windowSize: '86400s',
	pageSize: 14,
} as const;

describe('rollUpDataPointsBounded', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('walks every page so a multi-day window is not cut at the first page', async () => {
		const tokens: (string | undefined)[] = [];
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body ?? '{}')) as { pageToken?: string };
			tokens.push(body.pageToken);
			if (!body.pageToken) {
				return jsonResponse({
					rollupDataPoints: [{ startTime: '2026-04-20T00:00:00Z' }],
					nextPageToken: 'p2',
				});
			}
			return jsonResponse({ rollupDataPoints: [{ startTime: '2026-04-21T00:00:00Z' }] });
		});
		vi.stubGlobal('fetch', fetchMock);

		const points = await rollUpDataPointsBounded('token', 'heart-rate', { ...OPTIONS, maxPages: 5 });

		expect(points.map((point) => point.startTime)).toEqual([
			'2026-04-20T00:00:00Z',
			'2026-04-21T00:00:00Z',
		]);
		expect(tokens).toEqual([undefined, 'p2']);
	});

	it('stops at maxPages even when the provider keeps offering a next page', async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse({ rollupDataPoints: [{ startTime: '2026-04-20T00:00:00Z' }], nextPageToken: 'more' }),
		);
		vi.stubGlobal('fetch', fetchMock);

		await rollUpDataPointsBounded('token', 'total-calories', { ...OPTIONS, maxPages: 3 });

		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});

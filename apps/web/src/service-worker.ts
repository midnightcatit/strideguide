/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `strideguide-${version}`;
const RUNTIME = `strideguide-runtime-${version}`;

/**
 * What is precached on install: the build output and the app shell only. The
 * move media is a large static set (hundreds of images, several megabytes), so
 * it is never precached. A cold install stays small, and one missing image can
 * no longer abort the whole install through `cache.addAll`. The move media is
 * cached on demand by the fetch handler below.
 */
const PRECACHE = new Set([...build, ...files.filter((path) => !path.startsWith('/moves/'))]);

/** How many runtime entries to keep, so the cache cannot grow without bound. */
const RUNTIME_MAX_ENTRIES = 200;

// The app shell served for any navigation that misses the network offline. It
// boots the client router, so a cold launch or an unvisited deep link still
// lands on a working page instead of the browser's offline error.
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...PRECACHE, OFFLINE_FALLBACK]))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE && key !== RUNTIME) await caches.delete(key);
			}
			await self.clients.claim();
		})(),
	);
});

/** Drop the oldest entries once a cache passes its cap. */
async function trim(name: string, max: number): Promise<void> {
	const cache = await caches.open(name);
	const keys = await cache.keys();
	if (keys.length <= max) return;
	for (const key of keys.slice(0, keys.length - max)) await cache.delete(key);
}

/** Store a successful same-origin response, then keep the cache within its cap. */
function put(name: string, request: Request, response: Response): void {
	if (!response.ok) return;
	const copy = response.clone();
	void caches
		.open(name)
		.then((cache) => cache.put(request, copy))
		.then(() => trim(name, RUNTIME_MAX_ENTRIES));
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	// Only same-origin reads are cached; API, auth and any cross-origin request
	// are left to the network.
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return;

	// Precache-first for the build output and the app shell.
	if (PRECACHE.has(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
		return;
	}

	// Move media and client assets: cache-first, filled on first use and bounded.
	if (url.pathname.startsWith('/moves/') || url.pathname.startsWith('/_app/')) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) return cached;
				return fetch(request).then((response) => {
					put(RUNTIME, request, response);
					return response;
				});
			}),
		);
		return;
	}

	// A navigation: network-first, so the freshest page wins, with the last
	// cached copy (or the shell) as the offline fallback. Only a real navigation
	// may fall back to the shell; any other miss is left to the network so a
	// failed request never answers with the wrong document.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					put(RUNTIME, request, response);
					return response;
				})
				.catch(() => caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_FALLBACK))),
		);
	}
});

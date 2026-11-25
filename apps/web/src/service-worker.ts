/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE = `strideguide-${version}`;
const ASSETS = [...build, ...files];
// The app shell served for any navigation that misses the network offline. It
// boots the client router, so a cold launch or an unvisited deep link still
// lands on a working page instead of the browser's offline error.
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...ASSETS, OFFLINE_FALLBACK]))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await self.clients.claim();
		})(),
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return;

	// Cache-first for build assets; network-first for navigation.
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.match(request).then((cached) => cached ?? fetch(request)),
		);
		return;
	}

	event.respondWith(
		fetch(request)
			.then((response) => {
				const copy = response.clone();
				caches.open(CACHE).then((cache) => cache.put(request, copy));
				return response;
			})
			.catch(() => caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_FALLBACK))),
	);
});

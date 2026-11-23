import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Serve the static media and client assets directly, by prefix, rather than
		// letting the adapter enumerate every file (which overruns the 100-rule
		// limit on _routes.json now that the move media is a large static set).
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['/_app/*', '/moves/*', '/icon.svg', '/manifest.webmanifest', '/service-worker.js'],
			},
		}),
	},
};

export default config;

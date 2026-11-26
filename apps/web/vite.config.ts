import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// The system map lays out in a module worker that code-splits (elkjs is a
	// dynamic import), which the default iife worker output cannot represent.
	worker: {
		format: 'es',
	},
	server: {
		proxy: {
			'/api': 'http://localhost:8787',
			'/auth': 'http://localhost:8787',
			'/connections': 'http://localhost:8787',
		},
	},
});

import { defineConfig } from 'vitest/config';

// The web app's tests cover pure client logic only, so they run without the
// SvelteKit plugin. Test files import plain modules, never rune stores.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
	},
});

<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { cycleTheme, getTheme, type Theme } from '$lib/theme';
	import { loadPrefs, prefs } from '$lib/prefs.svelte';
	import UnitsToggle from '$lib/components/UnitsToggle.svelte';

	let { children } = $props();

	let theme = $state<Theme>('system');

	onMount(() => {
		theme = getTheme();
		void loadPrefs();
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}
	});

	function toggleTheme() {
		theme = cycleTheme();
	}

	const themeLabel: Record<Theme, string> = { light: '◑', dark: '◐', system: '◓' };
</script>

<div class="min-h-dvh flex flex-col">
	<header
		class="flex items-center justify-between border-b border-hairline px-4 py-3 sticky top-0 bg-paper/90 backdrop-blur"
	>
		<a href="/" class="font-display text-lg font-bold tracking-tight">Stride Guide</a>
		<div class="flex items-center gap-2">
			<UnitsToggle current={prefs.units} />
			<button
				type="button"
				onclick={toggleTheme}
				aria-label="Toggle theme"
				class="tabular text-steel hover:text-signal-ink transition-colors text-lg leading-none px-2 py-1"
				title="Theme: {theme}"
			>
				{themeLabel[theme]}
			</button>
		</div>
	</header>

	<main class="flex-1 mx-auto w-full max-w-2xl px-4 py-6">
		{@render children()}
	</main>

	<footer class="border-t border-hairline px-4 py-3 text-center text-xs text-steel">
		<span class="tabular">run.midnightcatit.com</span>
	</footer>
</div>

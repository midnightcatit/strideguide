<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { cycleTheme, getTheme, type Theme } from '$lib/theme';
	import { api } from '$lib/api';
	import { loadPrefs, prefs } from '$lib/prefs.svelte';
	import { outbox } from '$lib/offline';
	import UnitsToggle from '$lib/components/UnitsToggle.svelte';

	let { children } = $props();

	let theme = $state<Theme>('system');
	let pending = $state(0);
	let user = $state<{ email: string } | null>(null);

	onMount(() => {
		theme = getTheme();
		void loadPrefs();
		void api
			.me()
			.then((u) => (user = u))
			.catch(() => {});
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}

		const sync = async () => {
			pending = outbox().length;
			if (navigator.onLine && pending > 0) {
				await api.flushOutbox().catch(() => {});
				pending = outbox().length;
			}
		};
		void sync();
		window.addEventListener('online', sync);
		return () => window.removeEventListener('online', sync);
	});

	async function signOut() {
		await api.logout().catch(() => {});
		window.location.href = '/';
	}

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
			{#if pending > 0}
				<span class="tabular text-xs text-signal-ink" title="{pending} log(s) waiting to sync"
					>⟳ {pending}</span
				>
			{/if}
			{#if user}
				<button
					type="button"
					onclick={signOut}
					class="text-xs text-steel hover:text-signal-ink"
					title="Sign out of {user.email}"
				>
					Sign out
				</button>
			{/if}
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

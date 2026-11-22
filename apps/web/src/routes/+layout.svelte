<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { loadPrefs } from '$lib/prefs.svelte';
	import { outbox } from '$lib/offline';
	import SettingsModal from '$lib/components/SettingsModal.svelte';

	let { children } = $props();

	let pending = $state(0);
	let user = $state<{ email: string } | null>(null);
	let settingsOpen = $state(false);

	onMount(() => {
		void loadPrefs();
		void api
			.me()
			.then((u) => (user = u))
			.catch(() => {});

		// Keep the installed PWA current: bypass the HTTP cache for the worker script,
		// check for updates on load, and reload once a new worker takes control.
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js', { updateViaCache: 'none' })
				.then((reg) => {
					void reg.update().catch(() => {});
					let reloaded = false;
					navigator.serviceWorker.addEventListener('controllerchange', () => {
						if (reloaded) return;
						reloaded = true;
						window.location.reload();
					});
				})
				.catch(() => {});
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
			<button
				type="button"
				onclick={() => (settingsOpen = true)}
				aria-label="Settings"
				class="text-steel hover:text-signal-ink px-2 py-1"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
					<circle cx="12" cy="12" r="3" />
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
				</svg>
			</button>
		</div>
	</header>

	<main class="flex-1 mx-auto w-full max-w-2xl px-4 py-6 pb-24">
		{@render children()}
	</main>

	<nav
		class="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper/95 backdrop-blur"
		aria-label="Primary"
	>
		<div class="mx-auto flex max-w-2xl">
			{#each [{ href: '/', label: 'Today', active: page.url.pathname === '/' }, { href: '/coach', label: 'Coach', active: page.url.pathname.startsWith('/coach') }, { href: '/progress', label: 'Progress', active: page.url.pathname.startsWith('/progress') }] as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.active ? 'page' : undefined}
					class="flex-1 py-3 text-center text-sm {tab.active ? 'text-ink font-medium' : 'text-steel'}"
				>
					{tab.label}
				</a>
			{/each}
		</div>
	</nav>

	<footer class="border-t border-hairline px-4 py-3 text-center text-xs text-steel">
		<span class="tabular">run.midnightcatit.com</span>
	</footer>
</div>

{#if settingsOpen}
	<SettingsModal {user} onClose={() => (settingsOpen = false)} />
{/if}

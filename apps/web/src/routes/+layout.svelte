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

	const tabs = $derived([
		{ href: '/', key: 'today', label: 'Today', active: page.url.pathname === '/' },
		{ href: '/coach', key: 'coach', label: 'Coach', active: page.url.pathname.startsWith('/coach') },
		{ href: '/progress', key: 'progress', label: 'Progress', active: page.url.pathname.startsWith('/progress') },
	]);

	onMount(() => {
		void loadPrefs();
		void api
			.me()
			.then((u) => (user = u))
			.catch(() => {});

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
		class="sticky top-0 z-30 border-b border-hairline bg-paper/95 backdrop-blur"
		style="padding-top: env(safe-area-inset-top)"
	>
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
			<a href="/" class="font-display text-lg font-bold tracking-tight">Stride Guide</a>

			<!-- Desktop tabs -->
			<nav class="hidden items-center gap-1 sm:flex" aria-label="Primary">
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						aria-current={tab.active ? 'page' : undefined}
						class="rounded-md px-3 py-1.5 text-sm {tab.active
							? 'bg-sunken font-medium text-ink'
							: 'text-steel hover:text-ink'}"
					>
						{tab.label}
					</a>
				{/each}
			</nav>

			<div class="flex items-center gap-2">
				{#if pending > 0}
					<span class="tabular text-xs text-signal-ink" title="{pending} log(s) waiting to sync">⟳ {pending}</span>
				{/if}
				<button
					type="button"
					onclick={() => (settingsOpen = true)}
					aria-label="Settings"
					class="flex h-11 w-11 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
					</svg>
				</button>
			</div>
		</div>
	</header>

	<main class="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24 sm:pb-6">
		{@render children()}
	</main>

	<footer class="border-t border-hairline px-4 py-3 pb-20 text-center text-xs text-steel sm:pb-3">
		<span class="tabular">run.midnightcatit.com</span>
	</footer>

	<!-- Mobile bottom bar -->
	<nav
		class="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper/95 backdrop-blur sm:hidden"
		aria-label="Primary"
	>
		<div class="mx-auto grid max-w-2xl grid-cols-3" style="padding-bottom: env(safe-area-inset-bottom)">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab.active ? 'page' : undefined}
					class="relative flex h-14 flex-col items-center justify-center gap-1 {tab.active ? 'text-ink' : 'text-steel'}"
				>
					{#if tab.active}
						<span class="absolute top-0 h-0.5 w-8 rounded-full bg-signal" aria-hidden="true"></span>
					{/if}
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						{#if tab.key === 'today'}
							<path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5" />
							<circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
						{:else if tab.key === 'coach'}
							<circle cx="10" cy="10" r="7" />
							<line x1="10" y1="3.5" x2="10" y2="7" />
							<line x1="10" y1="13" x2="10" y2="16.5" />
							<line x1="3.5" y1="10" x2="7" y2="10" />
							<line x1="13" y1="10" x2="16.5" y2="10" />
						{:else}
							<rect x="3" y="12" width="3" height="5" />
							<rect x="8.5" y="8" width="3" height="9" />
							<rect x="14" y="4" width="3" height="13" />
						{/if}
					</svg>
					<span class="tabular text-[10px] uppercase tracking-widest">{tab.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>

{#if settingsOpen}
	<SettingsModal {user} onClose={() => (settingsOpen = false)} />
{/if}

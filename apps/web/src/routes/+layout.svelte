<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, onNavigate } from '$app/navigation';
	import { api } from '$lib/api';
	import { loadPrefs } from '$lib/prefs.svelte';
	import { outbox } from '$lib/offline';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { installClientErrorReporting } from '$lib/clientErrors';
	import { overlayHistory } from '$lib/overlayHistory.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import SignIn from '$lib/components/SignIn.svelte';

	let { children } = $props();

	// Pages that must render without signing in, because the OAuth consent screen
	// and reviewers open them directly. They get a bare shell, no app chrome.
	const PUBLIC_PATHS = new Set(['/privacy', '/terms']);
	const isPublic = $derived(PUBLIC_PATHS.has(page.url.pathname));

	let pending = $state(0);
	// Set when a newer service worker takes control; we offer a reload instead of
	// forcing one, so an in-progress form or request is never interrupted.
	let updateReady = $state(false);
	let stopConfirm = $state(false);
	let signOutConfirm = $state(false);

	// Onboarding hides the nav: the plan is the point, and almost everything else
	// depends on it. A sticky close with a confirmation takes you back instead.
	const onboarding = $derived(page.url.pathname.startsWith('/onboarding'));

	const tabs = $derived([
		{ href: '/', key: 'dashboard', label: 'Dashboard', active: page.url.pathname === '/' },
		{ href: '/today', key: 'today', label: 'Today', active: page.url.pathname.startsWith('/today') },
		{ href: '/calendar', key: 'calendar', label: 'Calendar', active: page.url.pathname.startsWith('/calendar') },
		{ href: '/coach', key: 'coach', label: 'Coach', active: page.url.pathname.startsWith('/coach') },
		{ href: '/progress', key: 'progress', label: 'Progress', active: page.url.pathname.startsWith('/progress') },
	]);

	// Crossfade route changes with the View Transitions API where it exists, so
	// navigation reads as motion instead of a hard swap. No support, or reduced
	// motion, means an instant change.
	onNavigate((navigation) => {
		if (typeof document === 'undefined') return;
		const doc = document as Document & {
			startViewTransition?: (cb: () => void | Promise<void>) => unknown;
		};
		if (!doc.startViewTransition) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise<void>((resolve) => {
			doc.startViewTransition!(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	onMount(() => {
		installClientErrorReporting();
		void loadPrefs();
		void ensureAuth();

		if ('serviceWorker' in navigator) {
			const hadController = !!navigator.serviceWorker.controller;
			navigator.serviceWorker
				.register('/service-worker.js', { updateViaCache: 'none' })
				.then((reg) => {
					void reg.update().catch(() => {});
					navigator.serviceWorker.addEventListener('controllerchange', () => {
						// Only prompt on an update, not on the first registration.
						if (hadController) updateReady = true;
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

{#snippet tabIcon(key: string, size: string)}
	<svg class={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		{#if key === 'dashboard'}
			<rect x="3" y="3" width="6" height="6" rx="1" />
			<rect x="11" y="3" width="6" height="6" rx="1" />
			<rect x="3" y="11" width="6" height="6" rx="1" />
			<rect x="11" y="11" width="6" height="6" rx="1" />
		{:else if key === 'today'}
			<path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5" />
			<circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" />
		{:else if key === 'calendar'}
			<rect x="3" y="4.5" width="14" height="12" rx="1.5" />
			<line x1="3" y1="8.5" x2="17" y2="8.5" />
			<line x1="7" y1="3" x2="7" y2="6" />
			<line x1="13" y1="3" x2="13" y2="6" />
		{:else if key === 'coach'}
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
{/snippet}

{#if !auth.checked}
	<div class="min-h-dvh flex items-center justify-center">
		<p class="tabular text-sm text-steel">Loading…</p>
	</div>
{:else if isPublic}
	<div class="min-h-dvh">
		<main class="mx-auto w-full max-w-2xl px-5 py-10">
			{@render children()}
		</main>
	</div>
{:else if !auth.user}
	<SignIn />
{:else}
	<div class="min-h-dvh flex flex-col">
		{#if !onboarding}
		<header
			class="sticky top-0 z-30 border-b border-hairline bg-paper"
			style="padding-top: env(safe-area-inset-top)"
		>
			<div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
				<a href="/" class="font-display text-lg font-bold tracking-tight">Stride Guide</a>

				<nav class="hidden items-center gap-1 sm:flex" aria-label="Primary">
					{#each tabs as tab (tab.href)}
						<a
							href={tab.href}
							aria-current={tab.active ? 'page' : undefined}
							class="relative rounded-md px-3 py-1.5 text-sm {tab.active ? 'font-medium text-ink' : 'text-steel hover:text-ink'}"
						>
							<span class="tab-pill absolute inset-0 rounded-md bg-sunken" data-active={tab.active} aria-hidden="true"></span>
							<span class="relative flex items-center gap-1.5">
								{@render tabIcon(tab.key, 'h-4 w-4')}
								{tab.label}
							</span>
						</a>
					{/each}
				</nav>

				<div class="flex items-center gap-2">
					{#if pending > 0}
						<span class="tabular text-xs text-signal-ink" title="{pending} log(s) waiting to sync">⟳ {pending}</span>
					{/if}
					<a
						href="/settings"
						aria-label="Settings"
						class="flex h-11 w-11 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
						</svg>
					</a>
				</div>
			</div>
		</header>
		{/if}

		{#if updateReady}
			<div class="mx-auto mt-3 flex w-full max-w-5xl items-center justify-between gap-3 px-4">
				<div class="flex w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-sunken px-4 py-2 text-sm">
					<span>A new version of Stride Guide is ready.</span>
					<button
						type="button"
						onclick={() => window.location.reload()}
						class="shrink-0 rounded-md border border-hairline-strong px-3 py-1.5 text-xs hover:border-signal hover:text-signal-ink"
					>
						Reload
					</button>
				</div>
			</div>
		{/if}

		<main class="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24 sm:pb-6">
			{@render children()}
		</main>

		{#if !onboarding}
		<nav
			class="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-paper sm:hidden"
			aria-label="Primary"
		>
			<div class="mx-auto grid max-w-2xl grid-cols-5" style="padding-bottom: env(safe-area-inset-bottom)">
				{#each tabs as tab (tab.href)}
					<a
						href={tab.href}
						aria-current={tab.active ? 'page' : undefined}
						class="relative flex h-14 flex-col items-center justify-center gap-1 {tab.active ? 'text-ink' : 'text-steel'}"
					>
						<span class="tab-bar absolute top-0 h-0.5 w-8 rounded-full bg-signal-ink" data-active={tab.active} aria-hidden="true"></span>
						{@render tabIcon(tab.key, 'h-5 w-5')}
						<span class="tabular text-[10px] uppercase tracking-normal">{tab.label}</span>
					</a>
				{/each}
			</div>
		</nav>
		{/if}

		{#if onboarding}
			<div class="fixed right-3 z-40 flex items-center gap-2" style="top: calc(env(safe-area-inset-top) + 0.5rem)">
				<button
					type="button"
					onclick={() => (signOutConfirm = true)}
					class="rounded-full border border-hairline bg-paper/95 px-3 py-2 text-xs text-steel hover:text-ink"
				>
					Sign out
				</button>
				<button
					type="button"
					onclick={() => (stopConfirm = true)}
					aria-label="Stop building your plan"
					class="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-paper/95 text-steel hover:text-ink"
				>
					✕
				</button>
			</div>
		{/if}
	</div>
{/if}

{#if signOutConfirm}
	<ConfirmSheet
		title="Sign out?"
		body="You can sign back in any time with Google."
		confirmLabel="Sign out"
		tone="danger"
		onConfirm={async () => {
			signOutConfirm = false;
			await api.logout().catch(() => {});
			window.location.href = '/';
		}}
		onClose={() => (signOutConfirm = false)}
	/>
{/if}

{#if stopConfirm}
	<ConfirmSheet
		title="Stop building your plan?"
		body="Your answers are not saved. You can start again any time from the dashboard."
		confirmLabel="Stop and go to the dashboard"
		tone="danger"
		onConfirm={() => {
			stopConfirm = false;
			void goto('/');
		}}
		onClose={() => (stopConfirm = false)}
	/>
{/if}

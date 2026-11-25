<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, onNavigate } from '$app/navigation';
	import { api } from '$lib/api';
	import { loadPrefs, prefs, prefsState } from '$lib/prefs.svelte';
	import { ensurePlan, reloadPlan } from '$lib/planStore.svelte';
	import { clearClientState, outbox } from '$lib/offline';
	import { auth, ensureAuth, forgetUser } from '$lib/auth.svelte';
	import { breadcrumbFor } from '$lib/breadcrumbs';
	import { installClientErrorReporting } from '$lib/clientErrors';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import SignIn from '$lib/components/SignIn.svelte';
	import AvatarMenu from '$lib/components/AvatarMenu.svelte';

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
		{ href: '/today', key: 'today', label: 'Today', active: page.url.pathname === '/' || page.url.pathname.startsWith('/today') },
		{ href: '/calendar', key: 'calendar', label: 'Calendar', active: page.url.pathname.startsWith('/calendar') },
		{ href: '/progress', key: 'progress', label: 'Progress', active: page.url.pathname.startsWith('/progress') },
		{ href: '/coach', key: 'coach', label: 'Coach', active: page.url.pathname.startsWith('/coach') },
	]);
	// Empty on a top-level page (the header shows the mark); the trail otherwise.
	const crumbs = $derived(
		breadcrumbFor(page.url.pathname, page.url.searchParams.get('from')),
	);
	// A route under the (bleed) group asks the shell to drop its centred, padded
	// column, so the page can run edge to edge without breaking out by hand.
	const bleed = $derived((page.data as { bleed?: boolean }).bleed === true);

	// The name the avatar draws its initial from: the one set in Settings > You,
	// else the Google display name. Empty means the avatar shows a neutral icon
	// instead of a letter.
	const avatarName = $derived(prefs.name ?? auth.user?.name ?? null);

	// Crossfade route changes with the View Transitions API where it exists, so
	// navigation reads as motion instead of a hard swap. The CSS names the content
	// and header groups, so only those animate. No support, or reduced motion,
	// means an instant change (the keyed content wrapper then carries a short
	// enter for browsers without the API).
	onNavigate(async (navigation) => {
		// Make sure the shared data the next route renders from is ready before the
		// swap. The plan store is the one every app route reads, and without this
		// the transition captures the next route's pre-data frame (a loading line
		// or the no-plan empty state) because the store loads in onMount, after
		// navigation.complete. It is idempotent, so later navigations are instant.
		if (auth.checked && auth.user) {
			await ensurePlan().catch(() => {});
			void loadPrefs();
		}
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
		// Resolve the signed-in user first, then read the saved prefs only when we
		// know there is one, so a signed-out or offline start is not read as a
		// settings failure. When auth resolves to a user, load the prefs.
		const refreshSession = async () => {
			await ensureAuth().catch(() => {});
			if (auth.checked && auth.user) void loadPrefs();
		};
		void refreshSession();

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
				const res = await api.flushOutbox().catch(() => null);
				pending = outbox().length;
				// Once the whole outbox has gone through, reload the plan so the
				// optimistic pending logs give way to the server's own rows and the
				// metrics count them for real.
				if (res && res.sent > 0 && res.remaining === 0) {
					await reloadPlan().catch(() => {});
				}
			}
		};
		// Back online: re-check the session (a start offline left it unchecked),
		// flush queued logs, and refetch the plan that may have failed.
		const onOnline = () => {
			void sync();
			void refreshSession();
			if (auth.checked && auth.user) void ensurePlan().catch(() => {});
		};
		void sync();
		window.addEventListener('online', onOnline);
		return () => window.removeEventListener('online', onOnline);
	});

	// The root landing redirect lives in the root page, which runs on every visit
	// there, so this layout keeps no landing state of its own.
</script>

{#snippet tabIcon(key: string, size: string)}
	<svg class={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		{#if key === 'today'}
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

{#if isPublic}
	<div class="min-h-dvh">
		<main class="mx-auto w-full max-w-2xl px-5 py-10">
			{@render children()}
		</main>
	</div>
{:else if auth.user}
	<div class="sg-app min-h-dvh flex flex-col">
		<a href="#main" class="skip-link">Skip to content</a>
		{#if !onboarding}
		<header
			class="sg-header sticky top-0 border-b border-hairline bg-paper"
			style="padding-top: env(safe-area-inset-top)"
		>
			<div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
				{#if crumbs.length === 0}
					<a href="/today" class="font-display text-lg font-bold tracking-tight">Stride Guide</a>
				{:else}
					<nav aria-label="Breadcrumb" class="min-w-0">
						<ol class="flex items-center gap-1.5 text-sm">
							{#each crumbs as crumb, i (crumb.href)}
								{#if i > 0}<span class="text-steel" aria-hidden="true">›</span>{/if}
								{#if i === crumbs.length - 1}
									<span class="truncate font-medium text-ink" aria-current="page">{crumb.label}</span>
								{:else}
									<a href={crumb.href} class="truncate text-steel hover:text-signal-ink">{crumb.label}</a>
								{/if}
							{/each}
						</ol>
					</nav>
				{/if}

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
						<span class="tabular text-xs text-signal-ink" title="{pending} log(s) waiting to sync" aria-hidden="true">⟳ {pending}</span>
						<span class="sr-only" role="status" aria-live="polite">{pending} {pending === 1 ? 'log' : 'logs'} waiting to sync</span>
					{/if}
					<AvatarMenu name={avatarName} email={auth.user?.email} seed={auth.user?.id} />
				</div>
			</div>
		</header>
		{/if}

		{#if updateReady}
			<div class="mx-auto mt-3 flex w-full max-w-5xl items-center justify-between gap-3 px-4">
				<div role="status" aria-live="polite" class="flex w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-sunken px-4 py-2 text-sm">
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

		{#if prefsState.failed}
			<div class="mx-auto mt-3 flex w-full max-w-5xl items-center justify-between gap-3 px-4">
				<div class="flex w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-sunken px-4 py-2 text-sm">
					<span>Some settings did not load, so units and week start may be off.</span>
					<button
						type="button"
						onclick={() => void loadPrefs()}
						class="shrink-0 rounded-md border border-hairline-strong px-3 py-1.5 text-xs hover:border-signal hover:text-signal-ink"
					>
						Retry
					</button>
				</div>
			</div>
		{/if}

		<main id="main" tabindex="-1" class="outline-none {bleed ? 'flex flex-1 flex-col pb-24 sm:pb-6' : 'flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24 sm:pb-6'}">
			{#key page.url.pathname}
				<div class="route-enter">
					{@render children()}
				</div>
			{/key}
		</main>

		{#if !onboarding}
		<nav
			class="sg-nav fixed inset-x-0 bottom-0 border-t border-hairline bg-paper sm:hidden"
			aria-label="Primary"
		>
			<div class="mx-auto grid max-w-2xl grid-cols-4" style="padding-bottom: env(safe-area-inset-bottom)">
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
			<div class="sg-float fixed right-3 flex items-center gap-2" style="top: calc(env(safe-area-inset-top) + 0.5rem)">
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
{:else if auth.checked}
	<SignIn />
{:else if auth.error}
	<div class="min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center">
		<p class="max-w-sm text-sm text-steel">
			We could not reach the server to check your sign-in. Check your connection and try again.
		</p>
		<button
			type="button"
			onclick={() => void ensureAuth()}
			class="rounded-md border border-hairline-strong px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink"
		>
			Try again
		</button>
	</div>
{:else}
	<div class="min-h-dvh flex items-center justify-center">
		<p class="tabular text-sm text-steel">Loading…</p>
	</div>
{/if}

<ConfirmSheet
	open={signOutConfirm}
	title="Sign out?"
	body="You can sign back in any time with Google."
	confirmLabel="Sign out"
	tone="danger"
	onConfirm={async () => {
		signOutConfirm = false;
		await api.logout().catch(() => {});
		clearClientState();
		forgetUser();
		window.location.href = '/';
	}}
	onClose={() => (signOutConfirm = false)}
/>

<ConfirmSheet
	open={stopConfirm}
	title="Stop building your plan?"
	body="Your answers are not saved. You can start again any time from Today."
	confirmLabel="Stop and go to Today"
	tone="danger"
	onConfirm={() => {
		stopConfirm = false;
		void goto('/');
	}}
	onClose={() => (stopConfirm = false)}
/>

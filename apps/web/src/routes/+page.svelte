<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { getLandingTab, landingHref } from '$lib/prefs.svelte';

	// The root is a landing point, not a page of its own. This sends a signed-in
	// runner to the tab they chose to open on (Today unless they picked another
	// one), and a runner without a plan to onboarding, once per session, unless
	// they have said "not now". It runs on every visit to the root, so tapping
	// Home later lands on the same place. When neither branch takes them, the
	// page settles on its own empty state instead of hanging on Loading.
	const DISMISS_KEY = 'sg:onboardingDismissed';
	const REDIRECT_KEY = 'sg:onboardingRedirected';

	// True once the root has finished deciding and is not navigating away, so the
	// no-plan empty state can take over instead of an endless loading line.
	let settled = $state(false);

	onMount(async () => {
		await ensureAuth();
		if (!auth.user) {
			settled = true;
			return;
		}
		await ensurePlan();

		let dismissed = false;
		let alreadyRedirected = false;
		try {
			dismissed = localStorage.getItem(DISMISS_KEY) === '1';
			alreadyRedirected = sessionStorage.getItem(REDIRECT_KEY) === '1';
		} catch {}

		if (!store.error && !store.plan?.weeks?.length && !dismissed && !alreadyRedirected) {
			try {
				sessionStorage.setItem(REDIRECT_KEY, '1');
			} catch {}
			await goto('/onboarding', { replaceState: true });
			return;
		}
		if (store.plan?.weeks?.length) {
			await goto(landingHref(getLandingTab()), { replaceState: true });
			return;
		}
		settled = true;
	});
</script>

{#if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else if settled}
	<div class="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
		<p class="text-sm text-steel">You don't have a plan yet.</p>
		<a
			href="/onboarding"
			class="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
		>
			Build a plan
		</a>
		<a href="/today" class="text-xs text-signal-ink hover:underline">Go to today</a>
	</div>
{:else}
	<div class="flex min-h-dvh items-center justify-center">
		<p class="tabular text-sm text-steel">Loading…</p>
	</div>
{/if}

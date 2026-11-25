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
	// Home later lands on the same place. The empty shell below only shows for
	// the moment that takes.
	const DISMISS_KEY = 'sg:onboardingDismissed';
	const REDIRECT_KEY = 'sg:onboardingRedirected';

	onMount(async () => {
		await ensureAuth();
		if (!auth.user) return;
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
		}
	});
</script>

{#if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else}
	<div class="flex min-h-dvh items-center justify-center">
		<p class="tabular text-sm text-steel">Loading…</p>
	</div>
{/if}

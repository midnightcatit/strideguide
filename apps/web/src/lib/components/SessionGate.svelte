<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { store, ensurePlan, findSession } from '$lib/planStore.svelte';
	import type { ClientSession } from '$lib/plan';

	/**
	 * Loads the plan and hands the session for an id to its children, so each
	 * session route shares one loading, error and not-found state.
	 */
	let { id, children }: { id: string; children: Snippet<[ClientSession]> } = $props();

	const session = $derived(findSession(id));

	onMount(() => {
		void ensurePlan();
	});
</script>

{#if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else if !store.loaded && !store.plan}
	<p class="tabular mt-6 text-sm text-steel">Loading…</p>
{:else if session}
	{@render children(session)}
{:else}
	<p class="mt-6 text-sm text-steel">
		This session is no longer in your plan.
		<a href="/today" class="ml-1 font-medium text-signal-ink hover:underline">Back to Today</a>
	</p>
{/if}

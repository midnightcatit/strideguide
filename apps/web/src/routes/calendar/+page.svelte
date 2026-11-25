<script lang="ts">
	import { onMount } from 'svelte';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import MonthCalendar from '$lib/components/MonthCalendar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';
	import PlanError from '$lib/components/PlanError.svelte';

	onMount(() => {
		void ensurePlan();
	});
</script>

{#if store.error}
	<PlanError message={store.error} />
{:else if !store.loaded && !store.plan}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if !(store.plan?.weeks?.length)}
	<EmptyState
		eyebrow="No plan yet"
		title="Build your plan."
		body="Pick a goal and a race date. We write the sessions and explain each one."
		primaryLabel="Build my plan"
		primaryHref="/onboarding"
	>
		{#snippet icon()}<SessionIcon type="easy" size="h-5 w-5" />{/snippet}
	</EmptyState>
{:else}
	<MonthCalendar />
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import MonthCalendar from '$lib/components/MonthCalendar.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';

	onMount(() => {
		void ensurePlan();
	});
</script>

<header class="mb-6">
	<p class="tabular text-xs uppercase tracking-widest text-steel">Calendar</p>
	<h1 class="font-display mt-1 text-2xl font-bold">Training calendar</h1>
	<p class="mt-0.5 text-sm text-steel">A month at a glance, shaded by training pressure, or a list of what is coming up. Tap a day for the workouts.</p>
</header>

{#if !store.loaded}
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

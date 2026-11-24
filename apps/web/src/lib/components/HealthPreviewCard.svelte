<script lang="ts">
	import Card from './Card.svelte';
	import type { HealthMetricsPayload } from '$lib/api';
	import { sparkline } from '$lib/healthChart';

	/**
	 * Health at a glance, for the progress tab's metric grid. Shows the latest
	 * resting heart rate and its trend, or a plain line when there is nothing yet.
	 */
	let {
		payload,
		from = '/progress',
	}: {
		payload: HealthMetricsPayload | null;
		from?: string;
	} = $props();

	const href = $derived(`/progress/health?from=${from}`);
	const metrics = $derived(payload?.metrics ?? {});
	const samples = $derived(payload?.samples ?? {});
	const hasData = $derived(Object.keys(metrics).length > 0 || Object.keys(samples).length > 0);
	const resting = $derived(metrics['resting_hr'] ?? null);
	const restingLatest = $derived(resting?.latest?.value ?? null);
	const points = $derived(sparkline((resting?.series ?? []).map((p) => p.value), 100, 20, 3));
</script>

<a {href} class="lift block h-full rounded-xl" aria-label="Health, open the full health data view">
	<Card tone="sunken" class="flex h-full flex-col">
		<p class="tabular text-[10px] uppercase tracking-widest text-steel">Health</p>
		{#if !hasData}
			<p class="mt-1 text-lg font-semibold text-steel">No data yet</p>
			<p class="mt-2.5 text-[11px] text-steel">Connect a watch and sync to fill this in.</p>
		{:else}
			<p class="tabular mt-1 text-lg font-semibold">
				{#if restingLatest !== null}{Math.round(restingLatest)} bpm{:else}{Object.keys(metrics).length} metrics{/if}
			</p>
			{#if points}
				<svg viewBox="0 0 100 20" preserveAspectRatio="none" class="mt-2.5 h-5 w-full" aria-hidden="true">
					<polyline {points} fill="none" stroke="var(--cool)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></polyline>
				</svg>
			{:else}
				<p class="mt-2.5 text-[11px] text-steel">Resting HR trend</p>
			{/if}
		{/if}
		<p class="mt-auto pt-2 text-[11px] text-signal-ink">See all health →</p>
	</Card>
</a>

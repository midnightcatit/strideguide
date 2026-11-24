<script lang="ts">
	import Card from './Card.svelte';
	import { fmtDistance } from '$lib/prefs.svelte';
	import type { WeekKm } from '$lib/metrics';

	/**
	 * Volume at a glance: this week against plan, plus the last few weeks as small
	 * bars. Shared by the dashboard and the progress tab.
	 */
	let {
		doneKm,
		plannedKm,
		weekly,
		weeklyMax,
		from = '/progress',
	}: {
		doneKm: number;
		plannedKm: number;
		weekly: WeekKm[];
		weeklyMax: number;
		from?: string;
	} = $props();

	const href = $derived(`/progress/volume?from=${from}`);
</script>

<a {href} class="lift block h-full rounded-xl" aria-label="Volume, open the full distance view">
	<Card tone="sunken" class="flex h-full flex-col">
		<p class="tabular text-[10px] uppercase tracking-widest text-steel">Volume</p>
		<p class="tabular mt-1 text-lg text-steel">{fmtDistance(doneKm)}<span class="text-sm"> / {fmtDistance(plannedKm)}</span></p>
		<div class="mt-2.5 flex items-end gap-0.5" style="height: 20px" aria-hidden="true">
			{#each weekly as w (w.startIso)}
				<div class="grow-y flex-1 rounded-[1px] bg-ok" style="height: {Math.max(2, Math.round((w.km / weeklyMax) * 18))}px"></div>
			{/each}
		</div>
		<p class="mt-auto pt-2 text-[11px] text-signal-ink">See all volume →</p>
	</Card>
</a>

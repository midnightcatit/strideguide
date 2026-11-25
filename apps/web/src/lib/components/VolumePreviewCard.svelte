<script lang="ts">
	import Card from './Card.svelte';
	import MiniBars from '$lib/components/charts/MiniBars.svelte';
	import { TRAINING_PROGRESS } from '$lib/chartPalette';
	import { fmtDistance } from '$lib/prefs.svelte';
	import type { WeekKm } from '$lib/metrics';

	/**
	 * Volume at a glance: this week against plan, plus the last few weeks as small
	 * bars, drawn on the shared MiniBars in the training palette's green so they
	 * match the plan ring and the weekly volume chart. Shared by the dashboard and
	 * the progress tab.
	 */
	let {
		doneKm,
		plannedKm,
		weekly,
		from = '/progress',
	}: {
		doneKm: number;
		plannedKm: number;
		weekly: WeekKm[];
		from?: string;
	} = $props();

	const href = $derived(`/progress/volume?from=${from}`);
</script>

<a {href} class="lift block h-full rounded-xl" aria-label="Volume, open the full distance view">
	<Card tone="sunken" class="flex h-full flex-col">
		<p class="tabular text-[10px] uppercase tracking-widest text-steel">Volume</p>
		<p class="tabular mt-1 text-lg text-steel">{fmtDistance(doneKm)}<span class="text-sm"> / {fmtDistance(plannedKm)}</span></p>
		<div class="mt-2.5" aria-hidden="true">
			<MiniBars values={weekly.map((w) => w.km)} color={TRAINING_PROGRESS} height={22} />
		</div>
		<p class="mt-auto pt-2 text-[11px] text-signal-ink">See all volume →</p>
	</Card>
</a>

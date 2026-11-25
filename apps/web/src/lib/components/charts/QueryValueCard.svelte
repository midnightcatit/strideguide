<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Sparkline from './Sparkline.svelte';
	import { periodDelta, signed } from '$lib/chartTheme';

	/**
	 * A single headline reading: one large number with its unit, the change
	 * against the earlier half of the window, and a sparkline in the metric's
	 * family colour. Used for the measurements where the number matters more than
	 * the shape (resting HR, HRV, VO2 max, weight, and the other samples).
	 */
	let {
		title,
		value,
		unit,
		values,
		color,
		decimals = 1,
		changeLabel = 'vs first half',
	}: {
		title: string;
		value: string;
		unit?: string;
		values: number[];
		color: string;
		decimals?: number;
		changeLabel?: string;
	} = $props();

	const change = $derived(periodDelta(values));
</script>

<Card tone="sunken">
	<div class="flex items-center gap-2">
		<span class="h-2 w-2 shrink-0 rounded-full" style="background: {color}" aria-hidden="true"></span>
		<p class="tabular text-xs uppercase tracking-widest text-steel">{title}</p>
	</div>
	<p class="tabular mt-1 text-2xl font-semibold">
		{value}{#if unit}<span class="ml-1 text-sm font-normal text-steel">{unit}</span>{/if}
	</p>
	<p class="tabular text-[11px] text-steel">
		{#if change !== null}{signed(change, decimals)} {changeLabel}{:else}One reading{/if}
	</p>
	<div class="mt-2">
		<Sparkline {values} {color} height={28} />
	</div>
</Card>

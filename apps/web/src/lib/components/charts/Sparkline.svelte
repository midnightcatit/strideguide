<script lang="ts">
	import { LineChart } from 'layerchart';
	import { prefersReducedMotion } from 'svelte/motion';

	/**
	 * A tiny trend line for a query-value tile, no axes or tooltip. The values
	 * keep the metric's family colour, so the sparkline matches the chart it
	 * stands in for. Renders nothing with fewer than two readings, so a lone day
	 * is never drawn as a flat line.
	 */
	let {
		values,
		color,
		height = 28,
	}: { values: number[]; color: string; height?: number } = $props();

	const points = $derived(values.map((value, i) => ({ i, value })));
</script>

{#if points.length >= 2}
	<LineChart
		data={points}
		x="i"
		y="value"
		series={[{ key: 'value', color }]}
		axis={false}
		grid={false}
		rule={false}
		highlight={false}
		legend={false}
		tooltipContext={false}
		props={{ spline: { strokeWidth: 2 } }}
		padding={{ top: 3, bottom: 3, left: 1, right: 1 }}
		motion={prefersReducedMotion.current ? 'none' : undefined}
		{height}
	/>
{:else}
	<div style="height: {height}px"></div>
{/if}

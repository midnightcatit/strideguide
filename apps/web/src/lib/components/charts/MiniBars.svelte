<script lang="ts">
	import { BarChart } from 'layerchart';
	import { prefersReducedMotion } from 'svelte/motion';

	/**
	 * A tiny row of bars for a card's mini visualisation, no axes or tooltip. The
	 * values keep one palette colour, so the row matches the chart it stands in
	 * for. Renders nothing with no readings. Drawn on LayerChart so it moves with
	 * the rest of the family, and the bars hold still under reduced motion.
	 */
	let {
		values,
		color,
		height = 22,
	}: { values: number[]; color: string; height?: number } = $props();

	const data = $derived(values.map((value, i) => ({ key: String(i), value })));
	const motion = $derived(prefersReducedMotion.current ? 'none' : undefined);
</script>

{#if data.length}
	<BarChart
		{data}
		x="key"
		y="value"
		series={[{ key: 'value', color }]}
		axis={false}
		grid={false}
		rule={false}
		highlight={false}
		legend={false}
		tooltipContext={false}
		props={{ bars: { radius: 1 } }}
		padding={{ top: 2, bottom: 0, left: 0, right: 0 }}
		{motion}
		{height}
	/>
{:else}
	<div style="height: {height}px"></div>
{/if}

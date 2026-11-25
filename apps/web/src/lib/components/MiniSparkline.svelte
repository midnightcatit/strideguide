<script lang="ts">
	import { sparklineGeometry } from '$lib/miniChart';

	/**
	 * A tiny trend line for a query-value tile, no axes, tooltip or chart library.
	 * The line keeps the metric's family colour, so the sparkline matches the chart
	 * it stands in for. It is a plain SVG path: nothing to animate, so it always
	 * holds still, which also keeps it safe under prefers-reduced-motion. Renders
	 * nothing with fewer than two readings, so a lone day is never drawn flat.
	 */
	let {
		values,
		color,
		height = 28,
	}: { values: number[]; color: string; height?: number } = $props();

	// A fixed internal width; the SVG scales it to the tile with
	// preserveAspectRatio, and a non-scaling stroke keeps the line crisp.
	const WIDTH = 100;
	const geo = $derived(sparklineGeometry(values, WIDTH, height));
</script>

{#if geo}
	<svg
		class="block w-full"
		viewBox="0 0 {WIDTH} {height}"
		preserveAspectRatio="none"
		{height}
		aria-hidden="true"
	>
		<path
			d={geo.d}
			fill="none"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
		/>
	</svg>
{:else}
	<div style="height: {height}px"></div>
{/if}

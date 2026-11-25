<script lang="ts">
	import { barRects } from '$lib/miniChart';

	/**
	 * A tiny row of bars for a card's mini visualisation, no axes, tooltip or
	 * chart library. The bars keep one palette colour, so the row matches the
	 * chart it stands in for. A plain SVG strip, so it holds still and stays safe
	 * under prefers-reduced-motion. Renders nothing with no readings.
	 */
	let {
		values,
		color,
		height = 22,
	}: { values: number[]; color: string; height?: number } = $props();

	const WIDTH = 100;
	const bars = $derived(barRects(values, WIDTH, height));
</script>

{#if bars.length}
	<svg
		class="block w-full"
		viewBox="0 0 {WIDTH} {height}"
		preserveAspectRatio="none"
		{height}
		aria-hidden="true"
	>
		{#each bars as bar, i (i)}
			<rect x={bar.x} y={bar.y} width={bar.w} height={bar.h} rx={bar.r} fill={color} />
		{/each}
	</svg>
{:else}
	<div style="height: {height}px"></div>
{/if}

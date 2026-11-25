<script lang="ts">
	import { ArcChart } from 'layerchart';
	import { prefersReducedMotion } from 'svelte/motion';
	import { TRAINING_PROGRESS, CHART_EMPTY } from '$lib/chartPalette';

	/**
	 * The circular progress-to-goal ring, drawn on LayerChart's ArcChart so it
	 * animates to a new value instead of snapping. The shape and the percentage
	 * are the same as the hand-built ring: a full track behind, and one arc from
	 * the top going clockwise. The arc keeps the training palette's green, so the
	 * dashboard and the progress page read as the same family as the other
	 * charts. The reduced-motion setting swaps the arc in instantly.
	 */
	let {
		percent,
		size = 64,
		stroke = 7,
		showLabel = true,
		color = TRAINING_PROGRESS,
	}: {
		percent: number;
		size?: number;
		stroke?: number;
		showLabel?: boolean;
		color?: string;
	} = $props();

	const clamped = $derived(Math.max(0, Math.min(100, Math.round(percent))));
	const motion = $derived(prefersReducedMotion.current ? 'none' : 'tween');
	// The arc spans exactly the stroke width, so the outer edge reaches the box.
	const inner = $derived(size / 2 - stroke);
	const outer = $derived(size / 2);
</script>

<div
	class="relative inline-flex shrink-0 items-center justify-center"
	style="width: {size}px; height: {size}px"
	role="img"
	aria-label="{clamped} percent complete"
>
	<ArcChart
		data={[{ key: 'progress', value: clamped, color }]}
		maxValue={100}
		range={[0, 360]}
		innerRadius={inner}
		outerRadius={outer}
		cornerRadius={clamped > 0 ? stroke / 2 : 0}
		width={size}
		height={size}
		padding={0}
		legend={false}
		tooltipContext={false}
		props={{ arc: { tooltip: false, motion, track: { fill: CHART_EMPTY } } }}
	/>
	{#if showLabel}
		<span class="tabular absolute text-sm font-semibold">{clamped}%</span>
	{/if}
</div>

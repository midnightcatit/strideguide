<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { TRAINING_PROGRESS, CHART_EMPTY } from '$lib/chartPalette';

	/**
	 * The circular progress-to-goal ring, drawn by hand as two SVG circles: a full
	 * track behind, and one arc from the top going clockwise. The arc keeps the
	 * training palette's green, so the ring reads as the same family as the other
	 * charts. The arc tweens to a new value through a stroke-dashoffset transition, which the reduced-motion setting drops, so it
	 * snaps instead. This is a single indicator, not a chart, so it needs no chart
	 * library.
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
	const reduce = $derived(prefersReducedMotion.current);
	// The arc spans exactly the stroke width, so the outer edge reaches the box.
	const r = $derived(size / 2 - stroke / 2);
	const circumference = $derived(2 * Math.PI * r);
	const dashOffset = $derived(circumference * (1 - clamped / 100));
</script>

<div
	class="relative inline-flex shrink-0 items-center justify-center"
	style="width: {size}px; height: {size}px"
	role="img"
	aria-label="{clamped} percent complete"
>
	<svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
		<g transform="rotate(-90 {size / 2} {size / 2})">
			<circle
				cx={size / 2}
				cy={size / 2}
				{r}
				fill="none"
				stroke={CHART_EMPTY}
				stroke-width={stroke}
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				{r}
				fill="none"
				stroke={color}
				stroke-width={stroke}
				stroke-linecap="round"
				style="stroke-dasharray: {circumference}; stroke-dashoffset: {dashOffset}; transition: stroke-dashoffset {reduce
					? '0s'
					: 'var(--dur-3) var(--ease-out)'}"
			/>
		</g>
	</svg>
	{#if showLabel}
		<span class="tabular absolute text-sm font-semibold">{clamped}%</span>
	{/if}
</div>

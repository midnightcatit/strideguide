<script lang="ts">
	/**
	 * A single horizontal stacked bar, for a whole split into ordered parts such
	 * as the completed-intensity mix or the phase of the plan. Every part is one
	 * palette hue at its own strength, so the bar reads as one metric divided up
	 * rather than a set of unrelated colours. Presentation only; the page sets the
	 * parts, their sizes and the label.
	 */
	let {
		segments,
		color,
		height = 16,
		ariaLabel,
	}: {
		segments: { label: string; value: number; opacity: number }[];
		color: string;
		height?: number;
		ariaLabel?: string;
	} = $props();

	const total = $derived(segments.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1);
</script>

<div
	class="flex w-full overflow-hidden rounded-full"
	style="height: {height}px"
	role="img"
	aria-label={ariaLabel}
>
	{#each segments as segment (segment.label)}
		<div
			style="width: {(Math.max(0, segment.value) / total) * 100}%; background: {color}; opacity: {segment.opacity}"
		></div>
	{/each}
</div>

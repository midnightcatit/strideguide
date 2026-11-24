<script lang="ts">
	/**
	 * A horizontal segmented indicator: one segment per item, filled when done,
	 * with the percentage beside it. A segment can instead read as skipped, its
	 * own muted state, so a skipped session never looks like an empty one.
	 * Horizontal on purpose, so a card can carry a progress read without the
	 * roundness of a ring. Fills animate with transform only (scaleX from the
	 * left), so nothing reflows and reduced motion zeroes it.
	 */
	let {
		segments,
		percent,
		size = 'md',
		showPercent = true,
		ariaLabel,
	}: {
		segments: { filled: boolean; skipped?: boolean; label?: string }[];
		percent: number;
		size?: 'sm' | 'md' | 'lg';
		showPercent?: boolean;
		ariaLabel?: string;
	} = $props();

	const clamped = $derived(Math.max(0, Math.min(100, Math.round(percent))));
	const height = $derived(size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2');
</script>

<div class="flex items-center gap-3">
	<div
		class="flex min-w-0 flex-1 items-stretch gap-1"
		role="img"
		aria-label={ariaLabel ?? `${clamped} percent done`}
	>
		{#each segments as seg, i (i)}
			<span class="relative flex-1 overflow-hidden rounded-full bg-hairline {height}">
				<span
					class="absolute inset-0 origin-left rounded-full {seg.filled ? 'bg-ok' : seg.skipped ? 'bg-steel' : 'bg-ok'}"
					style="transform: scaleX({seg.filled || seg.skipped ? 1 : 0}); transition: transform var(--dur-2) var(--ease-out)"
				></span>
			</span>
		{/each}
	</div>
	{#if showPercent}
		<span class="tabular shrink-0 text-sm font-semibold">{clamped}%</span>
	{/if}
</div>

<script lang="ts">
	/**
	 * A small bar chart for one daily metric. Bars can be a single value, or a set
	 * of stacked segments for a metric that has parts, such as sleep stages. An
	 * optional hairline marks the average of the days that have a reading.
	 */
	let {
		points,
		format = (n: number) => String(Math.round(n)),
		height = 72,
		ariaLabel,
		barClass = 'bg-ink/55',
		showAverage = false,
		legend,
	}: {
		points: { x: string; value?: number | null; segments?: { value: number; cls: string }[] }[];
		format?: (n: number) => string;
		height?: number;
		ariaLabel: string;
		barClass?: string;
		showAverage?: boolean;
		legend?: { label: string; cls: string }[];
	} = $props();

	const usable = $derived(height - 4);
	const totals = $derived(
		points.map((p) =>
			p.segments
				? p.segments.reduce((sum, seg) => sum + (seg.value > 0 ? seg.value : 0), 0)
				: typeof p.value === 'number'
					? p.value
					: 0,
		),
	);
	const maxTotal = $derived(Math.max(1, ...totals));
	const positives = $derived(totals.filter((t) => t > 0));
	const avg = $derived(
		positives.length ? positives.reduce((sum, t) => sum + t, 0) / positives.length : 0,
	);
	const barHeight = (t: number) => Math.max(t > 0 ? 2 : 0, Math.round((t / maxTotal) * usable));
</script>

<div class="relative" style="height: {height}px" role="img" aria-label={ariaLabel}>
	{#if showAverage && avg > 0}
		<div class="absolute left-0 right-0 border-t border-steel" style="bottom: {barHeight(avg)}px"></div>
	{/if}
	<div class="flex h-full items-end gap-0.5">
		{#each points as p, i (i)}
			<div class="flex h-full flex-1 items-end" title="{p.x}: {format(totals[i] ?? 0)}">
				{#if p.segments}
					<div class="flex w-full flex-col justify-end">
						{#each [...p.segments].reverse() as seg, j (j)}
							{#if seg.value > 0}
								<div class="{seg.cls} w-full rounded-[1px]" style="height: {barHeight(seg.value)}px"></div>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="{barClass} w-full rounded-[1px]" style="height: {barHeight(totals[i] ?? 0)}px"></div>
				{/if}
			</div>
		{/each}
	</div>
</div>
{#if legend}
	<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
		{#each legend as l (l.label)}
			<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-[2px] {l.cls}"></span> {l.label}</span>
		{/each}
	</div>
{/if}

<script lang="ts">
	import Card from './Card.svelte';
	import SegmentedBar from './SegmentedBar.svelte';

	/**
	 * The week at a glance. One component so the dashboard and the progress tab
	 * show the same card; only the origin differs, which sets where the card opens.
	 */
	let {
		done,
		planned,
		skipped,
		percent,
		segments,
		from = '/progress',
	}: {
		done: number;
		planned: number;
		skipped: number;
		percent: number;
		segments: { filled: boolean; skipped: boolean }[];
		from?: string;
	} = $props();

	const href = $derived(`/progress/week?from=${from}`);
</script>

<a {href} class="lift block h-full rounded-xl" aria-label="This week, open the week breakdown">
	<Card tone="sunken" class="flex h-full flex-col">
		<p class="tabular text-[10px] uppercase tracking-widest text-steel">This week</p>
		<p class="tabular mt-1 text-xl font-semibold">{done}<span class="text-sm text-steel">/{planned}</span>{#if skipped}<span class="text-sm text-steel"> · {skipped} skipped</span>{/if}</p>
		<div class="mt-2.5">
			<SegmentedBar
				{segments}
				{percent}
				size="sm"
				ariaLabel="{done} of {planned} sessions done this week{skipped ? `, ${skipped} skipped` : ''}"
			/>
		</div>
		<p class="mt-auto pt-2 text-[11px] text-signal-ink">See the week →</p>
	</Card>
</a>

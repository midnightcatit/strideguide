<script lang="ts">
	import Card from '$lib/components/Card.svelte';

	/**
	 * A short ranked list, for the best days in the window. Each row is a date
	 * with its value, in the metric's family colour. Presentation only; the page
	 * decides the order and the formatting.
	 */
	let {
		title,
		color,
		rows,
		note,
	}: {
		title: string;
		color: string;
		rows: { label: string; value: string }[];
		note?: string;
	} = $props();
</script>

<Card tone="sunken">
	<div class="flex items-center gap-2">
		<span class="h-2 w-2 shrink-0 rounded-full" style="background: {color}" aria-hidden="true"></span>
		<p class="tabular text-xs uppercase tracking-widest text-steel">{title}</p>
	</div>
	<ol class="mt-2 space-y-1">
		{#each rows as row, i (row.label)}
			<li class="flex items-baseline justify-between gap-3 border-b border-hairline py-1.5 last:border-b-0">
				<span class="flex items-baseline gap-2 text-sm">
					<span class="tabular w-4 text-xs text-steel">{i + 1}</span>
					<span>{row.label}</span>
				</span>
				<span class="tabular text-sm font-semibold">{row.value}</span>
			</li>
		{/each}
	</ol>
	{#if note}<p class="mt-3 text-xs text-steel">{note}</p>{/if}
</Card>

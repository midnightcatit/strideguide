<script lang="ts">
	import { Tooltip } from 'layerchart';

	export interface TooltipRow {
		label: string;
		value: string;
		color?: string;
	}

	/**
	 * The hover content shared by every chart: a header naming the day and one
	 * row per series, with a total when the chart stacks. Rendered inside a
	 * chart's `tooltip` snippet, so it reads the chart's own hover context.
	 * Values arrive already formatted, so units match the card.
	 */
	let {
		context,
		header,
		items,
		total,
		totalLabel = 'Total',
	}: {
		context: unknown;
		header: (data: any) => string;
		items: (data: any) => TooltipRow[];
		total?: (data: any) => string;
		totalLabel?: string;
	} = $props();
</script>

<Tooltip.Root context={context as never}>
	{#snippet children({ data })}
		<Tooltip.Header>{header(data)}</Tooltip.Header>
		<Tooltip.List>
			{#each items(data) as row (row.label)}
				<Tooltip.Item label={row.label} value={row.value} color={row.color} valueAlign="right" />
			{/each}
			{#if total}
				<Tooltip.Separator />
				<Tooltip.Item label={totalLabel} value={total(data)} valueAlign="right" />
			{/if}
		</Tooltip.List>
	{/snippet}
</Tooltip.Root>

<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { signed } from '$lib/chartTheme';

	/**
	 * One chart card: a title with its family colour, the current value and unit,
	 * an optional change against the previous window of the same length, the chart,
	 * and an optional note or legend. Presentation only; the chart is passed in as a
	 * snippet so every surface shares the same frame.
	 */
	let {
		title,
		value,
		unit,
		color,
		change = null,
		changeDecimals = 1,
		changeLabel = 'vs previous period',
		ariaLabel,
		summary,
		note,
		footer,
		children,
	}: {
		title: string;
		value: string;
		unit?: string;
		color?: string;
		change?: number | null;
		changeDecimals?: number;
		changeLabel?: string;
		ariaLabel?: string;
		/** A short text alternative for the chart, read in place of the marks. */
		summary?: string;
		note?: string;
		footer?: import('svelte').Snippet;
		children: import('svelte').Snippet;
	} = $props();

	// A descriptive name for the chart, built from what the card already shows
	// (title, current value and the change) so every chart is named for assistive
	// tech even when a caller passes nothing.
	const trend = $derived(change === null ? '' : `, ${signed(change, changeDecimals)} ${changeLabel}`);
	const label = $derived(ariaLabel ?? `${title}: ${value}${unit ? ` ${unit}` : ''}${trend}`);
	const text = $derived(summary ?? label);
</script>

<Card tone="sunken">
	<div class="flex items-baseline justify-between gap-3">
		<span class="flex items-center gap-2">
			{#if color}
				<span class="h-2 w-2 shrink-0 rounded-full" style="background: {color}" aria-hidden="true"></span>
			{/if}
			<p class="tabular text-xs uppercase tracking-widest text-steel">{title}</p>
		</span>
		<span class="flex items-baseline gap-1">
			<span class="tabular text-sm font-semibold">{value}</span>
			{#if unit}<span class="text-xs text-steel">{unit}</span>{/if}
		</span>
	</div>
	{#if change !== null}
		<p class="tabular mt-0.5 text-right text-[11px] text-steel">
			{signed(change, changeDecimals)} {changeLabel}
		</p>
	{/if}
	<figure class="m-0 mt-3">
		<div role="img" aria-label={label}>{@render children()}</div>
		<figcaption class="sr-only">{text}</figcaption>
	</figure>
	{#if note}<p class="mt-3 text-xs text-steel">{note}</p>{/if}
	{@render footer?.()}
</Card>

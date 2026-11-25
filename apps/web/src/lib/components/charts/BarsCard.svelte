<script lang="ts">
	import { BarChart, Bars, Spline, type ChartAnnotations } from 'layerchart';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChartCard from './ChartCard.svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import { shortDay } from '$lib/chartTheme';
	import { CHART_MUTED } from '$lib/chartPalette';

	/**
	 * A daily metric as bars, with an optional goal line. Takes the metric's
	 * family colour, a real axis and grid, and a hover tooltip. Used for steps,
	 * active energy and active-zone minutes, where each day stands on its own.
	 * When a `reference` is given, each point may carry that value too, drawn as a
	 * thin line over the bars (the weekly volume chart uses it for the planned
	 * distance); the bars and the line then read as one figure.
	 */
	let {
		title,
		value,
		unit,
		color,
		change = null,
		points,
		format,
		goal = null,
		reference = null,
		height = 150,
		minBarRatio = 0,
		note,
	}: {
		title: string;
		value: string;
		unit?: string;
		color: string;
		change?: number | null;
		points: { date: string; value: number | null; reference?: number | null }[];
		format: (n: number) => string;
		goal?: { value: number; label?: string } | null;
		reference?: { label?: string; color?: string } | null;
		height?: number;
		/**
		 * The smallest fraction of the tallest bar a non-zero value may draw, so a
		 * light week next to a heavy one still shows instead of vanishing. The bar
		 * grows to this floor; the tooltip and axis keep the real number. Zero
		 * leaves the true height, for charts where a small value should read small.
		 */
		minBarRatio?: number;
		note?: string;
	} = $props();

	const motion = $derived(prefersReducedMotion.current ? 'none' : undefined);

	const summary = $derived(
		points.length
			? `${title}: ${value}${unit ? ` ${unit}` : ''} latest, over ${points.length} ${points.length === 1 ? 'day' : 'days'}.`
			: `${title}: no readings in this window.`,
	);

	const maxValue = $derived(Math.max(0, ...points.map((p) => p.value ?? 0)));
	const floor = $derived(minBarRatio > 0 && maxValue > 0 ? maxValue * minBarRatio : 0);

	const data = $derived(
		points.map((p) => {
			const actual = p.value ?? 0;
			return {
				date: p.date,
				value: actual > 0 && floor > 0 ? Math.max(actual, floor) : actual,
				actual,
				reference: p.reference ?? 0,
			};
		}),
	);

	const annotations = $derived<ChartAnnotations>(
		goal
			? [
					{
						type: 'line',
						y: goal.value,
						label: goal.label ?? 'Goal',
						labelPlacement: 'top',
						labelXOffset: 4,
						labelYOffset: -2,
						props: {
							line: { stroke: CHART_MUTED, dashArray: [3, 3], strokeWidth: 1.5 },
							label: { fill: CHART_MUTED },
						},
					},
				]
			: [],
	);
</script>

<ChartCard {title} {value} {unit} {color} {change} {summary} {note}>
	<BarChart
		{data}
		x="date"
		y="value"
		series={[{ key: 'value', label: title, color }]}
		axis={true}
		grid={true}
		legend={false}
		{annotations}
		props={{
			xAxis: { format: (v: string) => shortDay(v), tickLength: 0, stroke: 'var(--hairline)', fill: 'var(--steel)' },
			yAxis: { format, tickLength: 0, stroke: 'var(--hairline)', fill: 'var(--steel)' },
			grid: { y: { stroke: 'var(--hairline)', strokeWidth: 1 } },
			bars: { radius: 3 },
		}}
		padding={{ top: 8, right: 8, bottom: 22, left: 48 }}
		{motion}
		{height}
	>
		{#if reference}
			{#snippet marks({ context }: { context: any })}
				{#each context.series.visibleSeries as s (s.key)}
					<Bars seriesKey={s.key} radius={3} />
				{/each}
				<Spline
					data={data}
					x="date"
					y="reference"
					stroke={reference.color ?? CHART_MUTED}
					strokeWidth={1.5}
				/>
			{/snippet}
		{/if}
		{#snippet tooltip({ context })}
			<ChartTooltip
				{context}
				header={(d) => shortDay(d.date)}
				items={(d) => [
					{ label: title, value: format(d.actual), color },
					...(reference
						? [{ label: reference.label ?? 'Planned', value: format(d.reference) }]
						: []),
				]}
			/>
		{/snippet}
	</BarChart>
</ChartCard>

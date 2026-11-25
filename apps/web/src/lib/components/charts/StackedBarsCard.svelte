<script lang="ts">
	import { BarChart } from 'layerchart';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChartCard from './ChartCard.svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import { shortDay } from '$lib/chartTheme';

	interface Stage {
		key: string;
		label: string;
		opacity: number;
	}

	/**
	 * Stacked bars with a total, for a metric that has parts, such as the sleep
	 * stages. Every stage is the metric's family colour at its own strength, so
	 * the stack reads as one metric; the legend below repeats those strengths so
	 * the swatches match the bars. The tooltip lists each stage and the night's
	 * total.
	 */
	let {
		title,
		value,
		unit,
		color,
		change = null,
		points,
		stages,
		format,
		height = 170,
		note,
	}: {
		title: string;
		value: string;
		unit?: string;
		color: string;
		change?: number | null;
		points: { date: string; values: Record<string, number | null> }[];
		stages: Stage[];
		format: (n: number) => string;
		height?: number;
		note?: string;
	} = $props();

	const motion = $derived(prefersReducedMotion.current ? 'none' : undefined);

	const data = $derived(
		points.map((p) => {
			const row: Record<string, string | number> = { date: p.date };
			for (const s of stages) row[s.key] = p.values[s.key] ?? 0;
			return row;
		}),
	);

	const series = $derived(
		stages.map((s) => ({ key: s.key, label: s.label, color, props: { fillOpacity: s.opacity } })),
	);

	const totalOf = (d: Record<string, number>) =>
		stages.reduce((sum, s) => sum + (d[s.key] ?? 0), 0);
</script>

<ChartCard {title} {value} {unit} {color} {change} {note}>
	<BarChart
		{data}
		x="date"
		y={stages.map((s) => s.key)}
		{series}
		axis={true}
		grid={true}
		legend={false}
		props={{
			xAxis: { format: (v: string) => shortDay(v), tickLength: 0, stroke: 'var(--hairline)', fill: 'var(--steel)' },
			yAxis: { format, tickLength: 0, stroke: 'var(--hairline)', fill: 'var(--steel)' },
			grid: { y: { stroke: 'var(--hairline)', strokeWidth: 1 } },
			bars: { radius: 2 },
		}}
		padding={{ top: 8, right: 8, bottom: 22, left: 44 }}
		{motion}
		{height}
	>
		{#snippet tooltip({ context })}
			<ChartTooltip
				{context}
				header={(d) => shortDay(d.date)}
				items={(d) => stages.map((s) => ({ label: s.label, value: format(d[s.key] ?? 0), color }))}
				total={(d) => format(totalOf(d))}
			/>
		{/snippet}
	</BarChart>
	{#snippet footer()}
		<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
			{#each stages as s (s.key)}
				<span class="flex items-center gap-1.5">
					<span class="h-2.5 w-2.5 rounded-[2px]" style="background: {color}; opacity: {s.opacity}"></span>
					{s.label}
				</span>
			{/each}
		</div>
	{/snippet}
</ChartCard>

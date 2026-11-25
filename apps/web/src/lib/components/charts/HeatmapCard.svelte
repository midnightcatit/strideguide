<script lang="ts">
	import { Cell, Chart } from 'layerchart';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChartCard from './ChartCard.svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import { shortDay, toDate } from '$lib/chartTheme';

	/**
	 * A calendar heatmap: one column per week, one row per weekday, each cell the
	 * metric's family colour at a strength set by its value. A quiet cell is the
	 * same hue at a low strength rather than a different colour, so the whole grid
	 * reads as one metric. Carries a hover tooltip and a small value ramp legend.
	 */
	let {
		title,
		value,
		unit,
		color,
		points,
		format,
		height = 150,
		note,
	}: {
		title: string;
		value: string;
		unit?: string;
		color: string;
		points: { date: string; value: number | null }[];
		format: (n: number) => string;
		height?: number;
		note?: string;
	} = $props();

	const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	const motion = $derived(prefersReducedMotion.current ? 'none' : undefined);

	const max = $derived(Math.max(1, ...points.map((p) => p.value ?? 0)));

	const cells = $derived.by(() => {
		const out: { week: string; dow: string; date: string; value: number; level: number }[] = [];
		for (const p of points) {
			const d = toDate(p.date);
			if (!d) continue;
			const monday = new Date(d);
			monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
			const week = monday.toISOString().slice(0, 10);
			const day = d.getUTCDay();
			const dow = WEEKDAYS[day === 0 ? 6 : day - 1];
			const v = p.value ?? 0;
			out.push({ week, dow, date: p.date, value: v, level: v > 0 ? v / max : 0 });
		}
		return out;
	});

	const weekDomain = $derived([...new Set(cells.map((c) => c.week))].sort());

	const cellOpacity = (d: { level: number; value: number }) =>
		d.value > 0 ? 0.18 + 0.82 * d.level : 0.06;
</script>

<ChartCard {title} {value} {unit} {color} {note}>
	<Chart
		data={cells}
		x="week"
		y="dow"
		xDomain={weekDomain}
		yDomain={WEEKDAYS}
		axis={true}
		grid={false}
		rule={false}
		legend={false}
		highlight={false}
		tooltipContext={{ mode: 'band' }}
		props={{
			xAxis: { format: (v: string) => shortDay(v), tickLength: 0, stroke: 'var(--hairline)', fill: 'var(--steel)' },
			yAxis: { tickLength: 0, stroke: 'var(--hairline)', fill: 'var(--steel)' },
		}}
		padding={{ top: 6, right: 6, bottom: 20, left: 34 }}
		{motion}
		{height}
	>
		{#snippet marks()}
			<Cell x="week" y="dow" fill={color} opacity={cellOpacity} />
		{/snippet}
		{#snippet tooltip({ context })}
			<ChartTooltip
				{context}
				header={(d) => shortDay(d.date)}
				items={(d) => [{ label: title, value: format(d.value), color }]}
			/>
		{/snippet}
	</Chart>
	{#snippet footer()}
		<div class="mt-3 flex items-center gap-2 text-[11px] text-steel">
			<span>Less</span>
			<span
				class="h-2.5 w-20 rounded-sm"
				style="background: linear-gradient(to right, color-mix(in oklab, {color} 18%, transparent), {color})"
			></span>
			<span>More</span>
		</div>
	{/snippet}
</ChartCard>

<script lang="ts">
	import { Area, AreaChart, LineChart, Spline, type ChartAnnotations } from 'layerchart';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChartCard from './ChartCard.svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import { shortDay, toDate } from '$lib/chartTheme';

	/**
	 * A metric over the window, drawn as a line, or as a per-day band between a
	 * low and a high with the average over it. Takes an optional constant
	 * normal-range band and a goal line. The line keeps the metric's family
	 * colour; the band is the same colour, faint. The chart carries a real axis,
	 * grid and hover tooltip.
	 */
	let {
		title,
		value,
		unit,
		color,
		change = null,
		points,
		mode = 'line',
		band = null,
		goal = null,
		format,
		height = 150,
		note,
	}: {
		title: string;
		value: string;
		unit?: string;
		color: string;
		change?: number | null;
		points: { date: string; value?: number | null; low?: number | null; high?: number | null }[];
		mode?: 'line' | 'range';
		band?: [number, number] | null;
		goal?: { value: number; label?: string } | null;
		format: (n: number) => string;
		height?: number;
		note?: string;
	} = $props();

	const motion = $derived(prefersReducedMotion.current ? 'none' : undefined);

	const lineData = $derived(
		points
			.map((p) => ({ x: toDate(p.date), y: p.value ?? null, iso: p.date }))
			.filter((d): d is { x: Date; y: number | null; iso: string } => d.x !== null),
	);
	const rangeData = $derived(
		points
			.map((p) => ({
				x: toDate(p.date),
				avg: p.value ?? null,
				low: p.low ?? null,
				high: p.high ?? null,
				iso: p.date,
			}))
			.filter((d): d is { x: Date; avg: number | null; low: number | null; high: number | null; iso: string } => d.x !== null),
	);

	const axisLabel = (v: Date) => shortDay(v.toISOString());
	const cell = (v: number | null | undefined) => (typeof v === 'number' ? format(v) : 'no reading');
	const axisProps = $derived({
		xAxis: { format: axisLabel, tickLength: 0, stroke: 'var(--hairline)', fill: 'var(--steel)' },
		yAxis: { format, tickLength: 0, stroke: 'var(--hairline)', fill: 'var(--steel)' },
		grid: { y: { stroke: 'var(--hairline)', strokeWidth: 1 } },
	});

	const annotations = $derived.by<ChartAnnotations>(() => {
		const out: ChartAnnotations = [];
		if (band) {
			out.push({ type: 'range', y: band, fill: color, opacity: 0.12, layer: 'below' });
		}
		if (goal) {
			out.push({
				type: 'line',
				y: goal.value,
				label: goal.label ?? 'Goal',
				labelPlacement: 'top',
				labelXOffset: 4,
				labelYOffset: -2,
				props: {
					line: { stroke: 'var(--steel)', dashArray: [3, 3], strokeWidth: 1.5 },
					label: { fill: 'var(--steel)' },
				},
			});
		}
		return out;
	});
</script>

<ChartCard {title} {value} {unit} {color} {change} {note}>
	{#if mode === 'range'}
		<AreaChart
			data={rangeData}
			x="x"
			y={['avg', 'low', 'high']}
			axis={true}
			grid={true}
			legend={false}
			highlight={{ points: false, lines: true }}
			props={{
				...axisProps,
				spline: { strokeWidth: 2, stroke: color },
			}}
			padding={{ top: 8, right: 8, bottom: 22, left: 44 }}
			{motion}
			{height}
		>
			{#snippet marks()}
				<Area y0="low" y1="high" fill={color} opacity={0.16} />
				<Spline y="avg" stroke={color} />
			{/snippet}
			{#snippet tooltip({ context })}
				<ChartTooltip
					{context}
					header={(d) => shortDay(d.iso)}
					items={(d) => [
						{ label: 'Average', value: cell(d.avg), color },
						{ label: 'Low', value: cell(d.low) },
						{ label: 'High', value: cell(d.high) },
					]}
				/>
			{/snippet}
		</AreaChart>
	{:else}
		<LineChart
			data={lineData}
			x="x"
			y="y"
			series={[{ key: 'value', label: title, color }]}
			axis={true}
			grid={true}
			legend={false}
			annotations={annotations}
			props={{ ...axisProps, spline: { strokeWidth: 2, stroke: color } }}
			padding={{ top: 8, right: 8, bottom: 22, left: 44 }}
			{motion}
			{height}
		>
			{#snippet tooltip({ context })}
				<ChartTooltip
					{context}
					header={(d) => shortDay(d.iso)}
					items={(d) => [{ label: title, value: cell(d.y), color }]}
				/>
			{/snippet}
		</LineChart>
	{/if}
</ChartCard>

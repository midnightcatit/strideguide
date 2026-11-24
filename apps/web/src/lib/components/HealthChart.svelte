<script lang="ts">
	import { valueBounds, type ChartPoint } from '$lib/healthChart';

	/**
	 * One health series over time: a line, and an optional band between a low and
	 * a high reading on the same days. Evenly spaced readings, oldest on the left.
	 * The date and value travel on each point's title so a hover reads them back.
	 */
	let {
		points,
		mode = 'line',
		format = (n: number) => String(Math.round(n)),
		height = 96,
		ariaLabel,
		color = 'var(--cool)',
	}: {
		points: ChartPoint[];
		mode?: 'line' | 'band';
		format?: (n: number) => string;
		height?: number;
		ariaLabel: string;
		color?: string;
	} = $props();

	const W = 100;
	const PAD = 8;

	const geom = $derived.by(() => {
		const bounds = valueBounds(points);
		const span = bounds.max - bounds.min || 1;
		const xAt = (i: number) => (points.length <= 1 ? W / 2 : (i / (points.length - 1)) * W);
		const yAt = (v: number) => height - PAD - ((v - bounds.min) / span) * (height - PAD * 2);

		const line: string[] = [];
		const lows: string[] = [];
		const highs: string[] = [];
		const dots: { key: number; cx: number; cy: number | null }[] = [];
		points.forEach((p, i) => {
			const hasY = typeof p.y === 'number' && Number.isFinite(p.y);
			if (hasY) line.push(`${xAt(i)},${yAt(p.y as number)}`);
			if (typeof p.low === 'number' && typeof p.high === 'number') {
				lows.push(`${xAt(i)},${yAt(p.low)}`);
				highs.push(`${xAt(i)},${yAt(p.high)}`);
			}
			dots.push({ key: i, cx: xAt(i), cy: hasY ? yAt(p.y as number) : null });
		});

		return {
			linePoints: line.length >= 2 ? line.join(' ') : null,
			bandPoints: mode === 'band' && lows.length >= 2 ? [...lows, ...highs.reverse()].join(' ') : null,
			dots,
		};
	});
</script>

<div class="relative w-full" style="height: {height}px" role="img" aria-label={ariaLabel}>
	<svg viewBox="0 0 {W} {height}" preserveAspectRatio="none" class="h-full w-full" aria-hidden="true">
		{#if geom.bandPoints}
			<polygon points={geom.bandPoints} fill="var(--cool-wash)"></polygon>
		{/if}
		{#if geom.linePoints}
			<polyline
				points={geom.linePoints}
				fill="none"
				stroke={color}
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				vector-effect="non-scaling-stroke"
			></polyline>
		{:else}
			{#each geom.dots as dot (dot.key)}
				{#if dot.cy !== null}
					<circle cx={dot.cx} cy={dot.cy} r="1.6" fill={color}></circle>
				{/if}
			{/each}
		{/if}
	</svg>
	<div class="absolute inset-0 flex">
		{#each points as p, i (i)}
			<span class="h-full flex-1" title="{p.x}: {typeof p.y === 'number' ? format(p.y) : 'no reading'}"></span>
		{/each}
	</div>
</div>

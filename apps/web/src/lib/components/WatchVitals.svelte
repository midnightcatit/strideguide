<script lang="ts">
	import type { HealthDay, RecoverySignal } from '@strideguide/shared/plan';
	import MiniSparkline from '$lib/components/MiniSparkline.svelte';
	import { metricColor } from '$lib/chartTheme';

	/**
	 * Small watch-data visuals: resting heart rate, HRV and sleep, each with a
	 * tiny trend line when there is a series to draw. The trend is the hand-drawn
	 * MiniSparkline in the metric's family colour, so these read as the same family
	 * as the full health charts without pulling the chart library. The progress tab
	 * renders them, so the same numbers read the same way in both places.
	 */
	let {
		signal,
		days = [],
	}: {
		signal: RecoverySignal;
		days?: HealthDay[];
	} = $props();

	const ascending = $derived(
		[...days].filter((d) => !!d.date).sort((a, b) => a.date.localeCompare(b.date)),
	);

	const series = (pick: (d: HealthDay) => number | null | undefined): number[] =>
		ascending.map(pick).filter((v): v is number => typeof v === 'number');

	function fmtSleep(min: number): string {
		const h = Math.floor(min / 60);
		const m = Math.round(min % 60);
		return m ? `${h}h ${m}m` : `${h}h`;
	}

	const tiles = $derived.by(() => {
		const out: { key: string; label: string; value: string; values: number[] }[] = [];
		if (signal.avgRestingHr) {
			out.push({
				key: 'resting_hr',
				label: 'Resting HR',
				value: `${signal.avgRestingHr} bpm`,
				values: series((d) => d.restingHr),
			});
		}
		if (signal.avgHrvMs) {
			out.push({
				key: 'hrv_ms',
				label: 'HRV',
				value: `${signal.avgHrvMs} ms`,
				values: series((d) => d.hrvMs),
			});
		}
		if (signal.avgSleepMin) {
			out.push({
				key: 'sleep_min',
				label: 'Sleep',
				value: fmtSleep(signal.avgSleepMin),
				values: series((d) => d.sleepMin),
			});
		}
		return out;
	});
</script>

{#if tiles.length}
	<div class="grid grid-cols-3 gap-2">
		{#each tiles as tile (tile.key)}
			<div class="rounded-lg border border-hairline bg-sunken px-3 py-2.5">
				<p class="tabular text-[10px] uppercase tracking-widest text-steel">{tile.label}</p>
				<p class="tabular mt-0.5 text-base font-semibold">{tile.value}</p>
				<div class="mt-1.5">
					<MiniSparkline values={tile.values} color={metricColor(tile.key)} height={20} />
				</div>
			</div>
		{/each}
	</div>
	<p class="mt-2 text-xs text-steel">From the health data you have connected.</p>
{/if}

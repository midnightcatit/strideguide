<script lang="ts">
	import type { HealthMetricsPayload } from '$lib/api';
	import MiniSparkline from '$lib/components/MiniSparkline.svelte';
	import { metricColor } from '$lib/chartTheme';

	/**
	 * A short row of headlines for the condensed health cards. Takes the grouped
	 * payload and shows the metrics that are present, each with a tiny trend line
	 * in the metric's family colour. The trend is the hand-drawn MiniSparkline, so
	 * this dash widget carries no chart library. A metric the payload does not
	 * carry is left out, never shown as zero.
	 */
	let { payload, max = 6 }: { payload: HealthMetricsPayload | null; max?: number } = $props();

	function fmtSleep(min: number): string {
		const h = Math.floor(min / 60);
		const m = Math.round(min % 60);
		return m ? `${h}h ${m}m` : `${h}h`;
	}

	const DEFS: { key: string; label: string; format: (n: number) => string }[] = [
		{ key: 'resting_hr', label: 'Resting HR', format: (n) => `${Math.round(n)} bpm` },
		{ key: 'hrv_ms', label: 'HRV', format: (n) => `${Math.round(n)} ms` },
		{ key: 'sleep_min', label: 'Sleep', format: fmtSleep },
		{ key: 'steps', label: 'Steps', format: (n) => Math.round(n).toLocaleString() },
		{ key: 'spo2_avg', label: 'Blood oxygen', format: (n) => `${Math.round(n)} %` },
		{ key: 'vo2_max', label: 'VO2 max', format: (n) => n.toFixed(1) },
	];

	const metrics = $derived(payload?.metrics ?? {});

	const tiles = $derived(
		DEFS.filter((d) => (metrics[d.key]?.series?.length ?? 0) > 0)
			.slice(0, max)
			.map((d) => {
				const series = metrics[d.key]?.series ?? [];
				const latest = metrics[d.key]?.latest ?? null;
				return {
					key: d.key,
					label: d.label,
					value: latest ? d.format(latest.value) : 'No data',
					values: series.map((p) => p.value),
				};
			}),
	);
</script>

{#if tiles.length}
	<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
		{#each tiles as tile (tile.key)}
			<div class="rounded-lg border border-hairline bg-sunken px-3 py-2.5">
				<p class="tabular text-[10px] uppercase tracking-widest text-steel">{tile.label}</p>
				<p class="tabular mt-0.5 text-base font-semibold">{tile.value}</p>
				<div class="mt-1">
					<MiniSparkline values={tile.values} color={metricColor(tile.key)} height={20} />
				</div>
			</div>
		{/each}
	</div>
{/if}

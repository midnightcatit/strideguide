<script lang="ts">
	import type { HealthMetricsPayload } from '$lib/api';
	import { sparkline } from '$lib/healthChart';

	/**
	 * A short row of headlines for the condensed health cards. Takes the grouped
	 * payload and shows the metrics that are present, each with a tiny trend line.
	 * A metric the payload does not carry is left out, never shown as zero.
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
					points: sparkline(series.map((p) => p.value), 100, 20, 3),
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
				{#if tile.points}
					<svg viewBox="0 0 100 20" preserveAspectRatio="none" class="mt-1.5 h-5 w-full" aria-hidden="true">
						<polyline
							points={tile.points}
							fill="none"
							stroke="var(--cool)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							vector-effect="non-scaling-stroke"
						></polyline>
					</svg>
				{:else}
					<div class="mt-1.5 h-5"></div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<script lang="ts">
	import type { HealthDay, RecoverySignal } from '@strideguide/shared/plan';

	/**
	 * Small watch-data visuals: resting heart rate, HRV and sleep, each with a
	 * tiny trend line when there is a series to draw. Shared by the dashboard and
	 * the progress tab so the same numbers read the same way in both places.
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

	function spark(values: (number | null | undefined)[]): string | null {
		const nums = values.filter((v): v is number => typeof v === 'number');
		if (nums.length < 2) return null;
		const min = Math.min(...nums);
		const max = Math.max(...nums);
		const span = max - min || 1;
		return nums
			.map((v, i) => `${(i / (nums.length - 1)) * 100},${21 - ((v - min) / span) * 18}`)
			.join(' ');
	}

	function fmtSleep(min: number): string {
		const h = Math.floor(min / 60);
		const m = Math.round(min % 60);
		return m ? `${h}h ${m}m` : `${h}h`;
	}

	const tiles = $derived.by(() => {
		const out: { key: string; label: string; value: string; points: string | null }[] = [];
		if (signal.avgRestingHr) {
			out.push({
				key: 'rhr',
				label: 'Resting HR',
				value: `${signal.avgRestingHr} bpm`,
				points: spark(ascending.map((d) => d.restingHr)),
			});
		}
		if (signal.avgHrvMs) {
			out.push({
				key: 'hrv',
				label: 'HRV',
				value: `${signal.avgHrvMs} ms`,
				points: spark(ascending.map((d) => d.hrvMs)),
			});
		}
		if (signal.avgSleepMin) {
			out.push({
				key: 'sleep',
				label: 'Sleep',
				value: fmtSleep(signal.avgSleepMin),
				points: spark(ascending.map((d) => d.sleepMin)),
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
				{#if tile.points}
					<svg viewBox="0 0 100 24" preserveAspectRatio="none" class="mt-1.5 h-5 w-full" aria-hidden="true">
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
	<p class="mt-2 text-xs text-steel">From the health data you have connected.</p>
{/if}

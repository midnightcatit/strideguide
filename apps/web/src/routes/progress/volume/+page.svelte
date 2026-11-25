<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { volumeBuckets, weeklyKmSeries, metricOrigin } from '$lib/metrics';
	import { today } from '$lib/today.svelte';
	import { volumeComparisons } from '@strideguide/shared/comparisons';
	import Card from '$lib/components/Card.svelte';
	import MetricHeader from '$lib/components/MetricHeader.svelte';
	import BarsCard from '$lib/components/charts/BarsCard.svelte';
	import PlanError from '$lib/components/PlanError.svelte';
	import { TRAINING_PROGRESS } from '$lib/chartPalette';

	onMount(() => void ensurePlan());

	const from = $derived(metricOrigin(page.url.searchParams.get('from')));
	const todayIso = $derived(today.iso);
	const buckets = $derived(volumeBuckets(store.logs, todayIso));
	const weekly = $derived(weeklyKmSeries(store.logs, todayIso, 12));
	const weeklyPoints = $derived(weekly.map((w) => ({ date: w.startIso, value: w.km })));
	const weeklyTotal = $derived(weekly.reduce((sum, w) => sum + w.km, 0));
	const comparisons = $derived(volumeComparisons(buckets.allTimeKm));

	const tiles = $derived([
		{ key: 'today', label: 'Today', km: buckets.todayKm },
		{ key: 'week', label: 'This week', km: buckets.weekKm },
		{ key: 'month', label: 'This month', km: buckets.monthKm },
		{ key: 'year', label: 'This year', km: buckets.yearKm },
		{ key: 'all', label: 'All time', km: buckets.allTimeKm },
	]);
</script>

<MetricHeader title="Distance" {from} />

{#if store.error}
	<PlanError message={store.error} />
{:else if !store.loaded}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if buckets.sessions === 0}
	<Card>
		<p class="text-sm text-steel">Nothing logged yet. Volume shows up here once you log a run.</p>
	</Card>
{:else}
	<Card>
		<p class="tabular text-xs uppercase tracking-widest text-steel">Distance logged</p>
		<div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
			{#each tiles as tile (tile.key)}
				<div>
					<p class="text-xs text-steel">{tile.label}</p>
					<p class="tabular mt-0.5 text-lg font-semibold">{fmtDistance(tile.km)}</p>
				</div>
			{/each}
		</div>
	</Card>

	<section aria-labelledby="v-weeks" class="mt-6">
		<h2 id="v-weeks" class="tabular mb-2 text-xs uppercase tracking-widest text-steel">Last 12 weeks</h2>
		<BarsCard
			title="Weekly distance"
			value={fmtDistance(weeklyTotal)}
			unit="last 12 weeks"
			color={TRAINING_PROGRESS}
			points={weeklyPoints}
			format={(n) => fmtDistance(n)}
			minBarRatio={0.04}
			note="Each bar is one week of distance logged. Empty weeks stay flat, and a light week keeps a small visible bar so a short run still shows."
		/>
	</section>

	{#if comparisons.length}
		<section aria-labelledby="v-compare" class="mt-6">
			<h2 id="v-compare" class="tabular mb-2 text-xs uppercase tracking-widest text-steel">All time, in other units</h2>
			<Card>
				<ul class="space-y-1.5 text-sm">
					{#each comparisons as c (c.id)}
						<li>{c.text}</li>
					{/each}
				</ul>
			</Card>
		</section>
	{/if}
{/if}

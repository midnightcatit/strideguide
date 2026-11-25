<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { page } from '$app/state';
	import { type HealthMetricWindow, type HealthMetricsPayload } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { ensureHealth, healthFor } from '$lib/healthCache.svelte';
	import { metricOrigin } from '$lib/metrics';
	import Card from '$lib/components/Card.svelte';
	import MetricHeader from '$lib/components/MetricHeader.svelte';

	/**
	 * The health drill-down: a 7, 30 or 90 day window of every metric the API
	 * reports. This route is a shell: it reads the shared cache, draws the window
	 * tabs and the empty or failed states, and loads the chart body lazily, so the
	 * chart library is not in the route's own chunk and the rest of the app never
	 * pays for it until these charts are about to be drawn.
	 */

	const from = $derived(metricOrigin(page.url.searchParams.get('from')));

	const windows: HealthMetricWindow[] = [7, 30, 90];
	let windowDays = $state<HealthMetricWindow>(30);
	// Read from the shared cache, so a window that was already pulled renders
	// instantly and only revalidates once the reuse window has passed.
	const payload = $derived(healthFor(auth.user?.id ?? null, windowDays));
	let loading = $state(healthFor(auth.user?.id ?? null, 30) === null);
	let failed = $state(false);

	/**
	 * Render the cached window straight away, then revalidate in the background.
	 * A fresh cache means toggling a window that was already read does not refetch.
	 */
	async function load(w: HealthMetricWindow = windowDays) {
		windowDays = w;
		failed = false;
		const userId = auth.user?.id ?? null;
		loading = healthFor(userId, w) === null;
		if (!userId) {
			loading = false;
			return;
		}
		try {
			await ensureHealth(userId, w);
		} catch {
			// The store keeps any cached data; only a cold miss reads as failed.
		}
		loading = false;
		failed = healthFor(userId, w) === null;
	}

	// The chart body is a dynamic import, so it (and the chart library behind it)
	// lands in its own chunk that the initial route never loads.
	type ChartsProps = { payload: HealthMetricsPayload; windowDays: HealthMetricWindow };
	let Charts = $state<Component<ChartsProps> | null>(null);
	let chartsFailed = $state(false);

	onMount(() => {
		void load(30);
		void import('./HealthCharts.svelte')
			.then((m) => {
				Charts = m.default;
			})
			.catch(() => {
				chartsFailed = true;
			});
	});

	const metrics = $derived(payload?.metrics ?? {});
	const samples = $derived(payload?.samples ?? {});
	const hasMetrics = $derived(Object.keys(metrics).length > 0 || Object.keys(samples).length > 0);
</script>

<MetricHeader title="Health data" {from} />

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div class="flex flex-wrap gap-1.5" role="group" aria-label="Time window">
		{#each windows as w (w)}
			<button
				type="button"
				aria-pressed={windowDays === w}
				onclick={() => void load(w)}
				class="rounded-md border px-3 py-1.5 text-xs font-medium {windowDays === w
					? 'border-signal bg-signal-wash text-signal-ink'
					: 'border-hairline text-steel hover:border-signal'}"
			>
				{w} days
			</button>
		{/each}
	</div>
</div>

{#if loading}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if failed}
	<Card>
		<p class="text-sm text-steel">Could not load your health data. Try again, or sync to pull the latest.</p>
	</Card>
{:else if !payload?.available}
	<Card>
		<p class="font-display text-lg font-medium">No health data yet</p>
		<p class="mt-1 text-sm text-steel">Connect a health app or watch in Settings, then sync there. Health metrics show up here for the days your device reports them.</p>
	</Card>
{:else if !hasMetrics}
	<Card>
		<p class="font-display text-lg font-medium">Nothing in the last {windowDays} days</p>
		<p class="mt-1 text-sm text-steel">Try a longer window, or sync in Settings to pull the latest from your device.</p>
	</Card>
{:else if chartsFailed}
	<Card>
		<p class="text-sm text-steel">Could not load the charts just now. Reload the page to try again.</p>
	</Card>
{:else if Charts}
	<Charts {payload} {windowDays} />
{:else}
	<p class="tabular text-sm text-steel">Loading…</p>
{/if}

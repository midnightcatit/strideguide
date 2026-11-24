<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api, type HealthMetricWindow, type HealthMetricsPayload } from '$lib/api';
	import { metricOrigin } from '$lib/metrics';
	import { fmtDistance } from '$lib/prefs.svelte';
	import type { ChartPoint } from '$lib/healthChart';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import MetricHeader from '$lib/components/MetricHeader.svelte';
	import HealthChart from '$lib/components/HealthChart.svelte';
	import HealthBars from '$lib/components/HealthBars.svelte';
	import SyncButton from '$lib/components/SyncButton.svelte';

	/**
	 * The health drill-down: every metric the API reports over a 7, 30 or 90 day
	 * window, each charted when it is present. A metric the payload does not carry
	 * is skipped, not drawn as zero. Units for distance follow the user's prefs;
	 * the rest are display hints from the metric itself.
	 */

	const from = $derived(metricOrigin(page.url.searchParams.get('from')));

	const windows: HealthMetricWindow[] = [7, 30, 90];
	let windowDays = $state<HealthMetricWindow>(30);
	let payload = $state<HealthMetricsPayload | null>(null);
	let loading = $state(true);
	let failed = $state(false);

	async function load(w: HealthMetricWindow = windowDays) {
		windowDays = w;
		loading = true;
		failed = false;
		try {
			payload = await api.healthMetrics(w);
		} catch {
			failed = true;
			payload = null;
		} finally {
			loading = false;
		}
	}

	onMount(() => void load(30));

	const metrics = $derived(payload?.metrics ?? {});
	const samples = $derived(payload?.samples ?? {});
	const hasMetrics = $derived(Object.keys(metrics).length > 0 || Object.keys(samples).length > 0);

	function hasKey(key: string): boolean {
		return (metrics[key]?.series?.length ?? 0) > 0;
	}
	function dateMap(key: string): Record<string, number> {
		const out: Record<string, number> = {};
		for (const p of metrics[key]?.series ?? []) out[p.date] = p.value;
		return out;
	}
	function points(key: string): ChartPoint[] {
		return (metrics[key]?.series ?? []).map((p) => ({ x: p.date, y: p.value }));
	}
	function barPoints(key: string): { x: string; value: number }[] {
		return (metrics[key]?.series ?? []).map((p) => ({ x: p.date, value: p.value }));
	}
	function latestText(key: string, fmt: (n: number) => string): string {
		const v = metrics[key]?.latest?.value;
		return typeof v === 'number' ? fmt(v) : 'No data';
	}

	function fmtSleep(min: number): string {
		const h = Math.floor(min / 60);
		const m = Math.round(min % 60);
		return m ? `${h}h ${m}m` : `${h}h`;
	}
	const fmtKm = (m: number) => fmtDistance(m / 1000);

	// A band plus a line: the day's low to high, with the average drawn over it.
	const hrChart = $derived.by(() => {
		const min = dateMap('hr_min');
		const avg = dateMap('hr_avg');
		const max = dateMap('hr_max');
		const dates = [...new Set([...Object.keys(min), ...Object.keys(avg), ...Object.keys(max)])].sort();
		return dates.map((d) => ({ x: d, y: avg[d] ?? null, low: min[d] ?? null, high: max[d] ?? null }));
	});

	const spo2Chart = $derived.by(() => {
		const low = dateMap('spo2_low');
		const avg = dateMap('spo2_avg');
		const high = dateMap('spo2_high');
		const dates = [...new Set([...Object.keys(low), ...Object.keys(avg), ...Object.keys(high)])].sort();
		return dates.map((d) => ({ x: d, y: avg[d] ?? null, low: low[d] ?? null, high: high[d] ?? null }));
	});

	const sleepLegend = [
		{ label: 'Deep', cls: 'bg-ink' },
		{ label: 'REM', cls: 'bg-ink/60' },
		{ label: 'Light', cls: 'bg-ink/35' },
		{ label: 'Awake', cls: 'bg-steel' },
	];
	const hasStages = $derived(
		['sleep_deep_min', 'sleep_rem_min', 'sleep_light_min', 'sleep_awake_min'].some(hasKey),
	);
	const hasSleepTotal = $derived(hasKey('sleep_min'));

	const sleepPoints = $derived.by(() => {
		const deep = dateMap('sleep_deep_min');
		const rem = dateMap('sleep_rem_min');
		const light = dateMap('sleep_light_min');
		const awake = dateMap('sleep_awake_min');
		const dates = [...new Set([...Object.keys(deep), ...Object.keys(rem), ...Object.keys(light), ...Object.keys(awake)])].sort();
		return dates.map((d) => ({
			x: d,
			segments: [
				{ value: deep[d] ?? 0, cls: 'bg-ink' },
				{ value: rem[d] ?? 0, cls: 'bg-ink/60' },
				{ value: light[d] ?? 0, cls: 'bg-ink/35' },
				{ value: awake[d] ?? 0, cls: 'bg-steel' },
			],
		}));
	});

	const activity = $derived(
		[
			{ key: 'steps', label: 'Steps', format: (n: number) => Math.round(n).toLocaleString() },
			{ key: 'active_energy_kcal', label: 'Active energy', format: (n: number) => `${Math.round(n)} kcal` },
			{ key: 'floors', label: 'Floors', format: (n: number) => `${Math.round(n)}` },
			{ key: 'active_zone_min', label: 'Active zone minutes', format: (n: number) => `${Math.round(n)} min` },
			{ key: 'active_min', label: 'Active minutes', format: (n: number) => `${Math.round(n)} min` },
			{ key: 'total_calories_kcal', label: 'Total calories', format: (n: number) => `${Math.round(n)} kcal` },
			{ key: 'sedentary_min', label: 'Sedentary minutes', format: (n: number) => `${Math.round(n)} min` },
			{ key: 'altitude_gain_m', label: 'Altitude gain', format: (n: number) => `${Math.round(n)} m` },
		].filter((m) => hasKey(m.key)),
	);

	const SAMPLE_DEFS: Record<string, { label: string; format: (n: number) => string }> = {
		weight_kg: { label: 'Weight', format: (n) => `${n.toFixed(1)} kg` },
		body_fat_pct: { label: 'Body fat', format: (n) => `${n.toFixed(1)} %` },
		height_mm: { label: 'Height', format: (n) => `${Math.round(n)} mm` },
		core_temp_c: { label: 'Core temperature', format: (n) => `${n.toFixed(1)} °C` },
		blood_glucose_mgdl: { label: 'Blood glucose', format: (n) => `${Math.round(n)} mg/dL` },
	};
	function titleCase(key: string): string {
		return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}
	const sampleCards = $derived(
		Object.keys(samples)
			.filter((k) => (samples[k]?.series?.length ?? 0) > 0)
			.map((k) => {
				const def = SAMPLE_DEFS[k];
				const series = samples[k]?.series ?? [];
				const latest = samples[k]?.latest ?? null;
				const unit = latest?.unit ?? '';
				const format = def?.format ?? ((n: number) => (unit ? `${n} ${unit}` : String(n)));
				return {
					key: k,
					label: def?.label ?? titleCase(k),
					format,
					points: series.map((p) => ({ x: p.time.slice(0, 10), y: p.value })),
					value: latest ? format(latest.value) : 'No data',
				};
			}),
	);
</script>

{#snippet lineCard(label: string, value: string, pts: ChartPoint[], fmt: (n: number) => string)}
	<Card tone="sunken">
		<div class="flex items-baseline justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">{label}</p>
			<p class="tabular text-sm font-semibold">{value}</p>
		</div>
		<div class="mt-3">
			<HealthChart points={pts} format={fmt} height={72} ariaLabel="{label} over the last {windowDays} days" />
		</div>
	</Card>
{/snippet}

<MetricHeader eyebrow="Progress · Health" title="Health data" {from} />

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Time window">
		{#each windows as w (w)}
			<button
				type="button"
				role="tab"
				aria-selected={windowDays === w}
				onclick={() => void load(w)}
				class="rounded-md border px-3 py-1.5 text-xs font-medium {windowDays === w
					? 'border-signal bg-signal-wash text-signal-ink'
					: 'border-hairline text-steel hover:border-signal'}"
			>
				{w} days
			</button>
		{/each}
	</div>
	<SyncButton onSynced={() => void load(windowDays)} />
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
		<p class="mt-1 text-sm text-steel">Connect a health app or watch, then sync to fill this in. Health metrics show up here for the days your device reports them.</p>
	</Card>
{:else if !hasMetrics}
	<Card>
		<p class="font-display text-lg font-medium">Nothing in the last {windowDays} days</p>
		<p class="mt-1 text-sm text-steel">Try a longer window, or sync to pull the latest from your device.</p>
	</Card>
{:else}
	{#if hasKey('resting_hr') || hasKey('hrv_ms')}
		<section aria-labelledby="h-heart" class="mb-7">
			<SectionHeader id="h-heart" eyebrow="Heart" meta="Daily" />
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#if hasKey('resting_hr')}
					{@render lineCard('Resting HR', latestText('resting_hr', (n) => `${Math.round(n)} bpm`), points('resting_hr'), (n) => `${Math.round(n)} bpm`)}
				{/if}
				{#if hasKey('hrv_ms')}
					{@render lineCard('HRV', latestText('hrv_ms', (n) => `${Math.round(n)} ms`), points('hrv_ms'), (n) => `${Math.round(n)} ms`)}
				{/if}
			</div>
		</section>
	{/if}

	{#if hasKey('hr_min') || hasKey('hr_avg') || hasKey('hr_max')}
		<section aria-labelledby="h-hr" class="mb-7">
			<SectionHeader id="h-hr" eyebrow="Heart rate" meta="Min, average and max each day" />
			<Card tone="sunken">
				<HealthChart
					points={hrChart}
					mode="band"
					format={(n) => `${Math.round(n)} bpm`}
					height={110}
					ariaLabel="Heart rate minimum, average and maximum over the last {windowDays} days"
				/>
				<p class="mt-3 text-xs text-steel">The band is the day's minimum to maximum, and the line is the daily average.</p>
			</Card>
		</section>
	{/if}

	{#if hasKey('spo2_avg') || hasKey('spo2_low') || hasKey('spo2_high')}
		<section aria-labelledby="h-spo2" class="mb-7">
			<SectionHeader id="h-spo2" eyebrow="Blood oxygen" meta={latestText('spo2_avg', (n) => `${Math.round(n)} %`)} />
			<Card tone="sunken">
				<HealthChart
					points={spo2Chart}
					mode="band"
					format={(n) => `${n.toFixed(1)} %`}
					height={110}
					ariaLabel="Blood oxygen average with its low and high band over the last {windowDays} days"
				/>
				<p class="mt-3 text-xs text-steel">The band is the confidence range the device reports around each day's average.</p>
			</Card>
		</section>
	{/if}

	{#if hasKey('respiratory_rate') || hasKey('vo2_max')}
		<section aria-labelledby="h-fit" class="mb-7">
			<SectionHeader id="h-fit" eyebrow="Breathing and fitness" />
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#if hasKey('respiratory_rate')}
					{@render lineCard('Respiratory rate', latestText('respiratory_rate', (n) => `${n.toFixed(1)} /min`), points('respiratory_rate'), (n) => `${n.toFixed(1)} /min`)}
				{/if}
				{#if hasKey('vo2_max')}
					{@render lineCard('VO2 max', latestText('vo2_max', (n) => n.toFixed(1)), points('vo2_max'), (n) => n.toFixed(1))}
				{/if}
			</div>
		</section>
	{/if}

	{#if hasStages || hasSleepTotal}
		<section aria-labelledby="h-sleep" class="mb-7">
			<SectionHeader id="h-sleep" eyebrow="Sleep" meta={hasSleepTotal ? latestText('sleep_min', fmtSleep) : 'By stage'} />
			<Card tone="sunken">
				{#if hasStages}
					<HealthBars
						points={sleepPoints}
						format={fmtSleep}
						height={96}
						ariaLabel="Sleep stages each night over the last {windowDays} days"
						legend={sleepLegend}
					/>
				{:else}
					<HealthBars
						points={barPoints('sleep_min')}
						format={fmtSleep}
						height={96}
						ariaLabel="Sleep each night over the last {windowDays} days"
					/>
				{/if}
			</Card>
		</section>
	{/if}

	{#if hasKey('sleep_temp_c')}
		<section aria-labelledby="h-sleeptemp" class="mb-7">
			<SectionHeader id="h-sleeptemp" eyebrow="Sleep temperature" />
			{@render lineCard('Nightly skin temperature', latestText('sleep_temp_c', (n) => `${n.toFixed(1)} °C`), points('sleep_temp_c'), (n) => `${n.toFixed(1)} °C`)}
		</section>
	{/if}

	{#if activity.length}
		<section aria-labelledby="h-activity" class="mb-7">
			<SectionHeader id="h-activity" eyebrow="Activity" meta="Daily totals" />
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each activity as m (m.key)}
					<Card tone="sunken">
						<div class="flex items-baseline justify-between gap-3">
							<p class="tabular text-xs uppercase tracking-widest text-steel">{m.label}</p>
							<p class="tabular text-sm font-semibold">{latestText(m.key, m.format)}</p>
						</div>
						<div class="mt-3">
							<HealthBars
								points={barPoints(m.key)}
								format={m.format}
								height={64}
								ariaLabel="{m.label} over the last {windowDays} days"
								showAverage
							/>
						</div>
					</Card>
				{/each}
			</div>
		</section>
	{/if}

	{#if hasKey('distance_m')}
		<section aria-labelledby="h-distance" class="mb-7">
			<SectionHeader id="h-distance" eyebrow="Distance" meta={latestText('distance_m', fmtKm)} />
			<Card tone="sunken">
				<HealthBars
					points={barPoints('distance_m')}
					format={fmtKm}
					height={80}
					ariaLabel="Distance each day over the last {windowDays} days"
					barClass="bg-ok"
					showAverage
				/>
				<p class="mt-3 text-xs text-steel">Distance the device recorded each day, in your units.</p>
			</Card>
		</section>
	{/if}

	{#if sampleCards.length}
		<section aria-labelledby="h-samples" class="mb-7">
			<SectionHeader id="h-samples" eyebrow="Measurements" meta="{sampleCards.length} tracked" />
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each sampleCards as s (s.key)}
					{@render lineCard(s.label, s.value, s.points, s.format)}
				{/each}
			</div>
		</section>
	{/if}
{/if}

<script lang="ts">
	import { type HealthMetricWindow, type HealthMetricsPayload } from '$lib/api';
	import { fmtDistance, prefs } from '$lib/prefs.svelte';
	import {
		SLEEP_STAGES,
		metricColor,
		metricGoal,
		periodDelta,
		shortDay,
		spreadBand,
	} from '$lib/chartTheme';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import LazySection from '$lib/components/LazySection.svelte';
	import QueryValueCard from '$lib/components/charts/QueryValueCard.svelte';
	import TimeSeriesCard from '$lib/components/charts/TimeSeriesCard.svelte';
	import BarsCard from '$lib/components/charts/BarsCard.svelte';
	import StackedBarsCard from '$lib/components/charts/StackedBarsCard.svelte';
	import HeatmapCard from '$lib/components/charts/HeatmapCard.svelte';
	import TopListCard from '$lib/components/charts/TopListCard.svelte';

	/**
	 * The chart body of the health drill-down: every metric the API reports over
	 * the chosen window, each drawn with the widget that fits it. A metric keeps
	 * one family colour everywhere, gets a real axis, grid, tooltip and, where
	 * there are series, a legend. A metric the payload does not carry is skipped,
	 * never drawn as zero. Units for distance follow the user's prefs; the goal
	 * lines follow the user's goals, with the app default as the fallback.
	 *
	 * This component is the lazy boundary: the route loads it with a dynamic
	 * import, so the chart library (roughly 130 kB gzip) is not in the drill-down
	 * route's own chunk and only arrives when the charts are about to be drawn.
	 */
	let {
		payload,
		windowDays,
	}: { payload: HealthMetricsPayload; windowDays: HealthMetricWindow } = $props();

	const metrics = $derived(payload.metrics ?? {});
	const samples = $derived(payload.samples ?? {});

	function hasKey(key: string): boolean {
		return (metrics[key]?.series?.length ?? 0) > 0;
	}
	function series(key: string) {
		return metrics[key]?.series ?? [];
	}
	function values(key: string): number[] {
		return series(key).map((p) => p.value);
	}
	function latest(key: string): number | null {
		const value = metrics[key]?.latest?.value;
		if (typeof value === 'number') return value;
		const points = series(key);
		return points.length ? points[points.length - 1].value : null;
	}
	/** The change against the previous window of the same length. */
	function delta(key: string): number | null {
		return periodDelta(values(key), payload.previous?.[key]);
	}
	/** The window's own typical range, for a normal-range band. */
	function band(key: string): [number, number] | null {
		return spreadBand(values(key));
	}
	function points(key: string): { date: string; value: number }[] {
		return series(key).map((p) => ({ date: p.date, value: p.value }));
	}
	function valueText(key: string, format: (n: number) => string): string {
		const v = latest(key);
		return v === null ? 'No data' : format(v);
	}
	/** The goal line for a metric, from the runner's prefs or the app default. */
	function goalLine(key: string): { value: number } | null {
		const goal = metricGoal(key, prefs);
		return goal === null ? null : { value: goal };
	}

	const fmtBpm = (n: number) => `${Math.round(n)} bpm`;
	const fmtMs = (n: number) => `${Math.round(n)} ms`;
	const fmtPct = (n: number) => `${n.toFixed(1)} %`;
	const fmtVo2 = (n: number) => n.toFixed(1);
	const fmtTemp = (n: number) => `${n.toFixed(1)} °C`;
	const fmtSteps = (n: number) => Math.round(n).toLocaleString();
	const fmtKcal = (n: number) => `${Math.round(n)} kcal`;
	const fmtMin = (n: number) => `${Math.round(n)} min`;
	const fmtFloors = (n: number) => `${Math.round(n)}`;
	const fmtMeters = (n: number) => `${Math.round(n)} m`;
	const fmtKm = (m: number) => fmtDistance(m / 1000);

	function fmtSleep(min: number): string {
		const h = Math.floor(min / 60);
		const m = Math.round(min % 60);
		return m ? `${h}h ${m}m` : `${h}h`;
	}

	/** The per-day low, average and high for a band plus line. */
	function rangePoints(avgKey: string, lowKey: string, highKey: string) {
		const avg = new Map(series(avgKey).map((p) => [p.date, p.value]));
		const low = new Map(series(lowKey).map((p) => [p.date, p.value]));
		const high = new Map(series(highKey).map((p) => [p.date, p.value]));
		const dates = [...new Set([...avg.keys(), ...low.keys(), ...high.keys()])].sort();
		return dates.map((date) => ({
			date,
			value: avg.get(date) ?? null,
			low: low.get(date) ?? null,
			high: high.get(date) ?? null,
		}));
	}

	const hasRange = $derived(hasKey('hr_min') || hasKey('hr_avg') || hasKey('hr_max'));
	const hasSpo2 = $derived(hasKey('spo2_avg') || hasKey('spo2_low') || hasKey('spo2_high'));

	const hasStages = $derived(SLEEP_STAGES.some((s) => hasKey(s.key)));
	const hasSleepTotal = $derived(hasKey('sleep_min'));

	const sleepPoints = $derived.by(() => {
		const byStage = new Map(SLEEP_STAGES.map((s) => [s.key, new Map(series(s.key).map((p) => [p.date, p.value]))]));
		const dates = [...new Set(SLEEP_STAGES.flatMap((s) => [...(byStage.get(s.key)?.keys() ?? [])]))].sort();
		return dates.map((date) => ({
			date,
			values: Object.fromEntries(SLEEP_STAGES.map((s) => [s.key, byStage.get(s.key)?.get(date) ?? null])),
		}));
	});

	/** A night's total: the reported total, or the sum of the stages. */
	const sleepNightly = $derived.by(() => {
		if (hasSleepTotal) return points('sleep_min');
		const dates = [...new Set(SLEEP_STAGES.flatMap((s) => series(s.key).map((p) => p.date)))].sort();
		return dates.map((date) => ({
			date,
			value: SLEEP_STAGES.reduce((sum, s) => sum + (series(s.key).find((p) => p.date === date)?.value ?? 0), 0),
		}));
	});

	const sleepTotalText = $derived.by(() => {
		const last = sleepNightly.at(-1);
		return last ? fmtSleep(last.value) : 'No data';
	});

	const activity = $derived(
		[
			{ key: 'steps', label: 'Steps', format: fmtSteps, goal: true },
			{ key: 'active_energy_kcal', label: 'Active energy', format: fmtKcal, goal: true },
			{ key: 'active_zone_min', label: 'Active zone minutes', format: fmtMin, goal: true },
			{ key: 'floors', label: 'Floors', format: fmtFloors, goal: false },
			{ key: 'active_min', label: 'Active minutes', format: fmtMin, goal: false },
			{ key: 'total_calories_kcal', label: 'Total calories', format: fmtKcal, goal: false },
			{ key: 'sedentary_min', label: 'Sedentary minutes', format: fmtMin, goal: false },
			{ key: 'altitude_gain_m', label: 'Altitude gain', format: fmtMeters, goal: false },
		].filter((m) => hasKey(m.key)),
	);

	const topSteps = $derived(
		series('steps')
			.filter((p) => p.value > 0)
			.sort((a, b) => b.value - a.value)
			.slice(0, 5)
			.map((p) => ({ label: shortDay(p.date), value: fmtSteps(p.value) })),
	);

	const SAMPLE_DEFS: Record<string, { label: string; unit?: string; decimals: number }> = {
		weight_kg: { label: 'Weight', unit: 'kg', decimals: 1 },
		body_fat_pct: { label: 'Body fat', unit: '%', decimals: 1 },
		height_mm: { label: 'Height', unit: 'mm', decimals: 0 },
		core_temp_c: { label: 'Core temperature', unit: '°C', decimals: 1 },
		blood_glucose_mgdl: { label: 'Blood glucose', unit: 'mg/dL', decimals: 0 },
	};
	function titleCase(key: string): string {
		return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}
	const sampleCards = $derived(
		Object.keys(samples)
			.filter((k) => (samples[k]?.series?.length ?? 0) > 0)
			.map((k) => {
				const def = SAMPLE_DEFS[k];
				const list = samples[k]?.series ?? [];
				const latestSample = samples[k]?.latest ?? list[list.length - 1] ?? null;
				return {
					key: k,
					label: def?.label ?? titleCase(k),
					unit: def?.unit ?? latestSample?.unit ?? undefined,
					decimals: def?.decimals ?? 1,
					values: list.map((p) => p.value),
					previous: payload.previous?.[k] ?? null,
					value: latestSample ? latestSample.value.toFixed(def?.decimals ?? 1) : 'No data',
				};
			}),
	);
</script>

{#if hasKey('resting_hr') || hasKey('hrv_ms')}
	<LazySection><section aria-labelledby="h-heart" class="mb-7">
		<SectionHeader id="h-heart" eyebrow="Heart" meta="Daily" />
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#if hasKey('resting_hr')}
				<QueryValueCard
					title="Resting HR"
					value={valueText('resting_hr', (n) => `${Math.round(n)}`)}
					unit="bpm"
					values={values('resting_hr')}
					previous={payload.previous?.['resting_hr']}
					color={metricColor('resting_hr')}
				/>
			{/if}
			{#if hasKey('hrv_ms')}
				<QueryValueCard
					title="HRV"
					value={valueText('hrv_ms', (n) => `${Math.round(n)}`)}
					unit="ms"
					values={values('hrv_ms')}
					previous={payload.previous?.['hrv_ms']}
					color={metricColor('hrv_ms')}
				/>
			{/if}
		</div>
		<div class="mt-3 space-y-3">
			{#if hasKey('resting_hr')}
				<TimeSeriesCard
					title="Resting HR"
					value={valueText('resting_hr', (n) => `${Math.round(n)}`)}
					unit="bpm"
					color={metricColor('resting_hr')}
					change={delta('resting_hr')}
					points={points('resting_hr')}
					band={band('resting_hr')}
					format={fmtBpm}
					note="The shaded band is your typical range, one standard deviation either side of the window mean."
				/>
			{/if}
			{#if hasKey('hrv_ms')}
				<TimeSeriesCard
					title="HRV"
					value={valueText('hrv_ms', (n) => `${Math.round(n)}`)}
					unit="ms"
					color={metricColor('hrv_ms')}
					change={delta('hrv_ms')}
					points={points('hrv_ms')}
					band={band('hrv_ms')}
					format={fmtMs}
					note="The shaded band is your typical range over this window, not a clinical target."
				/>
			{/if}
		</div>
	</section></LazySection>
{/if}

{#if hasRange}
	<LazySection><section aria-labelledby="h-hr" class="mb-7">
		<SectionHeader id="h-hr" eyebrow="Heart rate" meta="Min, average and max each day" />
		<TimeSeriesCard
			title="Daily heart rate"
			value={valueText('hr_avg', (n) => `${Math.round(n)}`)}
			unit="bpm"
			color={metricColor('hr_avg')}
			change={delta('hr_avg')}
			points={rangePoints('hr_avg', 'hr_min', 'hr_max')}
			mode="range"
			format={fmtBpm}
			height={170}
			note="The band is the day's minimum to maximum, and the line is the daily average."
		/>
	</section></LazySection>
{/if}

{#if hasSpo2}
	<LazySection><section aria-labelledby="h-spo2" class="mb-7">
		<SectionHeader id="h-spo2" eyebrow="Blood oxygen" meta={valueText('spo2_avg', fmtPct)} />
		<TimeSeriesCard
			title="Blood oxygen"
			value={valueText('spo2_avg', (n) => n.toFixed(1))}
			unit="%"
			color={metricColor('spo2_avg')}
			change={delta('spo2_avg')}
			points={rangePoints('spo2_avg', 'spo2_low', 'spo2_high')}
			mode="range"
			format={fmtPct}
			height={170}
			note="The band is the confidence range the device reports around each day's average."
		/>
	</section></LazySection>
{/if}

{#if hasKey('respiratory_rate') || hasKey('vo2_max')}
	<LazySection><section aria-labelledby="h-fit" class="mb-7">
		<SectionHeader id="h-fit" eyebrow="Breathing and fitness" />
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#if hasKey('respiratory_rate')}
				<QueryValueCard
					title="Respiratory rate"
					value={valueText('respiratory_rate', (n) => n.toFixed(1))}
					unit="/min"
					values={values('respiratory_rate')}
					previous={payload.previous?.['respiratory_rate']}
					color={metricColor('respiratory_rate')}
				/>
			{/if}
			{#if hasKey('vo2_max')}
				<QueryValueCard
					title="VO2 max"
					value={valueText('vo2_max', (n) => n.toFixed(1))}
					unit="ml/kg/min"
					values={values('vo2_max')}
					previous={payload.previous?.['vo2_max']}
					color={metricColor('vo2_max')}
				/>
			{/if}
		</div>
		{#if hasKey('vo2_max')}
			<div class="mt-3">
				<TimeSeriesCard
					title="VO2 max"
					value={valueText('vo2_max', (n) => n.toFixed(1))}
					unit="ml/kg/min"
					color={metricColor('vo2_max')}
					change={delta('vo2_max')}
					points={points('vo2_max')}
					format={fmtVo2}
				/>
			</div>
		{/if}
	</section></LazySection>
{/if}

{#if hasStages || hasSleepTotal}
	<LazySection><section aria-labelledby="h-sleep" class="mb-7">
		<SectionHeader id="h-sleep" eyebrow="Sleep" meta={hasSleepTotal || sleepNightly.length ? sleepTotalText : 'By stage'} />
		<div class="space-y-3">
			{#if hasStages}
				<StackedBarsCard
					title="Sleep stages"
					value={sleepTotalText}
					color={metricColor('sleep_min')}
					change={hasSleepTotal ? delta('sleep_min') : null}
					points={sleepPoints}
					stages={SLEEP_STAGES}
					format={fmtSleep}
				/>
			{:else}
				<BarsCard
					title="Sleep"
					value={sleepTotalText}
					color={metricColor('sleep_min')}
					change={delta('sleep_min')}
					points={points('sleep_min')}
					format={fmtSleep}
				/>
			{/if}
			{#if sleepNightly.length}
				<HeatmapCard
					title="Sleep each night"
					value={sleepTotalText}
					color={metricColor('sleep_min')}
					points={sleepNightly}
					format={fmtSleep}
				/>
			{/if}
		</div>
	</section></LazySection>
{/if}

{#if hasKey('sleep_temp_c')}
	<LazySection><section aria-labelledby="h-sleeptemp" class="mb-7">
		<SectionHeader id="h-sleeptemp" eyebrow="Sleep temperature" />
		<TimeSeriesCard
			title="Nightly skin temperature"
			value={valueText('sleep_temp_c', (n) => n.toFixed(1))}
			unit="°C"
			color={metricColor('sleep_temp_c')}
			change={delta('sleep_temp_c')}
			points={points('sleep_temp_c')}
			format={fmtTemp}
		/>
	</section></LazySection>
{/if}

{#if activity.length}
	<LazySection><section aria-labelledby="h-activity" class="mb-7">
		<SectionHeader id="h-activity" eyebrow="Activity" meta="Daily totals" />
		<div class="space-y-3">
			{#each activity as m (m.key)}
				<BarsCard
					title={m.label}
					value={valueText(m.key, m.format)}
					color={metricColor(m.key)}
					change={delta(m.key)}
					points={points(m.key)}
					format={m.format}
					goal={m.goal ? goalLine(m.key) : null}
				/>
			{/each}
			{#if hasKey('steps')}
				<HeatmapCard
					title="Steps each day"
					value={valueText('steps', fmtSteps)}
					color={metricColor('steps')}
					points={points('steps')}
					format={fmtSteps}
				/>
			{/if}
			{#if topSteps.length}
				<TopListCard title="Best days by steps" color={metricColor('steps')} rows={topSteps} />
			{/if}
		</div>
	</section></LazySection>
{/if}

{#if hasKey('distance_m')}
	<LazySection><section aria-labelledby="h-distance" class="mb-7">
		<SectionHeader id="h-distance" eyebrow="Distance" meta={valueText('distance_m', fmtKm)} />
		<BarsCard
			title="Distance"
			value={valueText('distance_m', fmtKm)}
			color={metricColor('distance_m')}
			change={delta('distance_m')}
			points={points('distance_m')}
			format={fmtKm}
			note="Distance the device recorded each day, in your units."
		/>
	</section></LazySection>
{/if}

{#if sampleCards.length}
	<LazySection><section aria-labelledby="h-samples" class="mb-7">
		<SectionHeader id="h-samples" eyebrow="Measurements" meta="{sampleCards.length} tracked" />
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each sampleCards as s (s.key)}
				<QueryValueCard
					title={s.label}
					value={s.value}
					unit={s.unit}
					values={s.values}
					previous={s.previous}
					color={metricColor(s.key)}
					decimals={s.decimals}
				/>
			{/each}
		</div>
	</section></LazySection>
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { metricOrigin } from '$lib/metrics';
	import { formatIsoDay, localIso } from '$lib/plan';
	import { TRAINING_LOAD } from '$lib/chartPalette';
	import Card from '$lib/components/Card.svelte';
	import MetricHeader from '$lib/components/MetricHeader.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import ProportionBar from '$lib/components/charts/ProportionBar.svelte';

	/**
	 * The plan overview: the whole race plan in one place. The ring shows where the
	 * plan stands, the phase bar and its legend show how the block is shaped, the
	 * race day is named, and every week is listed with its focus and volume. Opened
	 * from the plan-progress card on the Progress page.
	 */
	onMount(() => void ensurePlan());

	const from = $derived(metricOrigin(page.url.searchParams.get('from')));
	const todayIso = localIso();
	const plan = $derived(store.plan);
	const weeks = $derived(plan?.weeks ?? []);
	const totalWeeks = $derived(weeks.length);

	const loggedIds = $derived(
		new Set(store.logs.filter((l) => l.sessionId).map((l) => l.sessionId as string)),
	);
	const plannedCount = $derived(weeks.reduce((n, w) => n + w.sessions.length, 0));
	const completedCount = $derived(
		weeks.reduce((n, w) => n + w.sessions.filter((s) => loggedIds.has(s.id)).length, 0),
	);
	const percent = $derived(plannedCount ? Math.round((completedCount / plannedCount) * 100) : 0);

	const todayWeek = $derived(
		weeks.find((w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate),
	);

	// The plan's phases as one bar, deepening as the block loads: base is the
	// faintest, peak the strongest, and a taper falls back. Data over code, so a
	// new phase name still draws.
	const PHASE_OPACITY: Record<string, number> = { base: 0.25, build: 0.5, peak: 0.85, taper: 0.4 };
	const phaseSegments = $derived.by(() => {
		const segs: { phase: string; count: number }[] = [];
		for (const w of weeks) {
			const ph = w.phase ?? 'base';
			const last = segs[segs.length - 1];
			if (last && last.phase === ph) last.count++;
			else segs.push({ phase: ph, count: 1 });
		}
		return segs;
	});
	const phaseBars = $derived(
		phaseSegments.map((s) => ({
			label: s.phase,
			value: s.count,
			opacity: PHASE_OPACITY[s.phase] ?? 0.4,
		})),
	);

	const targetDate = $derived(plan?.goal?.targetDate ?? null);
	const raceLabel = $derived(
		targetDate
			? formatIsoDay(targetDate, {
					weekday: 'long',
					month: 'long',
					day: 'numeric',
					year: 'numeric',
				})
			: null,
	);
	const daysToRace = $derived(
		targetDate
			? Math.max(
					0,
					Math.round(
						(Date.parse(`${targetDate}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86400000,
					),
				)
			: null,
	);

	function weekRange(start: string | null, end: string | null): string {
		if (!start || !end) return '';
		const f = (iso: string) => formatIsoDay(iso, { month: 'short', day: 'numeric' });
		return `${f(start)} to ${f(end)}`;
	}
</script>

<MetricHeader title="Plan overview" {from} />

{#if !store.loaded}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if !plan}
	<p class="mt-6 text-sm text-steel">No plan yet. <a href="/onboarding" class="text-signal-ink hover:underline">Build one →</a></p>
{:else}
	<section aria-labelledby="pl-ring" class="mb-7">
		<SectionHeader id="pl-ring" eyebrow="Where you are" meta="{percent}% · {completedCount} of {plannedCount} logged" />
		<Card>
			<div class="flex items-center gap-4">
				<ProgressRing {percent} size={96} stroke={9} />
				<div class="min-w-0">
					<p class="font-display text-lg font-semibold">
						{#if todayWeek}
							Week {todayWeek.weekNumber} of {totalWeeks}
						{:else}
							{totalWeeks} weeks
						{/if}
					</p>
					{#if todayWeek?.phase}
						<p class="mt-0.5 text-sm text-steel">In the {todayWeek.phase} block</p>
					{/if}
					{#if daysToRace != null}
						<p class="mt-0.5 text-sm text-steel">{daysToRace} days to race</p>
					{/if}
				</div>
			</div>
		</Card>
	</section>

	{#if phaseSegments.length > 1}
		<section aria-labelledby="pl-phases" class="mb-7">
			<SectionHeader id="pl-phases" eyebrow="Phases" meta="{totalWeeks} weeks" />
			<Card>
				<ProportionBar segments={phaseBars} color={TRAINING_LOAD} height={10} ariaLabel="Plan phases, base to taper" />
				<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel">
					{#each phaseSegments as s (s.phase)}
						<li class="tabular capitalize">{s.phase} · {s.count} {s.count === 1 ? 'week' : 'weeks'}</li>
					{/each}
				</ul>
				<p class="mt-2 text-xs text-steel">Base is the faintest step, peak the strongest, so the bar reads as one block loading up.</p>
			</Card>
		</section>
	{/if}

	<section aria-labelledby="pl-race" class="mb-7">
		<SectionHeader id="pl-race" eyebrow="Race day" />
		<Card>
			{#if raceLabel}
				<p class="font-display text-lg font-medium">{raceLabel}</p>
				<p class="mt-0.5 text-sm text-steel">
					{daysToRace != null && daysToRace > 0 ? `${daysToRace} days to go.` : 'That day is here, or just past.'}
				</p>
			{:else}
				<p class="text-sm text-steel">No race date on this plan. It is built to keep you training well, not to peak for one day.</p>
			{/if}
		</Card>
	</section>

	<section aria-labelledby="pl-weeks" class="mb-7">
		<SectionHeader id="pl-weeks" eyebrow="The weeks" meta="{totalWeeks} planned" />
		<Card>
			<ul class="divide-y divide-hairline">
				{#each weeks as w (w.id)}
					<li class="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
						<div class="min-w-0">
							<p class="text-sm font-medium">
								Week {w.weekNumber}
								{#if w.id === todayWeek?.id}
									<span class="ml-1.5 rounded-full bg-signal-wash px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal-ink">Now</span>
								{/if}
							</p>
							{#if w.focus}
								<p class="mt-0.5 break-words text-sm text-steel">{w.focus}</p>
							{/if}
							<p class="tabular mt-0.5 text-xs text-steel">
								{weekRange(w.startDate, w.endDate)}{#if w.phase} · {w.phase}{/if}
							</p>
						</div>
						<div class="shrink-0 text-right">
							{#if w.targetVolumeKm}
								<p class="tabular text-sm">{fmtDistance(w.targetVolumeKm)}</p>
							{/if}
							<p class="text-[11px] text-steel">
								{w.sessions.length} {w.sessions.length === 1 ? 'session' : 'sessions'}
							</p>
						</div>
					</li>
				{/each}
			</ul>
		</Card>
	</section>
{/if}

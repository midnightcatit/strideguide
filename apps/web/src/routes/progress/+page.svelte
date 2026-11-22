<script lang="ts">
	import { onMount } from 'svelte';
	import { computeProgress, type WeekLike } from '@strideguide/shared/analytics';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { fmtDistance, fmtPace } from '$lib/prefs.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	onMount(() => {
		void ensurePlan();
	});

	const weeksLike = $derived<WeekLike[]>(
		(store.plan?.weeks ?? []).map((w) => ({ weekNumber: w.weekNumber, sessions: w.sessions })),
	);
	const metrics = $derived(store.plan ? computeProgress(store.logs, weeksLike) : null);
	const hasLogs = $derived(store.logs.length > 0);

	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);

	const volumeMax = $derived.by(() => {
		if (!metrics) return 0;
		return Math.max(1, ...metrics.volume.byWeek.flatMap((w) => [w.plannedKm, w.actualKm]));
	});

	const PACE_H = 72;
	const paceGeom = $derived.by(() => {
		const pts = metrics?.pace.points ?? [];
		if (pts.length < 3) return null;
		const paces = pts.map((p) => p.paceSecPerKm);
		const min = Math.min(...paces);
		const max = Math.max(...paces);
		const span = Math.max(1, max - min);
		return pts.map((p, i) => ({
			x: (i / (pts.length - 1)) * 100,
			y: ((p.paceSecPerKm - min) / span) * (PACE_H - 12) + 6,
			fast: p.paceSecPerKm === min,
		}));
	});
</script>

{#if !store.loaded}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if !store.plan}
	<p class="mt-6 text-sm text-steel">No plan yet. <a href="/onboarding" class="text-signal-ink hover:underline">Build one →</a></p>
{:else if !metrics}
	<p class="mt-6 text-sm text-steel">Nothing to show yet.</p>
{:else}
	<header class="mb-7">
		<p class="tabular text-xs uppercase tracking-widest text-steel">Progress</p>
		<h1 class="font-display mt-1 text-2xl font-bold">{profileName}</h1>
	</header>

	{#if !hasLogs}
		<Card>
			<p class="font-display text-lg font-medium">Nothing logged yet</p>
			<p class="mt-1 text-sm text-steel">Your progress shows up here once you log a session. Start with today's.</p>
			<a href="/" class="mt-4 inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Go to today</a>
		</Card>
	{:else}
		<section aria-labelledby="p-adherence" class="mb-7">
			<SectionHeader id="p-adherence" eyebrow="Adherence" meta="{metrics.adherence.completed} / {metrics.adherence.planned} logged" />
			<Card tone="sunken">
				<div class="flex flex-wrap gap-1" role="img" aria-label="{metrics.adherence.completed} of {metrics.adherence.planned} sessions logged">
					{#each store.plan.weeks as w (w.id)}
						{#each w.sessions as s (s.id)}
							{@const done = store.logs.some((l) => l.sessionId === s.id)}
							<span class="h-4 w-2 rounded-[1px] {done ? 'bg-ink' : 'bg-hairline-strong/40'}"></span>
						{/each}
					{/each}
				</div>
				<p class="mt-3 text-xs text-steel">One tick per planned session. Grey means not logged yet, not missed.</p>
			</Card>
		</section>

		<section aria-labelledby="p-volume" class="mb-7">
			<SectionHeader id="p-volume" eyebrow="Volume by week" meta="{fmtDistance(metrics.volume.totalActualKm)} / {fmtDistance(metrics.volume.totalPlannedKm)}" />
			<Card tone="sunken">
				<div class="flex items-end gap-1" style="height: 96px" role="img" aria-label="Weekly distance logged against planned">
					{#each metrics.volume.byWeek as w (w.week)}
						{@const h = Math.round((w.actualKm / volumeMax) * 84)}
						{@const ph = Math.round((w.plannedKm / volumeMax) * 84)}
						<div class="relative flex-1" title="Week {w.week}: {fmtDistance(w.actualKm)} of {fmtDistance(w.plannedKm)}">
							<div class="absolute left-0 right-0 border-t border-hairline-strong" style="bottom: {ph}px"></div>
							<div class="absolute bottom-0 left-1/4 right-1/4 rounded-[1px] bg-ink" style="height: {h}px"></div>
						</div>
					{/each}
				</div>
				<p class="mt-3 text-xs text-steel">
					Bar is distance logged, hairline tick is planned.{#if metrics.volume.changePct !== undefined} Last change {metrics.volume.changePct > 0 ? '+' : ''}{metrics.volume.changePct}%.{/if}
				</p>
			</Card>
		</section>

		<section aria-labelledby="p-intensity" class="mb-7">
			<SectionHeader id="p-intensity" eyebrow="Completed intensity" meta="{metrics.intensity.completed} done" />
			<Card tone="sunken">
				{#if metrics.intensity.completed === 0}
					<p class="text-xs text-steel">No completed sessions yet.</p>
				{:else}
					<ul class="space-y-3">
						{#each [{ k: 'easy', l: 'Easy' }, { k: 'steady', l: 'Steady' }, { k: 'hard', l: 'Hard' }] as band (band.k)}
							{@const n = metrics.intensity[band.k as 'easy' | 'steady' | 'hard']}
							{@const w = Math.round((n / metrics.intensity.completed) * 100)}
							<li>
								<div class="flex items-baseline justify-between text-sm">
									<span class="flex items-center gap-2">
										<span class="inline-flex gap-0.5" aria-hidden="true">
											{#each [1, 2, 3] as i (i)}
												<span class="h-2 w-2 rounded-[1px] {i <= (band.k === 'hard' ? 3 : band.k === 'steady' ? 2 : 1) ? 'bg-ink' : 'bg-hairline-strong/40'}"></span>
											{/each}
										</span>
										{band.l}
									</span>
									<span class="tabular text-steel">{n}</span>
								</div>
								<div class="mt-1 h-1 w-full rounded-full bg-hairline">
									<div class="h-1 rounded-full bg-ink" style="width: {w}%"></div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</Card>
		</section>

		<section aria-labelledby="p-pace" class="mb-7">
			<SectionHeader id="p-pace" eyebrow="Pace trend" />
			<Card tone="sunken">
				{#if !paceGeom}
					<p class="text-xs text-steel">Log at least 3 runs to see a pace trend. Fewer points aren't meaningful.</p>
				{:else}
					<svg viewBox="0 0 100 {PACE_H}" preserveAspectRatio="none" class="w-full" style="height: {PACE_H}px" role="img" aria-label="Logged run paces over time">
						{#each paceGeom as p, i (i)}
							<circle cx={p.x} cy={p.y} r="1.6" class={p.fast ? 'fill-signal' : 'fill-ink'}></circle>
						{/each}
					</svg>
					<p class="mt-3 text-xs text-steel">
						One dot per logged run, higher is faster.
						{#if metrics.pace.changeSecPerKm !== undefined}
							{metrics.pace.changeSecPerKm > 0 ? 'Recent runs are faster on average by ' : 'Recent runs are slower on average by '}{Math.abs(metrics.pace.changeSecPerKm)}s/km.
						{/if}
					</p>
				{/if}
			</Card>
		</section>

		<section aria-labelledby="p-pb" class="mb-7">
			<SectionHeader id="p-pb" eyebrow="Personal bests" />
			<Card>
				<ul class="divide-y divide-hairline text-sm">
					{#if metrics.prs.longestRunKm}
						<li class="flex justify-between py-2"><span class="text-steel">Longest run</span><span class="tabular">{fmtDistance(metrics.prs.longestRunKm)}</span></li>
					{/if}
					{#if metrics.prs.fastestPaceSecPerKm}
						<li class="flex justify-between py-2"><span class="text-steel">Fastest pace</span><span class="tabular">{fmtPace(metrics.prs.fastestPaceSecPerKm)}</span></li>
					{/if}
					{#if metrics.prs.biggestWeekKm}
						<li class="flex justify-between py-2"><span class="text-steel">Biggest week</span><span class="tabular">{fmtDistance(metrics.prs.biggestWeekKm)}</span></li>
					{/if}
					{#if metrics.rpe.avg !== undefined}
						<li class="flex justify-between py-2"><span class="text-steel">Average RPE</span><span class="tabular">{metrics.rpe.avg}</span></li>
					{/if}
				</ul>
			</Card>
		</section>
	{/if}
{/if}

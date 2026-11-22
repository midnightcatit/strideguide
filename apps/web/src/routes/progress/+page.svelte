<script lang="ts">
	import { onMount } from 'svelte';
	import { computeProgress, type WeekLike } from '@strideguide/shared/analytics';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { fmtDistance, fmtPace } from '$lib/prefs.svelte';

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

	// Volume bars scale to the largest planned/actual week.
	const volumeMax = $derived.by(() => {
		if (!metrics) return 0;
		return Math.max(1, ...metrics.volume.byWeek.flatMap((w) => [w.plannedKm, w.actualKm]));
	});

	// Pace dots: map onto a small SVG (faster = higher).
	const PACE_H = 72;
	const paceGeom = $derived.by(() => {
		const pts = metrics?.pace.points ?? [];
		if (pts.length < 3) return null;
		const paces = pts.map((p) => p.paceSecPerKm);
		const min = Math.min(...paces);
		const max = Math.max(...paces);
		const span = Math.max(1, max - min);
		return pts.map((p, i) => ({
			x: pts.length === 1 ? 50 : (i / (pts.length - 1)) * 100,
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
	<section class="mb-5">
		<p class="text-xs uppercase tracking-widest text-steel">{profileName} · Progress</p>
		<h1 class="font-display mt-1 text-2xl font-bold">How it's going</h1>
	</section>

	{#if !hasLogs}
		<!-- Empty state -->
		<div class="rounded-xl border border-dashed border-hairline p-6 text-center">
			<p class="font-display text-lg font-medium">Nothing logged yet</p>
			<p class="mx-auto mt-1 max-w-sm text-sm text-steel">
				Your progress shows up here once you log a session. Start with today's.
			</p>
			<a href="/" class="mt-4 inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Go to today</a>
		</div>
	{:else}
		<!-- Adherence -->
		<section class="mb-6">
			<div class="flex items-baseline justify-between">
				<h2 class="text-xs uppercase tracking-widest text-steel">Adherence</h2>
				<span class="tabular text-sm">{metrics.adherence.completed} / {metrics.adherence.planned} logged</span>
			</div>
			<ul class="mt-3 flex flex-wrap gap-1" aria-label="Planned sessions">
				{#each store.plan.weeks as w (w.id)}
					{#each w.sessions as s (s.id)}
						{@const done = store.logs.some((l) => l.sessionId === s.id)}
						<li
							class="h-4 w-2 rounded-[1px] {done ? 'bg-ink' : 'bg-hairline'}"
							title="Week {w.weekNumber}: {done ? 'logged' : 'not logged'}"
						></li>
					{/each}
				{/each}
			</ul>
			<p class="mt-2 text-xs text-steel">1 tick = 1 planned session. Grey means “not logged yet”, not “missed”.</p>
		</section>

		<!-- Volume -->
		<section class="mb-6">
			<div class="flex items-baseline justify-between">
				<h2 class="text-xs uppercase tracking-widest text-steel">Volume by week</h2>
				<span class="tabular text-sm">{fmtDistance(metrics.volume.totalActualKm)} / {fmtDistance(metrics.volume.totalPlannedKm)}</span>
			</div>
			<div class="mt-3 flex items-end gap-1" style="height: 96px" aria-label="Weekly volume">
				{#each metrics.volume.byWeek as w (w.week)}
					{@const h = Math.round((w.actualKm / volumeMax) * 84)}
					{@const ph = Math.round((w.plannedKm / volumeMax) * 84)}
					<div class="relative flex-1" title="Week {w.week}: {fmtDistance(w.actualKm)} of {fmtDistance(w.plannedKm)}">
						<!-- planned tick -->
						<div class="absolute left-0 right-0 border-t border-hairline-strong" style="bottom: {ph}px"></div>
						<!-- actual bar -->
						<div class="absolute bottom-0 left-1/4 right-1/4 rounded-[1px] {w.week === metrics.volume.byWeek[metrics.volume.byWeek.length - 1].week ? 'bg-ink' : 'bg-steel'}" style="height: {h}px"></div>
					</div>
				{/each}
			</div>
			<p class="mt-2 text-xs text-steel">
				Bar = distance logged; hairline tick = planned. {#if metrics.volume.changePct !== undefined}Last change {metrics.volume.changePct > 0 ? '+' : ''}{metrics.volume.changePct}%.{/if}
			</p>
		</section>

		<!-- Intensity distribution -->
		<section class="mb-6">
			<h2 class="text-xs uppercase tracking-widest text-steel">Completed intensity</h2>
			{#if metrics.intensity.completed === 0}
				<p class="mt-2 text-xs text-steel">No completed sessions yet.</p>
			{:else}
				<ul class="mt-3 space-y-2">
					{#each [{ k: 'easy', l: 'Easy' }, { k: 'steady', l: 'Steady' }, { k: 'hard', l: 'Hard' }] as band (band.k)}
						{@const n = metrics.intensity[band.k as 'easy' | 'steady' | 'hard']}
						{@const w = Math.round((n / metrics.intensity.completed) * 100)}
						<li>
							<div class="flex items-baseline justify-between text-sm">
								<span class="flex items-center gap-2">
									<span class="inline-flex gap-0.5" aria-hidden="true">
										{#each [1, 2, 3] as i (i)}
											<span class="h-2 w-2 rounded-[1px] {i <= (band.k === 'hard' ? 3 : band.k === 'steady' ? 2 : 1) ? 'bg-ink' : 'bg-hairline'}"></span>
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
		</section>

		<!-- Pace trend -->
		<section class="mb-6">
			<h2 class="text-xs uppercase tracking-widest text-steel">Pace trend</h2>
			{#if !paceGeom}
				<p class="mt-2 text-xs text-steel">Log at least 3 runs to see a pace trend — fewer points aren't meaningful.</p>
			{:else}
				<svg viewBox="0 0 100 {PACE_H}" preserveAspectRatio="none" class="mt-3 w-full" style="height: {PACE_H}px" role="img" aria-label="Logged run paces over time">
					{#each paceGeom as p, i (i)}
						<circle cx={p.x} cy={p.y} r="1.6" class={p.fast ? 'fill-signal' : 'fill-ink'}></circle>
					{/each}
				</svg>
				<p class="mt-2 text-xs text-steel">
					One dot per logged run (higher = faster).
					{#if metrics.pace.changeSecPerKm !== undefined}
						{metrics.pace.changeSecPerKm > 0 ? 'Recent runs are faster on average by ' : 'Recent runs are slower on average by '}
						{Math.abs(metrics.pace.changeSecPerKm)}s/km.
					{/if}
				</p>
			{/if}
		</section>

		<!-- Personal bests -->
		<section class="mb-6">
			<h2 class="text-xs uppercase tracking-widest text-steel">Personal bests</h2>
			<ul class="mt-3 divide-y divide-hairline border-y border-hairline text-sm">
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
		</section>
	{/if}
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { computeProgress, type WeekLike } from '@strideguide/shared/analytics';
	import { fitnessState, type HealthDay, type RecoverySignal } from '@strideguide/shared/plan';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { addDaysIso, localIso } from '$lib/plan';
	import { isSkipped, skippedIds } from '$lib/skipped.svelte';
	import { api, type HealthMetricsPayload } from '$lib/api';
	import { fmtDistance, fmtPace, convertPaceDelta, paceDeltaUnit } from '$lib/prefs.svelte';
	import { weekPreview, trainedDays, currentStreak, weeklyKmSeries } from '$lib/metrics';
	import Card from '$lib/components/Card.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import WatchVitals from '$lib/components/WatchVitals.svelte';
	import WeekPreviewCard from '$lib/components/WeekPreviewCard.svelte';
	import StreakPreviewCard from '$lib/components/StreakPreviewCard.svelte';
	import VolumePreviewCard from '$lib/components/VolumePreviewCard.svelte';
	import HealthPreviewCard from '$lib/components/HealthPreviewCard.svelte';
	import HealthSummary from '$lib/components/HealthSummary.svelte';

	// The recovery payload carries a steps series alongside the days. The shared
	// client type predates it, so it is widened here rather than in lib/api.
	type RecoveryState = {
		available: boolean;
		signal: RecoverySignal | null;
		days: HealthDay[];
		steps?: { date: string; steps: number }[];
	};

	let recovery = $state<RecoveryState | null>(null);
	let health = $state<HealthMetricsPayload | null>(null);

	const todayIso = localIso();

	onMount(() => {
		void ensurePlan();
		void api
			.recovery()
			.then((r) => (recovery = r))
			.catch(() => {
				// no health data, or the call failed; the section simply does not show
			});
		void api
			.healthMetrics(30)
			.then((h) => (health = h))
			.catch(() => {
				// no health data, or the call failed; the section shows its empty state
			});
	});

	const weeksLike = $derived<WeekLike[]>(
		(store.plan?.weeks ?? []).map((w) => ({
			weekNumber: w.weekNumber,
			startDate: w.startDate,
			endDate: w.endDate,
			phase: w.phase,
			sessions: w.sessions,
		})),
	);
	const metrics = $derived(
		store.plan
			? computeProgress(store.logs, weeksLike, {
					targetDate: store.plan.goal?.targetDate ?? null,
					todayIso,
					skippedIds: skippedIds(),
				})
			: null,
	);
	const hasLogs = $derived(store.logs.length > 0);

	// The current-week preview, the same read the dashboard card shows. Both use
	// the same helper and the same components, so the cards cannot drift apart.
	const todayWeek = $derived(
		(store.plan?.weeks ?? []).find(
			(w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate,
		) ?? store.plan?.weeks?.[0],
	);
	const loggedIds = $derived(
		new Set(store.logs.filter((l) => l.sessionId).map((l) => l.sessionId as string)),
	);
	const skippedSet = $derived(new Set<string>(skippedIds()));
	const week = $derived(
		weekPreview(todayWeek?.sessions.map((s) => s.id) ?? [], loggedIds, skippedSet),
	);
	const weekKm = $derived(
		todayWeek
			? todayWeek.sessions
					.filter((s) => s.modality === 'running')
					.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0)
			: 0,
	);
	const weekDoneKm = $derived(
		todayWeek
			? todayWeek.sessions
					.filter((s) => s.modality === 'running')
					.reduce((sum, s) => {
						const log = store.logs.find((l) => l.sessionId === s.id);
						return sum + (log?.runStats?.distanceKm ?? 0);
					}, 0)
			: 0,
	);
	const logDays = $derived(trainedDays(store.logs));
	const streak = $derived(currentStreak(logDays, todayIso));
	const skippedDaySet = $derived.by(() => {
		const out = new Set<string>();
		for (const w of store.plan?.weeks ?? []) {
			if (!w.startDate) continue;
			for (const s of w.sessions) if (isSkipped(s.id)) out.add(addDaysIso(w.startDate, s.day));
		}
		return out;
	});
	const weekly = $derived(weeklyKmSeries(store.logs, todayIso, 6));
	const weeklyMax = $derived(Math.max(1, ...weekly.map((w) => w.km)));

	// Steps come from the same health payload as the recovery numbers: the last
	// two weeks, oldest first, ready to draw.
	const stepDays = $derived(
		(recovery?.steps ?? [])
			.slice()
			.sort((a, b) => a.date.localeCompare(b.date))
			.slice(-14),
	);
	const stepMax = $derived(Math.max(1, ...stepDays.map((d) => d.steps)));
	const stepAvg = $derived(
		stepDays.length
			? Math.round(stepDays.reduce((sum, d) => sum + d.steps, 0) / stepDays.length)
			: 0,
	);

	// What the runner's own logs add up to: paces, weekly distance, effort trend,
	// and which session types they rated well. The same read seeds a rebuild.
	const fitness = $derived.by(() => {
		const typeById = new Map<string, string>();
		for (const w of store.plan?.weeks ?? []) {
			for (const s of w.sessions) typeById.set(s.id, s.type);
		}
		return fitnessState(
			store.logs.map((l) => ({
				sessionId: l.sessionId,
				type: l.sessionId ? (typeById.get(l.sessionId) ?? null) : null,
				date: (l.createdAt ?? null) as string | number | null,
				distanceKm: l.runStats?.distanceKm ?? null,
				durationSec: l.runStats?.durationSec ?? null,
				rpe: l.rpe,
				feedback: l.feedback,
			})),
		);
	});

	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);

	const volumeMax = $derived.by(() => {
		if (!metrics) return 0;
		return Math.max(1, ...metrics.volume.byWeek.flatMap((w) => [w.plannedKm, w.actualKm]));
	});

	const phaseSegments = $derived.by(() => {
		const weeks = store.plan?.weeks ?? [];
		const segs: { phase: string; count: number }[] = [];
		for (const w of weeks) {
			const ph = w.phase ?? 'base';
			const last = segs[segs.length - 1];
			if (last && last.phase === ph) last.count++;
			else segs.push({ phase: ph, count: 1 });
		}
		return segs;
	});
	const phaseColour = (p: string) =>
		p === 'build' ? 'bg-ink/45' : p === 'peak' ? 'bg-ink/70' : p === 'taper' ? 'bg-ink/25' : 'bg-ink/15';

	const monthCells = $derived.by(() => {
		const now = new Date();
		const y = now.getUTCFullYear();
		const m = now.getUTCMonth();
		const first = new Date(Date.UTC(y, m, 1));
		const firstDow = (first.getUTCDay() + 6) % 7;
		const start = new Date(Date.UTC(y, m, 1 - firstDow));
		const trained = new Set(metrics?.calendar.trainedDays ?? []);
		const cells: { key: string; day: number; inMonth: boolean; trained: boolean; today: boolean }[] = [];
		for (let i = 0; i < 42; i++) {
			const d = new Date(start.getTime() + i * 86400000);
			const key = d.toISOString().slice(0, 10);
			cells.push({
				key,
				day: d.getUTCDate(),
				inMonth: d.getUTCMonth() === m,
				trained: trained.has(key),
				today: key === todayIso,
			});
		}
		return cells;
	});
	const monthName = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

	const PACE_H = 72;
	const paceGeom = $derived.by(() => {
		const pts = (metrics?.pace.points ?? []).filter((p) => p.intensity !== 'easy');
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

	<!-- The metric pages, the same cards the dashboard shows. Each opens its full page. -->
	<section aria-labelledby="p-pages" class="mb-7">
		<SectionHeader id="p-pages" eyebrow="Metric pages" />
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			<WeekPreviewCard
				done={week.done}
				planned={week.planned}
				skipped={week.skipped}
				percent={week.percent}
				segments={week.segments}
				from="/progress"
			/>
			<StreakPreviewCard {streak} trainedDays={logDays} skippedDays={skippedDaySet} {todayIso} from="/progress" />
			<VolumePreviewCard doneKm={weekDoneKm} plannedKm={weekKm} {weekly} {weeklyMax} from="/progress" />
			<HealthPreviewCard payload={health} from="/progress" />
		</div>
	</section>

	{#if health?.available && (Object.keys(health.metrics).length || Object.keys(health.samples).length)}
		<section aria-labelledby="p-health" class="mb-7">
			<SectionHeader id="p-health" eyebrow="Health" meta="Last 30 days" />
			<Card>
				<HealthSummary payload={health} max={6} />
				<a href="/progress/health?from=/progress" class="mt-3 inline-block text-xs text-signal-ink hover:underline">See all health data →</a>
			</Card>
		</section>
	{/if}

	{#if !hasLogs}
		<Card>
			<p class="font-display text-lg font-medium">Nothing logged yet</p>
			<p class="mt-1 text-sm text-steel">Your progress shows up here once you log a session. Start with today's.</p>
			<a href="/" class="mt-4 inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Go to today</a>
		</Card>
	{:else}
		{#if fitness.samples > 0}
			<section aria-labelledby="p-fitness" class="mb-7">
				<SectionHeader id="p-fitness" eyebrow="Your fitness" meta="{fitness.samples} logged" />
				<Card>
					<ul class="space-y-1 text-sm">
						{#if fitness.effectiveVdot}
							<li class="flex justify-between">
								<span>Training paces set from your runs</span>
								<span class="tabular">VDOT {Math.round(fitness.effectiveVdot)}</span>
							</li>
						{/if}
						<li class="flex justify-between">
							<span>Recent weekly distance</span>
							<span class="tabular">{fmtDistance(fitness.recentWeeklyKm)}</span>
						</li>
						{#if fitness.rpeTrend}
							<li class="flex justify-between">
								<span>Effort trend</span>
								<span class="tabular">{fitness.rpeTrend}</span>
							</li>
						{/if}
					</ul>
					{#if fitness.likedTypes.length || fitness.dislikedTypes.length}
						<p class="mt-3 text-sm leading-relaxed text-steel">
							{#if fitness.likedTypes.length}You rated {fitness.likedTypes.join(' and ')} well.{/if}
							{#if fitness.dislikedTypes.length} You rated {fitness.dislikedTypes.join(' and ')} less well.{/if}
							The plan leans toward what works for you.
						</p>
					{/if}
				</Card>
			</section>
		{/if}
		{#if recovery?.available && recovery.signal && (recovery.signal.avgRestingHr || recovery.signal.avgHrvMs || recovery.signal.avgSleepMin)}
			<section aria-labelledby="p-recovery" class="mb-7">
				<SectionHeader id="p-recovery" eyebrow="Recovery" meta="{recovery.signal.days} days" />
				<Card tone="sunken">
					<WatchVitals signal={recovery.signal} days={recovery.days} />
					{#if recovery.signal.strained}
						<p class="mt-3 text-sm leading-relaxed text-steel">
							Your recent numbers look strained. The plan favours easing the volume until they settle.
						</p>
					{:else}
						<p class="mt-3 text-sm leading-relaxed text-steel">
							Your recent numbers look steady against your own baseline.
						</p>
					{/if}
				</Card>
			</section>
		{/if}
		{#if stepDays.length}
			<section aria-labelledby="p-steps" class="mb-7">
				<SectionHeader id="p-steps" eyebrow="Daily steps" meta="{stepAvg.toLocaleString()} a day" />
				<Card tone="sunken">
					<div
						class="flex items-end gap-1"
						style="height: 96px"
						role="img"
						aria-label="Steps per day over the last {stepDays.length} days"
					>
						{#each stepDays as d (d.date)}
							<div class="relative flex-1" title="{d.date}: {d.steps.toLocaleString()} steps">
								<div class="absolute left-0 right-0 border-t border-steel" style="bottom: {Math.round((stepAvg / stepMax) * 84)}px"></div>
								<div
									class="absolute bottom-0 left-1/4 right-1/4 rounded-[1px] bg-ink/55"
									style="height: {Math.max(2, Math.round((d.steps / stepMax) * 84))}px"
								></div>
							</div>
						{/each}
					</div>
					<p class="mt-3 text-xs text-steel">
						Last {stepDays.length} days from Google Health. Bar is steps that day, hairline tick is your average.
					</p>
				</Card>
			</section>
		{/if}
		<section aria-labelledby="p-plan" class="mb-7">
			<SectionHeader id="p-plan" eyebrow="Plan progress" meta="{metrics.planMeta.percent}% · {metrics.planMeta.weeksToGo} weeks to go" />
			<Card>
				<div class="flex items-center gap-4">
					<ProgressRing percent={metrics.planMeta.percent} size={96} stroke={9} />
					<div class="min-w-0">
						<p class="font-display text-lg font-semibold">
							{#if metrics.planMeta.currentWeek}Week {metrics.planMeta.currentWeek} of {metrics.planMeta.weeksTotal}{:else}{metrics.planMeta.weeksTotal} weeks{/if}
						</p>
						{#if metrics.planMeta.currentPhase}
							<p class="mt-0.5 text-sm text-steel">In the {metrics.planMeta.currentPhase} block</p>
						{/if}
						{#if metrics.planMeta.daysToRace != null}
							<p class="mt-0.5 text-sm text-steel">{metrics.planMeta.daysToRace} days to race</p>
						{/if}
					</div>
				</div>
				{#if phaseSegments.length > 1}
					<div class="mt-4 flex h-2 w-full overflow-hidden rounded-full" role="img" aria-label="Plan phases">
						{#each phaseSegments as seg (seg.phase + seg.count)}
							<div class={phaseColour(seg.phase)} style="width: {(seg.count / metrics.planMeta.weeksTotal) * 100}%"></div>
						{/each}
					</div>
					<p class="mt-1.5 text-xs text-steel">Base, build, peak, taper.</p>
				{/if}
			</Card>
		</section>

		<section aria-labelledby="p-adherence" class="mb-7">
			<SectionHeader id="p-adherence" eyebrow="Adherence" meta="{metrics.adherence.completed} / {metrics.adherence.planned} logged{metrics.adherence.skipped ? ` · ${metrics.adherence.skipped} skipped` : ''}" />
			<Card tone="sunken">
				<div class="flex flex-wrap gap-1" role="img" aria-label="{metrics.adherence.completed} of {metrics.adherence.planned} sessions logged{metrics.adherence.skipped ? `, ${metrics.adherence.skipped} skipped` : ''}">
					{#each store.plan.weeks as w (w.id)}
						{#each w.sessions as s (s.id)}
							{@const done = store.logs.some((l) => l.sessionId === s.id)}
							{@const sk = !done && isSkipped(s.id)}
							<span class="h-4 w-2 rounded-[1px] {done ? 'bg-ok' : sk ? 'bg-steel' : 'bg-ink/40'}"></span>
						{/each}
					{/each}
				</div>
				<p class="mt-3 text-xs text-steel">One tick per planned session. Green is done, grey is skipped, and the lightest mark is not logged yet, not missed.</p>
			</Card>
		</section>

		<section aria-labelledby="p-consistency" class="mb-7">
			<SectionHeader id="p-consistency" eyebrow="Consistency" meta={monthName} />
			<Card tone="sunken">
				<div class="mx-auto max-w-sm">
					<div class="grid grid-cols-7 gap-1">
						{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as d, i (i)}
							<span class="tabular py-1 text-center text-[10px] uppercase tracking-wide text-steel">{d}</span>
						{/each}
						{#each monthCells as c (c.key)}
							<span
								class="flex aspect-square items-center justify-center rounded-md border text-[10px] {c.trained
									? 'border-ok bg-ok text-paper'
									: c.inMonth
										? 'border-hairline text-steel'
										: 'border-transparent text-hairline'} {c.today ? 'ring-1 ring-signal-ink' : ''}"
								aria-label="{c.key}{c.trained ? ', trained' : ''}"
							>{c.day}</span>
						{/each}
					</div>
					<p class="mt-2 text-xs text-steel">A filled day is a day you trained. Rest days stay open on purpose.</p>
				</div>
			</Card>
		</section>

		<section aria-labelledby="p-volume" class="mb-7">
			<SectionHeader id="p-volume" eyebrow="Volume by week" meta="{fmtDistance(metrics.volume.totalActualKm)} / {fmtDistance(metrics.volume.totalPlannedKm)}" />
			<Card tone="sunken">
				<div class="flex items-end gap-1" style="height: 96px" role="img" aria-label="Weekly distance logged against planned">
					{#each metrics.volume.byWeek.slice(-8) as w (w.week)}
						{@const h = Math.round((w.actualKm / volumeMax) * 84)}
						{@const ph = Math.round((w.plannedKm / volumeMax) * 84)}
						<div class="relative flex-1" title="Week {w.week}: {fmtDistance(w.actualKm)} of {fmtDistance(w.plannedKm)}">
							<div class="absolute left-0 right-0 border-t border-steel" style="bottom: {ph}px"></div>
							<div class="absolute bottom-0 left-1/4 right-1/4 rounded-[1px] bg-ok" style="height: {h}px"></div>
						</div>
					{/each}
				</div>
				<p class="mt-3 text-xs text-steel">
					Last 8 weeks. Bar is distance logged, hairline tick is planned.{#if metrics.volume.changePct !== undefined} Last change {metrics.volume.changePct > 0 ? '+' : ''}{metrics.volume.changePct}%.{/if}
				</p>
				{#if metrics.imported.sessions}
					<p class="mt-1 text-xs text-steel">
						Of that, {fmtDistance(metrics.imported.km)} came from {metrics.imported.sessions} imported workout{metrics.imported.sessions === 1 ? '' : 's'}.
					</p>
				{/if}
			</Card>
		</section>

		<section aria-labelledby="p-intensity" class="mb-7">
			<SectionHeader id="p-intensity" eyebrow="Completed intensity" meta="{metrics.intensity.completed} done" />
			<Card tone="sunken">
				{#if metrics.intensity.completed === 0}
					<p class="text-xs text-steel">No completed sessions yet.</p>
				{:else}
					{@const total = metrics.intensity.easy + metrics.intensity.steady + metrics.intensity.hard || 1}
					<div class="flex h-4 w-full overflow-hidden rounded-full" role="img" aria-label="{metrics.intensity.easy} easy, {metrics.intensity.steady} steady, {metrics.intensity.hard} hard">
						<div class="bg-ink/25" style="width: {(metrics.intensity.easy / total) * 100}%"></div>
						<div class="bg-ink/55" style="width: {(metrics.intensity.steady / total) * 100}%"></div>
						<div class="bg-ink" style="width: {(metrics.intensity.hard / total) * 100}%"></div>
					</div>
					<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel">
						<span class="tabular">Easy {metrics.intensity.easy}</span>
						<span class="tabular">Steady {metrics.intensity.steady}</span>
						<span class="tabular">Hard {metrics.intensity.hard}</span>
					</div>
					<p class="mt-2 text-xs text-steel">Most running should sit easy. This is a split of what you have logged.</p>
				{/if}
			</Card>
		</section>

		<section aria-labelledby="p-pace" class="mb-7">
			<SectionHeader id="p-pace" eyebrow="Pace trend" />
			<Card tone="sunken">
				{#if !paceGeom}
					<p class="text-xs text-steel">Log at least 3 long or quality runs to see a pace trend. Fewer points aren't meaningful.</p>
				{:else}
					<svg viewBox="0 0 100 {PACE_H}" preserveAspectRatio="none" class="w-full" style="height: {PACE_H}px" role="img" aria-label="Logged run paces over time">
						{#each paceGeom as p, i (i)}
							<circle cx={p.x} cy={p.y} r="1.6" class={p.fast ? 'fill-signal-ink' : 'fill-ink'}></circle>
						{/each}
					</svg>
					<p class="mt-3 text-xs text-steel">
						Long and quality runs only. Easy runs are left out on purpose, so the trend is not hidden by them.
						{#if metrics.pace.changeSecPerKm !== undefined}
							{metrics.pace.changeSecPerKm > 0 ? 'Recent runs are faster on average by ' : 'Recent runs are slower on average by '}{convertPaceDelta(Math.abs(metrics.pace.changeSecPerKm))}{paceDeltaUnit()}.
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

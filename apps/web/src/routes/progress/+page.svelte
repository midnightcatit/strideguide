<script lang="ts">
	import { onMount } from 'svelte';
	import { computeProgress, type WeekLike } from '@strideguide/shared/analytics';
	import { fitnessState, type HealthDay, type RecoverySignal } from '@strideguide/shared/plan';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { type ClientLog, type ClientSession, addDaysIso, localIso } from '$lib/plan';
	import { isSkipped, skippedIds } from '$lib/skipped.svelte';
	import { api, type HealthMetricsPayload } from '$lib/api';
	import { fmtDistance, fmtPace, convertPaceDelta, paceDeltaUnit, sessionLabel } from '$lib/prefs.svelte';
	import { weekPreview, trainedDays, currentStreak, weeklyKmSeries, logMs } from '$lib/metrics';
	import { metricColor, periodDelta } from '$lib/chartTheme';
	import { TRAINING_PROGRESS, TRAINING_LOAD, TRAINING_PACE, CHART_MUTED, CHART_EMPTY } from '$lib/chartPalette';
	import Card from '$lib/components/Card.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import WatchVitals from '$lib/components/WatchVitals.svelte';
	import WeekPreviewCard from '$lib/components/WeekPreviewCard.svelte';
	import StreakPreviewCard from '$lib/components/StreakPreviewCard.svelte';
	import VolumePreviewCard from '$lib/components/VolumePreviewCard.svelte';
	import CalendarPreviewCard from '$lib/components/CalendarPreviewCard.svelte';
	import HealthSummary from '$lib/components/HealthSummary.svelte';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import BarsCard from '$lib/components/charts/BarsCard.svelte';
	import TimeSeriesCard from '$lib/components/charts/TimeSeriesCard.svelte';
	import ProportionBar from '$lib/components/charts/ProportionBar.svelte';

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
	let note = $state<string | null>(null);

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
		void api
			.latestSummary()
			.then((s) => (note = s.summary?.body ?? null))
			.catch(() => {
				// no coach note yet; the section simply does not show
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

	// The current-week preview. Both this page's preview cards read from the same
	// helper and the same components, so they cannot drift apart.
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

	// The last three logged sessions, one row each: a re-log or an edit replaces
	// the previous entry for that session.
	const recentLogs = $derived.by(() => {
		const byId = new Map<string, ClientSession>();
		for (const w of store.plan?.weeks ?? []) for (const s of w.sessions) byId.set(s.id, s);
		const seen = new Set<string>();
		const out: { log: ClientLog; session: ClientSession | undefined }[] = [];
		for (const l of [...store.logs].sort((a, b) => logMs(b.createdAt) - logMs(a.createdAt))) {
			if (!l.sessionId || seen.has(l.sessionId)) continue;
			seen.add(l.sessionId);
			out.push({ log: l, session: byId.get(l.sessionId) });
			if (out.length === 3) break;
		}
		return out;
	});

	// Steps come from the same health payload as the recovery numbers: the last
	// two weeks, oldest first, ready to draw.
	const stepDays = $derived(
		(recovery?.steps ?? [])
			.slice()
			.sort((a, b) => a.date.localeCompare(b.date))
			.slice(-14),
	);
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

	// The weekly volume bars: logged distance, with the planned distance as a
	// thin reference line. The week number is turned into the week's own start
	// date, so the bars carry a real date axis.
	const weekStarts = $derived.by(() => {
		const map = new Map<number, string>();
		for (const w of store.plan?.weeks ?? []) if (w.startDate) map.set(w.weekNumber, w.startDate);
		return map;
	});
	const volumePoints = $derived(
		(metrics?.volume.byWeek ?? []).slice(-8).map((w) => ({
			date: weekStarts.get(w.week) ?? todayIso,
			value: w.actualKm,
			reference: w.plannedKm,
		})),
	);

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
	// One hue for the plan's phases, deepening as the block loads: base is the
	// faintest, peak the strongest, and a taper falls back.
	const PHASE_OPACITY: Record<string, number> = { base: 0.25, build: 0.5, peak: 0.85, taper: 0.4 };
	const phaseBars = $derived(
		phaseSegments.map((seg) => ({
			label: seg.phase,
			value: seg.count,
			opacity: PHASE_OPACITY[seg.phase] ?? 0.4,
		})),
	);

	// Completed intensity as one ordered ramp: easy is the faintest, hard the
	// strongest, so the split reads as one metric divided up.
	const intensitySegments = $derived([
		{ label: 'Easy', value: metrics?.intensity.easy ?? 0, opacity: 0.3 },
		{ label: 'Steady', value: metrics?.intensity.steady ?? 0, opacity: 0.6 },
		{ label: 'Hard', value: metrics?.intensity.hard ?? 0, opacity: 1 },
	]);

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

	// The logged pace trend, long and quality runs only. Easy runs are left out
	// on purpose, so the trend is not flattened by them.
	const pacePoints = $derived(
		(metrics?.pace.points ?? [])
			.filter((p) => p.intensity !== 'easy')
			.map((p) => ({ date: p.day, value: p.paceSecPerKm })),
	);

	// A compact pace for the axis and the tooltip: the formatted pace in the
	// user's unit without the "/km" or "/mi" tail, so the ticks never crowd.
	// It converts through fmtPace, so imperial users see the right numbers.
	const fmtPaceShort = (sec: number): string => fmtPace(sec).split(' ')[0] ?? fmtPace(sec);
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

	<!-- The ring leads the page: where the plan stands, at a glance. -->
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
				<div class="mt-4">
					<ProportionBar
						segments={phaseBars}
						color={TRAINING_LOAD}
						height={8}
						ariaLabel="Plan phases, base to taper"
					/>
				</div>
				<p class="mt-1.5 text-xs text-steel">Base, build, peak, taper.</p>
			{/if}
		</Card>
	</section>

	<!-- The metric pages. Each card opens its full page. -->
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
			<VolumePreviewCard doneKm={weekDoneKm} plannedKm={weekKm} {weekly} from="/progress" />
		</div>
	</section>

	{#if health?.available && (Object.keys(health.metrics).length || Object.keys(health.samples).length)}
		<!-- One card of mini widgets that opens the full health page. -->
		<section aria-labelledby="p-health" class="mb-7">
			<div class="flex items-baseline justify-between gap-3">
				<SectionHeader id="p-health" eyebrow="Health" meta="Last 30 days" />
				<a href="/progress/health?from=/progress" class="shrink-0 text-xs font-medium text-signal-ink hover:underline">See all →</a>
			</div>
			<Card>
				<a
					href="/progress/health?from=/progress"
					aria-label="Open all your health data"
					class="no-press block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-ink"
				>
					<HealthSummary payload={health} max={6} />
				</a>
			</Card>
		</section>
	{/if}

	{#if !hasLogs}
		<Card>
			<p class="font-display text-lg font-medium">Nothing logged yet</p>
			<p class="mt-1 text-sm text-steel">Your progress shows up here once you log a session. Start with today's.</p>
			<a href="/today" class="mt-4 inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Go to today</a>
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
							Your recent numbers look strained. The plan favors easing the volume until they settle.
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
				<SectionHeader id="p-steps" eyebrow="Daily steps" />
				<BarsCard
					title="Steps"
					value={stepAvg.toLocaleString()}
					unit="a day"
					color={metricColor('steps')}
					change={periodDelta(stepDays.map((d) => d.steps), health?.previous?.['steps'])}
					points={stepDays.map((d) => ({ date: d.date, value: d.steps }))}
					format={(n) => Math.round(n).toLocaleString()}
					goal={stepAvg > 0 ? { value: stepAvg, label: 'Average' } : null}
					note="Last {stepDays.length} days from Google Health. The line is your average."
				/>
			</section>
		{/if}
		<section aria-labelledby="p-adherence" class="mb-7">
			<SectionHeader id="p-adherence" eyebrow="Sessions logged" meta="{metrics.adherence.completed} / {metrics.adherence.planned} logged{metrics.adherence.skipped ? ` · ${metrics.adherence.skipped} skipped` : ''}" />
			<Card tone="sunken">
				<div class="flex flex-wrap gap-1" role="img" aria-label="{metrics.adherence.completed} of {metrics.adherence.planned} sessions logged{metrics.adherence.skipped ? `, ${metrics.adherence.skipped} skipped` : ''}">
					{#each store.plan.weeks as w (w.id)}
						{#each w.sessions as s (s.id)}
							{@const done = store.logs.some((l) => l.sessionId === s.id)}
							{@const sk = !done && isSkipped(s.id)}
							<span class="h-4 w-2 rounded-[1px]" style="background: {done ? TRAINING_PROGRESS : sk ? CHART_MUTED : CHART_EMPTY}"></span>
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
									? ''
									: c.inMonth
										? 'border-hairline text-steel'
										: 'border-transparent text-hairline'} {c.today ? 'ring-1 ring-signal-ink' : ''}"
								style={c.trained ? `background: ${TRAINING_PROGRESS}; border-color: ${TRAINING_PROGRESS}; color: var(--paper)` : ''}
								aria-label="{c.key}{c.trained ? ', trained' : ''}"
							>{c.day}</span>
						{/each}
					</div>
					<p class="mt-2 text-xs text-steel">A filled day is a day you trained. Rest days stay open on purpose.</p>
				</div>
			</Card>
		</section>

		<section aria-labelledby="p-volume" class="mb-7">
			<SectionHeader id="p-volume" eyebrow="Volume by week" />
			<BarsCard
				title="Distance logged"
				value={fmtDistance(metrics.volume.totalActualKm)}
				unit={`of ${fmtDistance(metrics.volume.totalPlannedKm)} planned`}
				color={TRAINING_PROGRESS}
				points={volumePoints}
				reference={{ label: 'Planned' }}
				format={(n) => fmtDistance(n)}
				note="Last 8 weeks. The bar is distance logged, and the thin line is planned.{metrics.volume.changePct !== undefined ? ` Last change ${metrics.volume.changePct > 0 ? '+' : ''}${metrics.volume.changePct}%.` : ''}{metrics.imported.sessions ? ` Of that, ${fmtDistance(metrics.imported.km)} came from ${metrics.imported.sessions} imported workout${metrics.imported.sessions === 1 ? '' : 's'}.` : ''}"
			/>
		</section>

		<section aria-labelledby="p-intensity" class="mb-7">
			<SectionHeader id="p-intensity" eyebrow="Completed intensity" meta="{metrics.intensity.completed} done" />
			<Card tone="sunken">
				{#if metrics.intensity.completed === 0}
					<p class="text-xs text-steel">No completed sessions yet.</p>
				{:else}
					<ProportionBar
						segments={intensitySegments}
						color={TRAINING_LOAD}
						height={16}
						ariaLabel="{metrics.intensity.easy} easy, {metrics.intensity.steady} steady, {metrics.intensity.hard} hard"
					/>
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
			{#if pacePoints.length < 3}
				<Card tone="sunken">
					<p class="text-xs text-steel">Log at least 3 long or quality runs to see a pace trend. Fewer points aren't meaningful.</p>
				</Card>
			{:else}
				<TimeSeriesCard
					title="Pace"
					value={fmtPace(pacePoints[pacePoints.length - 1].value)}
					color={TRAINING_PACE}
					points={pacePoints}
					format={fmtPaceShort}
					note="Long and quality runs only. Easy runs are left out on purpose, so the trend is not hidden by them.{metrics.pace.changeSecPerKm !== undefined ? ` Recent runs are ${metrics.pace.changeSecPerKm > 0 ? 'faster' : 'slower'} on average by ${convertPaceDelta(Math.abs(metrics.pace.changeSecPerKm))}${paceDeltaUnit()}.` : ''}"
				/>
			{/if}
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

	{#if note}
		<section aria-labelledby="p-coach-note" class="mb-7">
			<SectionHeader id="p-coach-note" eyebrow="Coach note" />
			<Card tone="sunken">
				<p class="text-sm">{note}</p>
			</Card>
		</section>
	{/if}

	<section aria-labelledby="p-recent" class="mb-7">
		<SectionHeader id="p-recent" eyebrow="Recent activity" />
		<Card tone="sunken" class="max-w-2xl">
			{#if recentLogs.length}
				<div class="max-h-64 overflow-y-auto pr-1">
					<ul class="divide-y divide-hairline">
						{#each recentLogs as { log, session } (log.id)}
							<li class="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
								<span class="min-w-0 break-words text-sm">{session ? sessionLabel(session) : 'Run'}</span>
								<span class="tabular shrink-0 text-sm text-steel">
									{#if log.runStats?.distanceKm}{fmtDistance(log.runStats.distanceKm)}{/if}
									{#if log.rpe} · RPE {log.rpe}{/if}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<p class="text-sm text-steel">Nothing logged yet. When you finish a session, it shows up here.</p>
				<a href="/today" class="mt-2 inline-block text-xs text-signal-ink hover:underline">Log today's session →</a>
			{/if}
		</Card>
	</section>

	<div class="mb-7">
		<CalendarPreviewCard />
	</div>

	<AdjustmentsCard />
{/if}

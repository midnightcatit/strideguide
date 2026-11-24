<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api } from '$lib/api';
	import { fmtDistance, prefs, sessionLabel } from '$lib/prefs.svelte';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { type ClientLog, type ClientSession, DAY_NAMES, addDaysIso, localIso, mondayIndex } from '$lib/plan';
	import { logMs, trainedDays, currentStreak, weeklyKmSeries } from '$lib/metrics';
	import type { RecoverySignal, HealthDay } from '@strideguide/shared/plan';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import SegmentedBar from '$lib/components/SegmentedBar.svelte';
	import ActivityHeatmap from '$lib/components/ActivityHeatmap.svelte';
	import WatchVitals from '$lib/components/WatchVitals.svelte';
	import SyncButton from '$lib/components/SyncButton.svelte';
	import { computeProgress, type WeekLike } from '@strideguide/shared/analytics';
	import SessionIcon from '$lib/components/SessionIcon.svelte';

	let note = $state<string | null>(null);
	let recovery = $state<{ available: boolean; signal: RecoverySignal | null; days: HealthDay[] } | null>(
		null,
	);

	// Send a signed-in user with no plan to onboarding, once per session, unless
	// they have said "not now". The session guard means the Dashboard tab still
	// shows the empty state instead of bouncing them straight back.
	const DISMISS_KEY = 'sg:onboardingDismissed';
	const REDIRECT_KEY = 'sg:onboardingRedirected';

	const todayIndex = mondayIndex(new Date());
	const todayIso = localIso();
	const timeOfDay = $derived.by(() => {
		const h = new Date().getHours();
		return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
	});
	/** Personal welcome: name and the event when we have them, plain wording otherwise. */
	const greeting = $derived(
		prefs.name ? `${timeOfDay}, ${prefs.name}` : timeOfDay,
	);
	const eventLine = $derived(prefs.eventName ? `Training for ${prefs.eventName}` : '');

	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);
	const weeks = $derived(store.plan?.weeks ?? []);
	const todayWeek = $derived(
		weeks.find((w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate) ??
			weeks[0],
	);
	const daySessions = $derived(todayWeek?.sessions.filter((s) => s.day === todayIndex) ?? []);
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	const weekLogged = $derived(
		todayWeek ? todayWeek.sessions.filter((s) => loggedBySession.has(s.id)).length : 0,
	);
	const weekPlanned = $derived(todayWeek?.sessions.length ?? 0);
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
					.reduce((sum, s) => sum + (loggedBySession.get(s.id)?.runStats?.distanceKm ?? 0), 0)
			: 0,
	);
	const logDays = $derived(trainedDays(store.logs));
	const streak = $derived(currentStreak(logDays, todayIso));
	const weekSegments = $derived((todayWeek?.sessions ?? []).map((s) => ({ filled: loggedBySession.has(s.id) })));
	const weekPercent = $derived(weekPlanned ? (weekLogged / weekPlanned) * 100 : 0);
	const weekly = $derived(weeklyKmSeries(store.logs, todayIso, 6));
	const weeklyMax = $derived(Math.max(1, ...weekly.map((w) => w.km)));
	const weeksLike = $derived<WeekLike[]>(
		(store.plan?.weeks ?? []).map((w) => ({
			weekNumber: w.weekNumber,
			startDate: w.startDate,
			endDate: w.endDate,
			phase: w.phase,
			sessions: w.sessions,
		})),
	);
	const planMeta = $derived(
		store.plan
			? computeProgress(store.logs, weeksLike, { targetDate: store.plan.goal?.targetDate ?? null, todayIso })
					.planMeta
			: null,
	);
	const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

	/** The next session after today, for the look-ahead button. */
	const nextUp = $derived.by(() => {
		let best: { date: string; session: ClientSession } | undefined;
		for (const w of weeks) {
			if (!w.startDate) continue;
			for (const s of w.sessions) {
				const date = addDaysIso(w.startDate, s.day);
				if (date > todayIso && (!best || date < best.date)) best = { date, session: s };
			}
		}
		return best;
	});
	const startHref = $derived(
		daySessions.length ? '/today' : nextUp ? `/today?date=${nextUp.date}` : '/today',
	);
	const startLabel = $derived(
		daySessions.length
			? "Start today's session"
			: nextUp
				? `Look ahead to ${sessionLabel(nextUp.session)}`
				: 'Look ahead to your next session',
	);

	const recentLogs = $derived.by(() => {
		const byId = new Map<string, ClientSession>();
		for (const w of weeks) for (const s of w.sessions) byId.set(s.id, s);
		// One row per session: a re-log or an edit replaces the previous entry.
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
	onMount(async () => {
		await ensureAuth();
		if (!auth.user) return;
		await ensurePlan();
		void api
			.recovery()
			.then((r) => (recovery = r))
			.catch(() => {
				// no health data, or the call failed; the section simply does not show
			});
		note = (await api.latestSummary().catch(() => ({ summary: null }))).summary?.body ?? null;

		let dismissed = false;
		let alreadyRedirected = false;
		try {
			dismissed = localStorage.getItem(DISMISS_KEY) === '1';
			alreadyRedirected = sessionStorage.getItem(REDIRECT_KEY) === '1';
		} catch {}
		if (!store.error && !store.plan?.weeks?.length && !dismissed && !alreadyRedirected) {
			try {
				sessionStorage.setItem(REDIRECT_KEY, '1');
			} catch {}
			await goto('/onboarding');
		}
	});

	function notNow() {
		try {
			localStorage.setItem(DISMISS_KEY, '1');
		} catch {}
	}
</script>

{#if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else if !weeks.length}
	<EmptyState
		eyebrow="No plan yet"
		title="Build your plan."
		body="Pick a goal and a race date. We write the sessions and explain each one."
		primaryLabel="Build my plan"
		primaryHref="/onboarding"
		secondaryLabel="Not now"
		onSecondary={notNow}
	>
		{#snippet icon()}<SessionIcon type="easy" size="h-5 w-5" />{/snippet}
	</EmptyState>
{:else}
	<header class="mb-6">
		<p class="tabular text-xs uppercase tracking-widest text-steel">{greeting}</p>
		<h1 class="font-display mt-1 text-2xl font-bold">
			{daySessions.length ? `${daySessions.length === 1 ? sessionLabel(daySessions[0]) : `${daySessions.length} sessions`} today` : 'Rest day'}
		</h1>
		<p class="mt-1 text-sm text-steel">{eventLine || profileName}{#if todayWeek} · Week {todayWeek.weekNumber}{/if}</p>
	</header>

	<!-- Start -->
	<Card>
		<p class="text-sm text-steel">
			{#if daySessions.length}
				Ready when you are. Your session is set, with a guided warm-up and timers.
			{:else}
				Nothing scheduled today. Recovery is part of the plan.
			{/if}
		</p>
		<a
			href={startHref}
			class="mt-4 flex w-full items-center justify-center rounded-md bg-ink px-5 py-3.5 text-sm font-medium text-paper hover:opacity-90"
		>
			{startLabel}
		</a>
		{#if daySessions.length}
			<p class="mt-2 text-xs text-steel">{DAY_NAMES[todayIndex]} · the session is on the Today tab, with the warm-up and the reasons behind it</p>
		{/if}
	</Card>

	{#if planMeta}
		<section aria-labelledby="goal" class="mt-5">
			<Card>
				<div class="flex items-center gap-4">
					<ProgressRing percent={planMeta.percent} size={64} />
					<div class="min-w-0">
						<p class="tabular text-xs uppercase tracking-widest text-steel">Plan progress</p>
						<p class="font-display mt-0.5 text-lg font-semibold">
							{#if planMeta.currentWeek}Week {planMeta.currentWeek} of {planMeta.weeksTotal}{:else}{planMeta.weeksTotal} weeks{/if}{#if planMeta.currentPhase}
								· {cap(planMeta.currentPhase)}{/if}
						</p>
						<p class="mt-0.5 text-sm text-steel">
							{#if planMeta.daysToRace != null}{planMeta.daysToRace} days to race · {planMeta.weeksToGo} weeks to go{:else}{planMeta.weeksToGo} weeks to go{/if}
						</p>
					</div>
				</div>
			</Card>
		</section>
	{/if}

	<!-- At a glance: each card opens its full metric page -->
	<div class="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-3">
		<a href="/progress/week?from=/" class="lift block rounded-xl" aria-label="This week, open the week breakdown">
			<Card tone="sunken">
				<p class="tabular text-[10px] uppercase tracking-widest text-steel">This week</p>
				<p class="tabular mt-1 text-xl font-semibold">{weekLogged}<span class="text-sm text-steel">/{weekPlanned}</span></p>
				<div class="mt-2.5">
					<SegmentedBar
						segments={weekSegments}
						percent={weekPercent}
						size="sm"
						ariaLabel="{weekLogged} of {weekPlanned} sessions done this week"
					/>
				</div>
				<p class="mt-2 text-[11px] text-signal-ink">See the week →</p>
			</Card>
		</a>
		<a href="/progress/streak?from=/" class="lift block rounded-xl" aria-label="Streak, open the full activity heatmap">
			<Card tone="sunken">
				<p class="tabular text-[10px] uppercase tracking-widest text-steel">Streak</p>
				<p class="tabular mt-1 text-lg {streak > 0 ? 'text-ok' : 'text-steel'}">{streak}<span class="text-sm">&nbsp;{streak === 1 ? 'day' : 'days'}</span></p>
				<div class="mt-2.5">
					<ActivityHeatmap trainedDays={logDays} weeks={12} {todayIso} cell={6} gap={2} showMonthLabels={false} />
				</div>
				<p class="mt-2 text-[11px] text-signal-ink">See the heatmap →</p>
			</Card>
		</a>
		<a href="/progress/volume?from=/" class="lift block rounded-xl" aria-label="Volume, open the full distance view">
			<Card tone="sunken">
				<p class="tabular text-[10px] uppercase tracking-widest text-steel">Volume</p>
				<p class="tabular mt-1 text-lg text-steel">{fmtDistance(weekDoneKm)}<span class="text-sm"> / {fmtDistance(weekKm)}</span></p>
				<div class="mt-2.5 flex items-end gap-0.5" style="height: 20px" aria-hidden="true">
					{#each weekly as w (w.startIso)}
						<div class="grow-y flex-1 rounded-[1px] bg-ok" style="height: {Math.max(2, Math.round((w.km / weeklyMax) * 18))}px"></div>
					{/each}
				</div>
				<p class="mt-2 text-[11px] text-signal-ink">See all volume →</p>
			</Card>
		</a>
	</div>

	<!-- Connected health: pull the latest, and a small read of the watch numbers -->
	<section aria-labelledby="health" class="mt-5">
		<Card>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="min-w-0">
					<p class="tabular text-[10px] uppercase tracking-widest text-steel">Connected health</p>
					<p class="mt-0.5 text-sm text-steel">Pull the latest from your watch and health apps.</p>
				</div>
				<SyncButton
					onSynced={() =>
						api
							.recovery()
							.then((r) => (recovery = r))
							.catch(() => {})}
				/>
			</div>
			{#if recovery?.available && recovery.signal && (recovery.signal.avgRestingHr || recovery.signal.avgHrvMs || recovery.signal.avgSleepMin)}
				<div class="mt-4">
					<WatchVitals signal={recovery.signal} days={recovery.days} />
				</div>
			{/if}
		</Card>
	</section>

	<div class="mt-2">
		<a href="/calendar" class="text-xs text-steel hover:text-signal-ink">Open the calendar →</a>
	</div>

	<AdjustmentsCard />

	{#if note}
		<section aria-labelledby="coach-note" class="mt-7">
			<SectionHeader id="coach-note" eyebrow="Coach note" />
			<Card tone="sunken">
				<p class="text-sm">{note}</p>
			</Card>
		</section>
	{/if}

	<section aria-labelledby="recent" class="mt-7">
		<SectionHeader id="recent" eyebrow="Recent activity" />
		<Card tone="sunken">
			{#if recentLogs.length}
				<ul class="divide-y divide-hairline">
					{#each recentLogs as { log, session } (log.id)}
						<li class="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
							<span class="min-w-0 truncate text-sm">{session ? sessionLabel(session) : 'Run'}</span>
							<span class="tabular shrink-0 text-sm text-steel">
								{#if log.runStats?.distanceKm}{fmtDistance(log.runStats.distanceKm)}{/if}
								{#if log.rpe} · RPE {log.rpe}{/if}
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-steel">Nothing logged yet. When you finish a session, it shows up here.</p>
				<a href="/today" class="mt-2 inline-block text-xs text-signal-ink hover:underline">Log today's session →</a>
			{/if}
		</Card>
	</section>
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api } from '$lib/api';
	import { connectionFor, ensureHealth, healthFor } from '$lib/healthCache.svelte';
	import { fmtDistance, prefs, sessionLabel } from '$lib/prefs.svelte';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { isSkipped, skippedIds } from '$lib/skipped.svelte';
	import { type ClientLog, type ClientSession, DAY_NAMES, addDaysIso, localIso, mondayIndex } from '$lib/plan';
	import { logMs, trainedDays, currentStreak, weeklyKmSeries, weekPreview } from '$lib/metrics';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import WeekPreviewCard from '$lib/components/WeekPreviewCard.svelte';
	import StreakPreviewCard from '$lib/components/StreakPreviewCard.svelte';
	import VolumePreviewCard from '$lib/components/VolumePreviewCard.svelte';
	import CalendarPreviewCard from '$lib/components/CalendarPreviewCard.svelte';
	import HealthSummary from '$lib/components/HealthSummary.svelte';
	import { computeProgress, type WeekLike } from '@strideguide/shared/analytics';
	import SessionIcon from '$lib/components/SessionIcon.svelte';

	let note = $state<string | null>(null);
	// Read from the shared cache: the last payload and connection for this user,
	// so a repeat visit renders instantly instead of refetching.
	const health = $derived(healthFor(auth.user?.id ?? null, 30));
	// null while unknown, then true or false once the connection read comes back.
	const healthConnected = $derived(connectionFor(auth.user?.id ?? null)?.connected ?? null);
	let healthBusy = $state(false);

	/**
	 * Read the shared health cache, refreshing in the background when it is
	 * stale. The first visit pulls the numbers; later visits render from the
	 * cache and only revalidate once the reuse window has passed.
	 */
	async function loadHealth() {
		const userId = auth.user?.id;
		if (!userId) return;
		healthBusy = true;
		try {
			await ensureHealth(userId, 30);
		} finally {
			healthBusy = false;
		}
	}

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
					.reduce((sum, s) => sum + (loggedBySession.get(s.id)?.runStats?.distanceKm ?? 0), 0)
			: 0,
	);
	const logDays = $derived(trainedDays(store.logs));
	const skippedDays = $derived.by(() => {
		const out = new Set<string>();
		for (const w of weeks) {
			if (!w.startDate) continue;
			for (const s of w.sessions) if (isSkipped(s.id)) out.add(addDaysIso(w.startDate, s.day));
		}
		return out;
	});
	const streak = $derived(currentStreak(logDays, todayIso));
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
			? computeProgress(store.logs, weeksLike, {
					targetDate: store.plan.goal?.targetDate ?? null,
					todayIso,
					skippedIds: skippedIds(),
				}).planMeta
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
		void loadHealth();
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

	<!-- At a glance: each card opens its full metric page. The same cards, from
	     the same components, appear on the progress tab. -->
	<div class="mt-7 grid grid-cols-1 items-stretch gap-2 sm:grid-cols-3">
		<WeekPreviewCard
			done={week.done}
			planned={week.planned}
			skipped={week.skipped}
			percent={week.percent}
			segments={week.segments}
			from="/"
		/>
		<StreakPreviewCard {streak} trainedDays={logDays} {skippedDays} {todayIso} from="/" />
		<VolumePreviewCard doneKm={weekDoneKm} plannedKm={weekKm} {weekly} {weeklyMax} from="/" />
	</div>

	<!-- Calendar preview: the current month with sessions marked, opening the
	     full calendar. Replaces the old text link so it reads as a real card. -->
	<div class="mt-5">
		<CalendarPreviewCard />
	</div>

	<!-- Connected health: a read-only view of the watch numbers. The shared cache
	     renders the last payload instantly and revalidates when it is stale. -->
	<section aria-labelledby="health" class="mt-5">
		<Card>
			<p class="tabular text-[10px] uppercase tracking-widest text-steel">Connected health</p>
			<p class="mt-0.5 text-sm text-steel">Your watch and health numbers, from the last 30 days.</p>
			{#if health?.available && (Object.keys(health.metrics).length || Object.keys(health.samples).length)}
				<div class="mt-4">
					<HealthSummary payload={health} max={4} />
				</div>
				<a href="/progress/health?from=/" class="mt-3 inline-block text-xs text-signal-ink hover:underline">See all health →</a>
			{:else if healthConnected === false}
				<p class="mt-3 text-sm text-steel">Connect a watch or health app in Settings to see your numbers here.</p>
				<a href="/settings/connections" class="mt-2 inline-block text-xs text-signal-ink hover:underline">Open Settings →</a>
			{:else if healthConnected && !health && healthBusy}
				<p class="mt-3 text-sm text-steel">Connected. Pulling your data now.</p>
			{:else if healthConnected}
				<p class="mt-3 text-sm text-steel">Connected, but no data yet. Sync it in Settings.</p>
				<a href="/settings/connections" class="mt-2 inline-block text-xs text-signal-ink hover:underline">Sync in Settings →</a>
			{:else}
				<p class="mt-3 text-sm text-steel">Your health numbers will appear here once a watch is connected.</p>
			{/if}
		</Card>
	</section>

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
{/if}

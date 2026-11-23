<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api } from '$lib/api';
	import { fmtDistance, prefs, sessionLabel } from '$lib/prefs.svelte';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { type ClientSession, DAY_NAMES, addDaysIso, mondayIndex } from '$lib/plan';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';

	let note = $state<string | null>(null);

	// Send a signed-in user with no plan to onboarding, once per session, unless
	// they have said "not now". The session guard means the Dashboard tab still
	// shows the empty state instead of bouncing them straight back.
	const DISMISS_KEY = 'sg:onboardingDismissed';
	const REDIRECT_KEY = 'sg:onboardingRedirected';

	const todayIndex = mondayIndex(new Date());
	const todayIso = new Date().toISOString().slice(0, 10);
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
	function logMs(v: unknown): number {
		if (typeof v === 'number') return v * 1000;
		const t = typeof v === 'string' ? Date.parse(v) : Number.NaN;
		return Number.isNaN(t) ? 0 : t;
	}
	const logDays = $derived.by(() => {
		const days = new Set<string>();
		for (const l of store.logs) {
			const ms = logMs(l.createdAt);
			if (ms) days.add(new Date(ms).toISOString().slice(0, 10));
		}
		return days;
	});
	const streak = $derived.by(() => {
		// Count back from today, or from yesterday if today has no log yet.
		let cursor = logDays.has(todayIso) ? todayIso : addDaysIso(todayIso, -1);
		let count = 0;
		while (logDays.has(cursor)) {
			count++;
			cursor = addDaysIso(cursor, -1);
		}
		return count;
	});
	const recentLogs = $derived.by(() => {
		const byId = new Map<string, ClientSession>();
		for (const w of weeks) for (const s of w.sessions) byId.set(s.id, s);
		return store.logs
			.filter((l) => l.sessionId)
			.slice()
			.sort((a, b) => logMs(b.createdAt) - logMs(a.createdAt))
			.slice(0, 3)
			.map((l) => ({ log: l, session: l.sessionId ? byId.get(l.sessionId) : undefined }));
	});
	onMount(async () => {
		await ensureAuth();
		if (!auth.user) return;
		await ensurePlan();
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
			href="/today"
			class="mt-4 flex w-full items-center justify-center rounded-md bg-ink px-5 py-3.5 text-sm font-medium text-paper hover:opacity-90"
		>
			{daySessions.length ? "Start today's session" : 'Look ahead to tomorrow'}
		</a>
		{#if daySessions.length}
			<p class="mt-2 text-xs text-steel">{DAY_NAMES[todayIndex]} · the session is on the Today tab, with the warm-up and the reasons behind it</p>
		{/if}
	</Card>

	<!-- At a glance -->
	<div class="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-3">
		<Card tone="sunken">
			<p class="tabular text-[10px] uppercase tracking-widest text-steel">This week</p>
			<p class="tabular mt-1 text-xl font-semibold">{weekLogged}<span class="text-sm text-steel">/{weekPlanned}</span></p>
			<div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-hairline">
				<div class="h-full rounded-full bg-ok" style="width: {weekPlanned ? (weekLogged / weekPlanned) * 100 : 0}%"></div>
			</div>
			<p class="mt-1 text-[11px] text-steel">sessions done</p>
		</Card>
		<Card tone="sunken">
			<p class="tabular text-[10px] uppercase tracking-widest text-steel">Volume</p>
			<p class="tabular mt-1 text-lg text-steel">{fmtDistance(weekDoneKm)}<span class="text-sm"> / {fmtDistance(weekKm)}</span></p>
			<p class="mt-1 text-[11px] text-steel">logged / planned</p>
		</Card>
		<Card tone="sunken">
			<p class="tabular text-[10px] uppercase tracking-widest text-steel">Streak</p>
			<p class="tabular mt-1 text-lg {streak > 0 ? 'text-ok' : 'text-steel'}">{streak}<span class="text-sm">&nbsp;{streak === 1 ? 'day' : 'days'}</span></p>
			<p class="mt-1 text-[11px] text-steel">training</p>
		</Card>
	</div>

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

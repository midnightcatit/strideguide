<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api, type ApiUser } from '$lib/api';
	import { fmtDistance, fmtPaceBand, sessionLabel } from '$lib/prefs.svelte';
	import { store, ensurePlan, upsertLog } from '$lib/planStore.svelte';
	import { type ClientSession, DAY_NAMES, mondayIndex } from '$lib/plan';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import SessionDetail from '$lib/components/SessionDetail.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	let user = $state<ApiUser | null>(null);
	let checked = $state(false);
	let logTarget = $state<ClientSession | null>(null);
	let playTarget = $state<ClientSession | null>(null);
	let detailTarget = $state<ClientSession | null>(null);
	let note = $state<string | null>(null);

	const todayIndex = mondayIndex(new Date());
	const todayIso = new Date().toISOString().slice(0, 10);
	const dayLabel = new Date()
		.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
		.toUpperCase();

	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);
	const todayWeek = $derived(
		(store.plan?.weeks ?? []).find(
			(w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate,
		) ?? store.plan?.weeks?.[0],
	);
	const daySessions = $derived(todayWeek?.sessions.filter((s) => s.day === todayIndex) ?? []);
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	const stalePlan = $derived(
		(store.plan?.weeks.length ?? 0) > 0 &&
			(store.plan?.weeks ?? []).some((w) => w.sessions.some((s) => !s.prescription?.workout)),
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
	const planCap = $derived(todayWeek?.targetVolumeKm ?? weekKm);
	const dayMinutes = $derived(daySessions.reduce((m, s) => m + (s.durationMin ?? 0), 0));

	// Next session after today (for rest days).
	const nextSession = $derived.by(() => {
		const weeks = store.plan?.weeks ?? [];
		const all: { s: ClientSession; date: string }[] = [];
		for (const w of weeks) {
			if (!w.startDate) continue;
			const base = new Date(`${w.startDate}T00:00:00Z`);
			for (const s of w.sessions) {
				const d = new Date(base);
				d.setUTCDate(d.getUTCDate() + s.day);
				all.push({ s, date: d.toISOString().slice(0, 10) });
			}
		}
		return all.filter((x) => x.date > todayIso).sort((a, b) => a.date.localeCompare(b.date))[0];
	});

	onMount(async () => {
		user = await api.me().catch(() => null);
		if (user) {
			await ensurePlan();
			note = (await api.latestSummary().catch(() => ({ summary: null }))).summary?.body ?? null;
		}
		checked = true;
	});
</script>

{#if !checked}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if !user}
	<section class="mt-10 text-center">
		<p class="tabular text-xs uppercase tracking-widest text-steel">Stride Guide</p>
		<h1 class="font-display mt-2 text-2xl font-bold">Built around your race, your pace, your week.</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm text-steel">
			Pick a goal and a race date. We write the sessions and explain each one.
		</p>
		<button
			type="button"
			onclick={() => api.login()}
			class="mt-6 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
		>
			Sign in with Google
		</button>
	</section>
{:else if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else if !todayWeek}
	<section class="mt-10 text-center">
		<p class="tabular text-xs uppercase tracking-widest text-steel">No plan yet</p>
		<h1 class="font-display mt-2 text-2xl font-bold">Let's build your plan.</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm text-steel">
			Pick a goal, a race date, and the days you can train. We'll generate a week-by-week plan.
		</p>
		<a href="/onboarding" class="mt-6 inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Build my plan</a>
	</section>
{:else}
	{#if stalePlan}
		<div class="mb-6 rounded-xl border border-signal bg-signal-wash p-4 text-sm">
			This plan predates guided workouts. Rebuild it to get step-by-step sessions and drills.
			<a href="/onboarding" class="ml-1 font-medium text-signal-ink hover:underline">Rebuild plan →</a>
		</div>
	{/if}

	<!-- Masthead -->
	<header class="mb-7">
		<div class="flex items-baseline justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">Today</p>
			<p class="tabular text-xs text-steel">{dayLabel} · W{todayWeek.weekNumber}</p>
		</div>
		<h1 class="font-display mt-1 text-2xl font-bold">{profileName}</h1>
		<p class="mt-0.5 text-sm text-steel">{todayWeek.focus ?? ''}</p>
	</header>

	<AdjustmentsCard />

	{#if note}
		<section aria-labelledby="coach-note" class="mb-7">
			<SectionHeader id="coach-note" eyebrow="Coach note" />
			<Card tone="sunken">
				<p class="text-sm">{note}</p>
			</Card>
		</section>
	{/if}

	<!-- Today's session(s) -->
	<section aria-labelledby="today-session" class="mb-7">		<SectionHeader
			id="today-session"
			eyebrow={daySessions.length ? "Today's session" : 'Today'}
			meta={daySessions.length ? `${daySessions.length} ${daySessions.length === 1 ? 'session' : 'sessions'} · ${dayMinutes} min` : 'Rest · 0 min'}
		/>
		{#if daySessions.length}
			<SessionCarousel sessions={daySessions} {card} />
		{:else}
			<Card tone="sunken">
				<p class="text-sm text-steel">Nothing scheduled. Recovery is part of the plan, not a gap in it.</p>
				{#if nextSession}
					<hr class="my-3 border-hairline" />
					<div class="flex items-baseline justify-between gap-3">
						<div>
							<p class="tabular text-xs uppercase tracking-widest text-steel">Next session</p>
							<p class="mt-1 text-sm">{sessionLabel(nextSession.s)}</p>
							{#if nextSession.s.prescription?.targetDistanceKm}
								<p class="tabular text-sm text-steel">
									{fmtDistance(nextSession.s.prescription.targetDistanceKm)}{#if nextSession.s.prescription.targetPaceSecPerKm}
										· {fmtPaceBand(nextSession.s.prescription.targetPaceSecPerKm)}{/if}
								</p>
							{/if}
						</div>
						<a href="/week" class="shrink-0 rounded-md border border-hairline px-3 py-2 text-sm hover:border-signal hover:text-signal-ink">Peek →</a>
					</div>
				{/if}
			</Card>
		{/if}
	</section>

	<!-- Week so far -->
	<section aria-labelledby="week-so-far" class="mb-7">
		<SectionHeader id="week-so-far" eyebrow="Week so far" meta="W{todayWeek.weekNumber}" />
		<Card tone="sunken">
			<div class="flex flex-wrap gap-1" role="img" aria-label="{weekLogged} of {weekPlanned} sessions done this week">
				{#each todayWeek.sessions as s (s.id)}
					{@const done = loggedBySession.has(s.id)}
					<span class="h-4 w-2 rounded-[1px] {done ? 'bg-ink' : 'bg-hairline-strong/40'}"></span>
				{/each}
			</div>
			<p class="tabular mt-2 text-sm">
				{weekLogged} of {weekPlanned} done
				<span class="text-steel"> · {fmtDistance(weekKm)} of {fmtDistance(planCap)}</span>
			</p>
			<a href="/week" class="mt-3 inline-block text-xs text-steel hover:text-signal-ink">Full week →</a>
		</Card>
	</section>

	<!-- Why -->
	{#if daySessions[0]}
		<section aria-labelledby="why" class="mt-7">
			<SectionHeader id="why" eyebrow="Why this session" />
			<Card>
				<p class="text-sm text-steel">{daySessions[0].purpose ?? 'The reasoning behind this session.'}</p>
				<button
					type="button"
					onclick={() => (detailTarget = daySessions[0] ?? null)}
					class="mt-2 text-sm text-signal-ink hover:underline"
				>
					See full detail →
				</button>
			</Card>
		</section>
	{/if}

	<!-- Quick -->
{/if}

{#if playTarget}
	<SessionPlayer		session={playTarget}
		eyebrow="{profileName} · W{todayWeek?.weekNumber ?? ''}"
		onClose={() => (playTarget = null)}
		onFinish={() => {
			logTarget = playTarget;
			playTarget = null;
		}}
	/>
{/if}

{#if logTarget}
	<LogSheet
		session={logTarget}
		eyebrow="{profileName} · W{todayWeek?.weekNumber ?? ''}"
		onClose={() => (logTarget = null)}
		onSaved={(log) => {
			upsertLog(log);
			logTarget = null;
		}}
	/>
{/if}

{#if detailTarget}
	<SessionDetail
		session={detailTarget}
		eyebrow={`${profileName} · W${todayWeek?.weekNumber ?? ''}`}
		logged={loggedBySession.get(detailTarget.id) ?? null}
		onClose={() => (detailTarget = null)}
		onLog={() => {
			logTarget = detailTarget;
			detailTarget = null;
		}}
		onStart={() => {
			playTarget = detailTarget;
			detailTarget = null;
		}}
	/>
{/if}

{#snippet card(s: ClientSession)}
	<SessionCard
		session={s}
		eyebrow={`${profileName} · W${todayWeek?.weekNumber ?? ''}`}
		active
		logged={loggedBySession.get(s.id) ?? null}
		onLog={() => (logTarget = s)}
		onStart={() => (playTarget = s)}
		onOpen={() => (detailTarget = s)}
	/>
{/snippet}

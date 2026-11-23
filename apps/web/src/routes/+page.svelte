<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api } from '$lib/api';
	import { fmtDistance, sessionLabel } from '$lib/prefs.svelte';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { DAY_NAMES, mondayIndex } from '$lib/plan';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	let note = $state<string | null>(null);

	const todayIndex = mondayIndex(new Date());
	const todayIso = new Date().toISOString().slice(0, 10);
	const greeting = $derived.by(() => {
		const h = new Date().getHours();
		return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
	});

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
	onMount(async () => {
		await ensureAuth();
		if (auth.user) {
			await ensurePlan();
			note = (await api.latestSummary().catch(() => ({ summary: null }))).summary?.body ?? null;
		}
	});
</script>

{#if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else if !weeks.length}
	<section class="mt-10 text-center">
		<p class="tabular text-xs uppercase tracking-widest text-steel">No plan yet</p>
		<h1 class="font-display mt-2 text-2xl font-bold">Build your plan.</h1>
		<p class="mx-auto mt-3 max-w-sm text-sm text-steel">
			Pick a goal and a race date. We write the sessions and explain each one.
		</p>
		<a href="/onboarding" class="mt-6 inline-block rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Build my plan</a>
	</section>
{:else}
	<header class="mb-6">
		<p class="tabular text-xs uppercase tracking-widest text-steel">{greeting}</p>
		<h1 class="font-display mt-1 text-2xl font-bold">
			{daySessions.length ? `${daySessions.length === 1 ? sessionLabel(daySessions[0]) : `${daySessions.length} sessions`} today` : 'Rest day'}
		</h1>
		<p class="mt-1 text-sm text-steel">{profileName}{#if todayWeek} · Week {todayWeek.weekNumber}{/if}</p>
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
			<p class="mt-2 text-xs text-steel">{DAY_NAMES[todayIndex]} · tap a card to see the workout and the why</p>
		{/if}
	</Card>

	<AdjustmentsCard />

	{#if note}
		<section aria-labelledby="coach-note" class="mt-7">
			<SectionHeader id="coach-note" eyebrow="Coach note" />
			<Card tone="sunken">
				<p class="text-sm">{note}</p>
			</Card>
		</section>
	{/if}

	<section aria-labelledby="week" class="mt-7">
		<SectionHeader id="week" eyebrow="Week so far" meta="W{todayWeek?.weekNumber ?? ''}" />
		<Card tone="sunken">
			<div class="flex flex-wrap gap-1" role="img" aria-label="{weekLogged} of {weekPlanned} sessions done this week">
				{#each todayWeek?.sessions ?? [] as s (s.id)}
					{@const done = loggedBySession.has(s.id)}
					<span class="h-4 w-2 rounded-[1px] {done ? 'bg-ink' : 'bg-ink/40'}"></span>
				{/each}
			</div>
			<p class="tabular mt-2 text-sm">
				{weekLogged} of {weekPlanned} done
				<span class="text-steel"> · {fmtDistance(weekKm)} planned</span>
			</p>
			<a href="/week" class="mt-3 inline-block text-xs text-steel hover:text-signal-ink">See the full week →</a>
		</Card>
	</section>
{/if}

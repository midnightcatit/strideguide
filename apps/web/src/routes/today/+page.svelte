<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api } from '$lib/api';
	import { fmtDistance, sessionLabel } from '$lib/prefs.svelte';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { store, ensurePlan, upsertLog } from '$lib/planStore.svelte';
	import { type ClientSession, DAY_NAMES, addDaysIso, dayIndexInWeek, mondayIndex } from '$lib/plan';
	import { overlayHistory } from '$lib/overlayHistory.svelte';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';
	import SessionDetail from '$lib/components/SessionDetail.svelte';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	let logTarget = $state<ClientSession | null>(null);
	let playTarget = $state<ClientSession | null>(null);
	let detailTarget = $state<ClientSession | null>(null);
	let note = $state<string | null>(null);

	// Back (browser or hardware) closes an open overlay instead of leaving the page.
	overlayHistory(
		() => !!(detailTarget || playTarget || logTarget),
		() => {
			if (logTarget) logTarget = null;
			else if (playTarget) playTarget = null;
			else detailTarget = null;
		},
	);

	const todayIndex = mondayIndex(new Date());
	const todayIso = new Date().toISOString().slice(0, 10);
	let selectedIso = $state(todayIso);
	// Which way the day moved, so the panel slides in the direction you stepped.
	let dayDir = $state<1 | -1>(1);
	const isToday = $derived(selectedIso === todayIso);

	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);
	const weeks = $derived(store.plan?.weeks ?? []);
	const sel = $derived.by(() => {
		for (const w of weeks) {
			if (w.startDate && w.endDate && selectedIso >= w.startDate && selectedIso <= w.endDate) {
				return { week: w, day: dayIndexInWeek(w.startDate, selectedIso) };
			}
		}
		return undefined;
	});
	const selWeek = $derived(sel?.week);
	const selDay = $derived(sel?.day ?? todayIndex);
	const daySessions = $derived(selWeek ? selWeek.sessions.filter((s) => s.day === selDay) : []);
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	const stalePlan = $derived(
		weeks.length > 0 && weeks.some((w) => w.sessions.some((s) => !s.prescription?.workout)),
	);

	const dateLabel = $derived(
		new Date(`${selectedIso}T00:00:00Z`)
			.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
			.toUpperCase(),
	);

	const weekLogged = $derived(selWeek ? selWeek.sessions.filter((s) => loggedBySession.has(s.id)).length : 0);
	const weekPlanned = $derived(selWeek?.sessions.length ?? 0);
	const weekKm = $derived(
		selWeek
			? selWeek.sessions
					.filter((s) => s.modality === 'running')
					.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0)
			: 0,
	);
	const planCap = $derived(selWeek?.targetVolumeKm ?? weekKm);
	const dayMinutes = $derived(daySessions.reduce((m, s) => m + (s.durationMin ?? 0), 0));

	function stepDay(n: number) {
		dayDir = n >= 0 ? 1 : -1;
		selectedIso = addDaysIso(selectedIso, n);
	}
	function goToday() {
		dayDir = selectedIso < todayIso ? 1 : -1;
		selectedIso = todayIso;
	}

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
{:else if !store.loaded}
	<p class="tabular mt-6 text-sm text-steel">Loading…</p>
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
	{#if stalePlan}
		<div class="mb-6 rounded-xl border border-signal bg-signal-wash p-4 text-sm">
			This plan predates guided workouts. Rebuild it to get step-by-step sessions and drills.
			<a href="/onboarding" class="ml-1 font-medium text-signal-ink hover:underline">Rebuild plan →</a>
		</div>
	{/if}

	<header class="mb-4">
		<div class="flex items-baseline justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">{isToday ? 'Today' : DAY_NAMES[selDay]}</p>
			<p class="tabular text-xs text-steel">{dateLabel}{#if selWeek} · W{selWeek.weekNumber}{/if}</p>
		</div>
		<h1 class="font-display mt-1 text-2xl font-bold">
			{daySessions.length
				? daySessions.length > 1
					? `${daySessions.length} sessions`
					: sessionLabel(daySessions[0])
				: 'Rest day'}
		</h1>
		{#if !isToday}
			<div class="mt-3">
				<button type="button" onclick={goToday} class="rounded-md border border-hairline px-3 py-2 text-xs text-signal-ink hover:border-signal">Back to today</button>
			</div>
		{/if}
	</header>

	<!-- Day controls on phones; laptops get the flanking arrows. -->
	<div class="mb-3 flex items-center gap-2 sm:hidden">
		<button
			type="button"
			onclick={() => stepDay(-1)}
			aria-label="Previous day"
			class="flex h-11 flex-1 items-center justify-center rounded-xl border border-hairline text-lg text-steel hover:border-signal hover:text-signal-ink"
		>
			‹
		</button>
		<button
			type="button"
			onclick={() => stepDay(1)}
			aria-label="Next day"
			class="flex h-11 flex-1 items-center justify-center rounded-xl border border-hairline text-lg text-steel hover:border-signal hover:text-signal-ink"
		>
			›
		</button>
	</div>

	<!-- Day panel with flanking arrows (laptop) -->
	<div class="flex items-stretch gap-2">
		<button
			type="button"
			onclick={() => stepDay(-1)}
			aria-label="Previous day"
			class="hidden w-12 shrink-0 items-center justify-center rounded-xl border border-hairline text-xl text-steel hover:border-signal hover:text-signal-ink sm:flex"
		>
			‹
		</button>

		<div
			class="scroll-modern min-w-0 flex-1 rounded-xl border border-hairline bg-paper p-4 sm:h-[var(--panel-h)] sm:overflow-y-auto"
			role="group"
			aria-label="Day panel"
		>
			<AdjustmentsCard />

			{#if note}<p class="mb-5 rounded-lg bg-sunken p-3 text-sm">{note}</p>{/if}

			{#key selectedIso}
				<div class={dayDir === 1 ? 'sg-enter-right' : 'sg-enter-left'}>
					<SectionHeader
						id="day-sessions"
						eyebrow={selWeek ? `W${selWeek.weekNumber} · ${DAY_NAMES[selDay]}` : 'Day'}
						meta={daySessions.length ? `${daySessions.length} · ${dayMinutes} min` : 'Rest'}
					/>
					{#if daySessions.length}
						<SessionCarousel sessions={daySessions} {card} />
					{:else if selWeek}
						<Card tone="sunken" frame>
							<p class="text-sm text-steel">Nothing scheduled. Recovery is part of the plan, not a gap in it.</p>
						</Card>
					{:else}
						<Card tone="sunken" frame>
							<p class="text-sm text-steel">This day is outside your plan.</p>
						</Card>
					{/if}
				</div>
			{/key}

			{#if selWeek}
				<hr class="my-6 border-hairline" />
				<SectionHeader id="week-so-far" eyebrow="Week so far" meta={`W${selWeek.weekNumber}`} />
				<div class="flex flex-wrap gap-1" role="img" aria-label="{weekLogged} of {weekPlanned} sessions done this week">
					{#each selWeek.sessions as s (s.id)}
						{@const done = loggedBySession.has(s.id)}
						<span class="h-4 w-2 rounded-[1px] {done ? 'bg-ink' : 'bg-ink/40'}"></span>
					{/each}
				</div>
				<p class="tabular mt-2 text-sm">
					{weekLogged} of {weekPlanned} done
					<span class="text-steel"> · {fmtDistance(weekKm)} of {fmtDistance(planCap)}</span>
				</p>

				{#if daySessions[0]}
					<hr class="my-6 border-hairline" />
					<SectionHeader id="why" eyebrow="Why this workout" />
					<p class="text-sm text-steel">{daySessions[0].purpose ?? 'The reasoning behind this session.'}</p>
					<button type="button" onclick={() => (detailTarget = daySessions[0] ?? null)} class="mt-2 text-sm text-signal-ink hover:underline">
						Why this workout, and what's to come →
					</button>
				{/if}
			{/if}
		</div>

		<button
			type="button"
			onclick={() => stepDay(1)}
			aria-label="Next day"
			class="hidden w-12 shrink-0 items-center justify-center rounded-xl border border-hairline text-xl text-steel hover:border-signal hover:text-signal-ink sm:flex"
		>
			›
		</button>
	</div>
{/if}

{#if playTarget}
	<SessionPlayer session={playTarget} eyebrow={`${profileName} · W${selWeek?.weekNumber ?? ''}`} onClose={() => (playTarget = null)} onFinish={() => { logTarget = playTarget; playTarget = null; }} />
{/if}

{#if logTarget}
	<LogSheet session={logTarget} eyebrow={`${profileName} · W${selWeek?.weekNumber ?? ''}`} onClose={() => (logTarget = null)} onSaved={(log) => { upsertLog(log); logTarget = null; }} />
{/if}

{#if detailTarget}
	<SessionDetail
		session={detailTarget}
		eyebrow={`${profileName} · W${selWeek?.weekNumber ?? ''}`}
		logged={loggedBySession.get(detailTarget.id) ?? null}
		onClose={() => (detailTarget = null)}
		onLog={() => { logTarget = detailTarget; detailTarget = null; }}
		onStart={() => { playTarget = detailTarget; detailTarget = null; }}
	/>
{/if}

{#snippet card(s: ClientSession)}
	<SessionCard
		session={s}
		eyebrow={`${profileName} · W${selWeek?.weekNumber ?? ''}`}
		active={isToday}
		logged={loggedBySession.get(s.id) ?? null}
		onLog={() => (logTarget = s)}
		onStart={() => (playTarget = s)}
		onOpen={() => (detailTarget = s)}
	/>
{/snippet}

<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { fmtDistance, sessionLabel } from '$lib/prefs.svelte';
	import { store, ensurePlan, upsertLog } from '$lib/planStore.svelte';
	import { type ClientSession, DAY_INITIALS, DAY_NAMES, mondayIndex } from '$lib/plan';
	import { overlayHistory } from '$lib/overlayHistory.svelte';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';
	import SessionDetail from '$lib/components/SessionDetail.svelte';
	import Card from '$lib/components/Card.svelte';
	import MonthCalendar from '$lib/components/MonthCalendar.svelte';

	const todayIndex = mondayIndex(new Date());
	const todayIso = new Date().toISOString().slice(0, 10);

	let weekIndex = $state(0);
	let selectedDay = $state(todayIndex);
	let view = $state<'week' | 'month'>('week');
	let logTarget = $state<ClientSession | null>(null);
	let playTarget = $state<ClientSession | null>(null);
	let detailTarget = $state<ClientSession | null>(null);

	// Back (browser or hardware) closes an open overlay instead of leaving the page.
	overlayHistory(
		() => !!(detailTarget || playTarget || logTarget),
		() => {
			if (logTarget) logTarget = null;
			else if (playTarget) playTarget = null;
			else detailTarget = null;
		},
	);

	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);
	const weeks = $derived(store.plan?.weeks ?? []);
	const currentWeek = $derived(weeks[weekIndex]);
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	const daySessions = $derived(
		currentWeek ? currentWeek.sessions.filter((s) => s.day === selectedDay) : [],
	);
	const currentWeekIsToday = $derived(
		!!currentWeek?.startDate &&
			!!currentWeek?.endDate &&
			todayIso >= currentWeek.startDate &&
			todayIso <= currentWeek.endDate,
	);

	function dayLevel(day: number): number {
		const ds = currentWeek?.sessions.filter((s) => s.day === day) ?? [];
		if (!ds.length) return 0;
		return Math.max(
			...ds.map((s) =>
				s.prescription?.intensity === 'hard' ? 3 : s.prescription?.intensity === 'steady' ? 2 : 1,
			),
		);
	}
	function dayLogged(day: number): boolean {
		return (currentWeek?.sessions ?? []).some((s) => s.day === day && loggedBySession.has(s.id));
	}
	function dayDistance(day: number): number {
		return (currentWeek?.sessions ?? [])
			.filter((s) => s.day === day && s.modality === 'running')
			.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0);
	}

	function selectWeek(i: number) {
		weekIndex = Math.max(0, Math.min(weeks.length - 1, i));
		const w = weeks[weekIndex];
		if (!w) return;
		const inWeek = w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate;
		selectedDay = inWeek
			? (w.sessions.find((s) => s.day === todayIndex)?.day ?? w.sessions[0]?.day ?? todayIndex)
			: (w.sessions[0]?.day ?? todayIndex);
	}

	function stepDay(delta: number) {
		const d = selectedDay + delta;
		if (d < 0) {
			if (weekIndex > 0) {
				weekIndex -= 1;
				selectedDay = 6;
			}
		} else if (d > 6) {
			if (weekIndex < weeks.length - 1) {
				weekIndex += 1;
				selectedDay = 0;
			}
		} else {
			selectedDay = d;
		}
	}

	function goToday() {
		const idx = weeks.findIndex(
			(w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate,
		);
		weekIndex = idx >= 0 ? idx : 0;
		selectedDay = todayIndex;
	}

	onMount(async () => {
		await ensurePlan();
		const idx = weeks.findIndex(
			(w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate,
		);
		selectWeek(idx >= 0 ? idx : 0);
	});
</script>

{#if !store.loaded}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if !currentWeek}
	<p class="mt-6 text-sm text-steel">No plan yet. <a href="/onboarding" class="text-signal-ink hover:underline">Build one →</a></p>
{:else}
	<header class="mb-6">
		<div class="flex items-baseline justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">Calendar</p>
			<div class="flex items-center gap-2">
				{#if view === 'week'}
					<button type="button" onclick={() => selectWeek(weekIndex - 1)} disabled={weekIndex === 0} aria-label="Previous week" class="flex h-11 w-11 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink disabled:opacity-40">‹</button>
					<span class="tabular text-xs text-steel">W{currentWeek.weekNumber} of {weeks.length}</span>
					<button type="button" onclick={() => selectWeek(weekIndex + 1)} disabled={weekIndex >= weeks.length - 1} aria-label="Next week" class="flex h-11 w-11 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink disabled:opacity-40">›</button>
				{/if}
			</div>
		</div>
		{#if view === 'week'}
			<h1 class="font-display mt-1 text-2xl font-bold">{currentWeek.focus ?? 'This week'}</h1>
			{#if currentWeek.summaryText}<p class="mt-0.5 text-sm text-steel">{currentWeek.summaryText}</p>{/if}
		{/if}
		<div class="mt-3 inline-flex rounded-lg border border-hairline p-0.5" role="group" aria-label="Calendar view">
			<button type="button" aria-pressed={view === 'week'} onclick={() => (view = 'week')} class="rounded-md px-3 py-1.5 text-xs {view === 'week' ? 'bg-ink text-paper' : 'text-steel hover:text-ink'}">Week</button>
			<button type="button" aria-pressed={view === 'month'} onclick={() => (view = 'month')} class="rounded-md px-3 py-1.5 text-xs {view === 'month' ? 'bg-ink text-paper' : 'text-steel hover:text-ink'}">Month</button>
		</div>
	</header>

	{#if view === 'week'}

	<!-- 7-cell load ledger (primary control) -->
	<Card tone="sunken">
		<div class="grid grid-cols-7 gap-1" role="group" aria-label="Days of the week">
			{#each DAY_INITIALS as initial, day (day)}
				{@const level = dayLevel(day)}
				{@const logged = dayLogged(day)}
				{@const km = dayDistance(day)}
				<button
					type="button"
					aria-pressed={day === selectedDay}
					aria-label="{DAY_NAMES[day]}{logged ? ', logged' : ''}{km ? `, ${fmtDistance(km)}` : ''}"
					onclick={() => (selectedDay = day)}
					class="flex flex-col items-center gap-1.5 rounded-md py-2 transition-colors {day === selectedDay
						? 'bg-ink text-paper'
						: 'text-steel hover:text-ink'}"
				>
					<span class="tabular text-xs uppercase tracking-wide">{initial}</span>
					<span class="flex h-3 items-end gap-0.5" aria-hidden="true">
						{#each [1, 2, 3] as i (i)}
							<span
								class="w-0.5 rounded-[1px] {i <= level
									? day === selectedDay
										? 'bg-paper'
										: 'bg-ink'
									: day === selectedDay
										? 'bg-paper/30'
										: 'bg-hairline'}"
								style="height: {3 + i * 3}px"
							></span>
						{/each}
					</span>
					<span class="h-3 text-[10px] {logged ? 'text-signal-ink' : 'text-transparent'}" aria-hidden="true">✓</span>
					{#if currentWeekIsToday && day === todayIndex}
						<span class="h-0.5 w-4 rounded-full {day === selectedDay ? 'bg-paper' : 'bg-signal-ink'}" aria-hidden="true"></span>
					{/if}
				</button>
			{/each}
		</div>
	</Card>

	<section aria-labelledby="day-sessions" class="mt-7">
		<div class="mb-2 flex items-center justify-between gap-3">
			<h2 id="day-sessions" class="tabular min-w-0 truncate text-xs uppercase tracking-widest text-steel">{DAY_NAMES[selectedDay]}</h2>
			<div class="flex shrink-0 items-center gap-1">
				{#if selectedDay !== todayIndex || !currentWeekIsToday}
					<button type="button" onclick={goToday} class="mr-1 flex h-11 items-center rounded-md border border-hairline-strong px-3 text-xs text-signal-ink hover:border-signal">Today</button>
				{/if}
				<button type="button" onclick={() => stepDay(-1)} aria-label="Previous day" class="flex h-11 w-11 shrink-0 items-center justify-center text-steel hover:text-ink">‹</button>
				<span class="tabular text-xs text-steel">{selectedDay + 1} / 7</span>
				<button type="button" onclick={() => stepDay(1)} aria-label="Next day" class="flex h-11 w-11 shrink-0 items-center justify-center text-steel hover:text-ink">›</button>
			</div>
		</div>
		{#if daySessions.length}
			<SessionCarousel sessions={daySessions} {card} />
		{:else}
			<Card tone="sunken" frame>
				<p class="text-sm text-steel">Rest day. Nothing scheduled.</p>
			</Card>
		{/if}
	</section>
	{:else}
		<MonthCalendar />
	{/if}
{/if}

{#if playTarget}
	<SessionPlayer
		session={playTarget}
		eyebrow="{profileName} · W{currentWeek?.weekNumber ?? ''}"
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
		eyebrow="{profileName} · W{currentWeek?.weekNumber ?? ''}"
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
		eyebrow={`${profileName} · W${currentWeek?.weekNumber ?? ''}`}
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
		eyebrow={`${profileName} · W${currentWeek?.weekNumber ?? ''}`}
		active={selectedDay === todayIndex}
		logged={loggedBySession.get(s.id) ?? null}
		onLog={() => (logTarget = s)}
		onStart={() => (playTarget = s)}
		onOpen={() => (detailTarget = s)}
	/>
{/snippet}

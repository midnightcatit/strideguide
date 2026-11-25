<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, beforeNavigate } from '$app/navigation';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api } from '$lib/api';
	import { fmtDistance, prefs, sessionLabel } from '$lib/prefs.svelte';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { store, ensurePlan, reloadPlan } from '$lib/planStore.svelte';
	import { readView, saveView } from '$lib/viewState';
	import { type ClientActivity, type ClientSession, DAY_NAMES, addDaysIso, dayIndexInWeek, localIso, mondayIndex, weekdayIndexFromIso } from '$lib/plan';
	import { isSkipped, unskipSession } from '$lib/skipped.svelte';
	import { clearStarted, markStarted } from '$lib/started.svelte';
	import { clearProgress } from '$lib/sessionProgress.svelte';
	import { logHref, playHref, sessionHref, activityHref } from '$lib/sessionNav';
	import { TRAINING_PROGRESS, CHART_MUTED, CHART_EMPTY } from '$lib/chartPalette';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import WeekStrip from '$lib/components/WeekStrip.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import RaceCard from '$lib/components/RaceCard.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';
	import ConnectNudge from '$lib/components/ConnectNudge.svelte';

	/**
	 * One card in the day's scroll. Planned sessions and imported activities sit
	 * in the same carousel, so the day reads as one list of workouts; the kind
	 * says which card to draw.
	 */
	type DayItem =
		| { kind: 'session'; id: string; session: ClientSession }
		| { kind: 'activity'; id: string; activity: ClientActivity };

	let note = $state<string | null>(null);
	let revealId = $state<string | null>(null);
	// The card at the scroll center of the day's carousel, so a session view can
	// return the runner to the same card they left.
	let activeCardId = $state<string | null>(null);
	// The card to scroll back to on mount, from a saved view state (a Back).
	let restoreCardId = $state<string | null>(null);
	let activities = $state<ClientActivity[]>([]);
	let confirm = $state<{
		title: string;
		body: string;
		confirmLabel: string;
		tone?: 'default' | 'danger';
		action: () => void;
	} | null>(null);

	const todayIndex = mondayIndex(new Date());
	const todayIso = localIso();
	let selectedIso = $state(todayIso);
	// Which way it moved, so the panel slides in the direction you stepped.
	let dayDir = $state<1 | -1>(1);
	// A week step gets a stronger slide than a single day step, so switching
	// weeks (even between two empty ones) reads clearly.
	let changeKind = $state<'day' | 'week'>('day');
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
	// The strip's highlighted column is where the shown date sits in the week on
	// screen, read from the date itself. That way a swipe or a tap to a day
	// outside the plan still moves the indicator to the day actually selected.
	const stripSelectedDay = $derived(weekdayIndexFromIso(selectedIso));
	// The start of the week the selected day sits in. Inside the plan it is the
	// plan week's own start; outside the plan it is the Monday of that calendar
	// week, so the strip still shows seven days and a day tap still works.
	const weekStartIso = $derived(
		selWeek?.startDate ?? addDaysIso(selectedIso, -weekdayIndexFromIso(selectedIso)),
	);
	// The weekday of the date actually shown, taken from the date itself, so the
	// label is right even on a day outside the plan's weeks, where there is no
	// session day to read it from.
	const selectedWeekdayName = $derived(DAY_NAMES[weekdayIndexFromIso(selectedIso)]);
	// The strip's slide key: stable while you stay in one week, and a fresh value
	// on every week step, including steps into weeks that are outside the plan.
	const weekKey = $derived(weekStartIso);
	const daySessions = $derived(selWeek ? selWeek.sessions.filter((s) => s.day === selDay) : []);
	// Skipped sessions stay on the card list, marked as skipped.
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	const stalePlan = $derived(
		weeks.length > 0 &&
			weeks.some((w) =>
				w.sessions.some(
					(s) =>
						(s.modality === 'running' || s.modality === 'strength') &&
						!s.prescription?.workout,
				),
			),
	);

	const dateLabel = $derived(
		new Date(`${selectedIso}T00:00:00Z`)
			.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
			.toUpperCase(),
	);

	const weekLogged = $derived(selWeek ? selWeek.sessions.filter((s) => loggedBySession.has(s.id)).length : 0);
	const weekPlanned = $derived(selWeek?.sessions.length ?? 0);
	const weekSkipped = $derived(
		selWeek ? selWeek.sessions.filter((s) => !loggedBySession.has(s.id) && isSkipped(s.id)).length : 0,
	);
	const weekKm = $derived(
		selWeek
			? selWeek.sessions
					.filter((s) => s.modality === 'running')
					.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0)
			: 0,
	);
	const planCap = $derived(selWeek?.targetVolumeKm ?? weekKm);
	const dayMinutes = $derived(daySessions.reduce((m, s) => m + (s.durationMin ?? 0), 0));
	const todayInWeek = $derived(
		!!selWeek?.startDate &&
			!!selWeek?.endDate &&
			todayIso >= selWeek.startDate &&
			todayIso <= selWeek.endDate,
	);
	// The API only accepts days inside the plan, so the add button says why when
	// the selected day is not one of them, instead of failing on tap.
	const planStart = $derived(weeks[0]?.startDate ?? null);
	const planEnd = $derived(weeks.length ? weeks[weeks.length - 1]?.endDate ?? null : null);
	const dayInPlan = $derived(!!selWeek);
	const outsidePlanNote = $derived(
		planStart && planEnd
			? `Your plan runs ${dayLabel(planStart)} to ${dayLabel(planEnd)}. Pick a day inside it to add a workout.`
			: 'Your plan has no days yet. Pick a day inside it to add a workout.',
	);
	// Imported activities show on their own date, each a completed workout. They
	// never stand in for a planned session.
	const dayActivities = $derived(activities.filter((a) => localIso(new Date(a.startedAt)) === selectedIso));
	// The day's scroll holds the planned sessions first, then the imported
	// activities. A session carries only an AM or PM slot, not a clock time, so a
	// true time merge is not possible; the plan leads and the imports follow.
	const dayItems = $derived<DayItem[]>([
		...daySessions.map((s): DayItem => ({ kind: 'session', id: s.id, session: s })),
		...dayActivities.map((a): DayItem => ({ kind: 'activity', id: a.id, activity: a })),
	]);
	// Minutes across both kinds, so the day header counts an imported workout too.
	const dayActivityMinutes = $derived(
		Math.round(dayActivities.reduce((m, a) => m + (a.durationSec ?? 0), 0) / 60),
	);
	const dayTotalMinutes = $derived(dayMinutes + dayActivityMinutes);
	// A day inside the last 30 days can be edited. Older days are read-only
	// history, so the runner can look back without changing the past.
	const editCutoff = addDaysIso(todayIso, -30);
	const editable = $derived(selectedIso >= editCutoff);
	const raceDate = $derived(store.plan?.goal?.targetDate ?? null);
	const isRaceDay = $derived(!!raceDate && raceDate === selectedIso);
	const raceName = $derived(
		(typeof store.plan?.goal?.baseline?.eventName === 'string' &&
			store.plan.goal.baseline.eventName) ||
			prefs.eventName ||
			profileName ||
			'Race day',
	);
	// Where a session view returns to: this day in Today.
	const from = $derived(isToday ? '/today' : `/today?date=${selectedIso}`);

	function dayLabel(iso: string): string {
		return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
		});
	}

	// The first day of the runner's own week: Monday, or Sunday when they set it
	// that way. A week step lands here, so it always lands on a week boundary
	// instead of a week from whatever day happened to be selected.
	function startOfRunnerWeek(iso: string): string {
		const back =
			prefs.weekStart === 1 ? (weekdayIndexFromIso(iso) + 1) % 7 : weekdayIndexFromIso(iso);
		return addDaysIso(iso, -back);
	}

	// A week step moves the whole window onto the first day of the next (or
	// previous) week. Stepping into the week that holds today lands on today
	// itself, so the runner is not sent to a Monday when today is what they want.
	// The week arrows and the strip's swipe and horizontal wheel all land here, so
	// the strip and the day panel slide together. Tapping a day still moves a
	// single day.
	function stepWeek(n: number) {
		changeKind = 'week';
		dayDir = n >= 0 ? 1 : -1;
		const target = addDaysIso(startOfRunnerWeek(selectedIso), n * 7);
		selectedIso = target === startOfRunnerWeek(todayIso) ? todayIso : target;
	}

	function sessionDate(s: ClientSession): string | undefined {
		return selWeek?.startDate ? addDaysIso(selWeek.startDate, s.day) : undefined;
	}
	function confirmIfFuture(s: ClientSession, label: string, action: () => void) {
		const d = sessionDate(s);
		if (d && d > todayIso) {
			confirm = {
				title: `${label} a future workout?`,
				body: `This one is on ${d}. ${label} it anyway?`,
				confirmLabel: `${label} anyway`,
				action,
			};
			return true;
		}
		return false;
	}
	function startSession(s: ClientSession) {
		const href = playHref(s.id, from);
		if (confirmIfFuture(s, 'Start', () => { markStarted(s.id); void goto(href); })) return;
		markStarted(s.id);
		void goto(href);
	}
	function logSession(s: ClientSession) {
		const href = logHref(s.id, from);
		if (confirmIfFuture(s, 'Log', () => void goto(href))) return;
		void goto(href);
	}

	function selectDay(day: number) {
		const iso = addDaysIso(weekStartIso, day);
		changeKind = 'day';
		dayDir = iso >= selectedIso ? 1 : -1;
		selectedIso = iso;
	}
	function goToday() {
		changeKind = 'day';
		dayDir = selectedIso < todayIso ? 1 : -1;
		selectedIso = todayIso;
	}

	onMount(async () => {
		const wanted = page.url.searchParams.get('date');
		if (wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted)) selectedIso = wanted;
		// A Back from a session view: put the day and the card back where they were.
		const saved = readView<{ date: string; card: string | null }>('today');
		if (saved) {
			if (/^\d{4}-\d{2}-\d{2}$/.test(saved.date)) selectedIso = saved.date;
			restoreCardId = saved.card;
		}
		// A session just added from the picker route is revealed in the list.
		const reveal = page.url.searchParams.get('reveal');
		if (reveal) revealId = reveal;
		await ensureAuth();
		if (auth.user) {
			await ensurePlan();
			try {
				const res = await api.activities();
				activities = res.activities;
				// Listing writes a standalone log for each new imported activity.
				// Reload the plan so those logs count in Progress and the streak now.
				if (activities.length && store.plan) void reloadPlan();
			} catch {
				// no imports to show, or the call failed; Today still works
			}
			note = (await api.latestSummary().catch(() => ({ summary: null }))).summary?.body ?? null;
		}
	});

	// Save where the view was left as the runner drills into a session, so the
	// Back can put the day and the card back. A timing independent store, read on
	// mount, so it works even while the day's data is still arriving.
	beforeNavigate(() => {
		saveView('today', {
			date: selectedIso,
			card: activeCardId && dayItems.some((it) => it.id === activeCardId) ? activeCardId : null,
		});
	});
</script>

{#if store.error}
	<p class="mt-6 text-sm text-steel">{store.error}</p>
{:else if !store.loaded && !weeks.length}
	<p class="tabular mt-6 text-sm text-steel">Loading…</p>
{:else if !weeks.length}
	<EmptyState
		eyebrow="No plan yet"
		title="Build your plan."
		body="Pick a goal and a race date. We write the sessions and explain each one."
		primaryLabel="Build my plan"
		primaryHref="/onboarding"
	>
		{#snippet icon()}<SessionIcon type="easy" size="h-5 w-5" />{/snippet}
	</EmptyState>
{:else}
	{#if stalePlan}
		<div class="mb-6 rounded-xl border border-signal bg-signal-wash p-4 text-sm">
			This plan was built before guided workouts. Rebuild it to get step-by-step sessions and drills.
			<a href="/onboarding" class="ml-1 font-medium text-signal-ink hover:underline">Rebuild plan →</a>
		</div>
	{/if}

	<ConnectNudge />

	<header class="mb-2">
		<div class="flex items-baseline justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">{isToday ? 'Today' : selectedWeekdayName}</p>
			<p class="tabular text-xs text-steel">{dateLabel}{#if selWeek} · Week {selWeek.weekNumber}{/if}</p>
		</div>
		<h1 class="font-display mt-1 text-2xl font-bold">
			{#if isRaceDay}
				{raceName}
			{:else if daySessions.length}
				{daySessions.length > 1 ? `${daySessions.length} sessions` : sessionLabel(daySessions[0])}
			{:else if dayActivities.length}
				{dayActivities.length > 1 ? `${dayActivities.length} imported workouts` : 'Imported workout'}
			{:else}
				Rest day
			{/if}
		</h1>
		<!-- Space is always reserved, so the button appearing never shifts the page. -->
		<div class="mt-2 flex h-8 items-center">
			<button
				type="button"
				onclick={goToday}
				class="rounded-md border border-hairline px-2.5 py-1 text-xs text-signal-ink hover:border-signal {isToday
					? 'invisible'
					: ''}"
			>
				Back to today
			</button>
		</div>
	</header>

	<!-- Sticky week control: the week arrows and the day tabs both stay put. -->
	<div class="sticky top-16 z-20 -mx-4 mb-2 border-b border-hairline bg-paper px-4 pt-1 pb-2">
		<WeekStrip
			week={selWeek}
			{weekKey}
			selectedDay={stripSelectedDay}
			{todayIndex}
			{todayInWeek}
			{loggedBySession}
			onSelect={selectDay}
			onWeekStep={stepWeek}
			weekDir={dayDir}
		/>
	</div>

	<!-- Day panel: the week listing above steps the week by swipe or wheel, and
	     the week arrows do the same on a laptop. Tapping a day steps the day. -->
	<div
		class="scroll-modern overflow-x-hidden rounded-xl border border-hairline bg-paper p-4 sm:h-[var(--panel-h)] sm:overflow-y-auto"
		role="group"
		aria-label="Day panel"
	>
		{#key selectedIso}
			<div
				class={changeKind === 'week'
					? dayDir === 1
						? 'sg-enter-week-right'
						: 'sg-enter-week-left'
					: dayDir === 1
						? 'sg-enter-right'
						: 'sg-enter-left'}
			>
				<SectionHeader
					id="day-sessions"
					eyebrow={selWeek ? `Week ${selWeek.weekNumber} · ${selectedWeekdayName}` : 'Day'}
					meta={isRaceDay
						? 'Race day'
						: dayItems.length
							? dayTotalMinutes
								? `${dayItems.length} · ${dayTotalMinutes} min`
								: `${dayItems.length}`
							: 'Rest'}
				/>
				{#if isRaceDay}
					<RaceCard name={raceName} dateLabel={dateLabel} />
				{:else if dayItems.length}
					<SessionCarousel items={dayItems} card={dayCard} bind:revealId bind:activeId={activeCardId} initialId={restoreCardId} label="workouts" />
				{:else if selWeek}
					<Card tone="sunken" frame>
						<p class="text-sm text-steel">
							Rest day, {dateLabel} (week {selWeek.weekNumber}). Nothing scheduled here, and that is part
							of the plan.
						</p>
					</Card>
				{:else}
					<Card tone="sunken" frame>
						<p class="text-sm text-steel">
							{editable ? 'This day is outside your plan.' : 'Nothing from the plan on this day.'}
						</p>
					</Card>
				{/if}
			</div>
		{/key}

		<button
			type="button"
			disabled={!dayInPlan || !editable}
			onclick={() => {
				if (!dayInPlan || !editable) return;
				void goto(`/today/add/${selectedIso}`);
			}}
			class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm {dayInPlan && editable
				? 'border-hairline-strong text-signal-ink hover:border-signal'
				: 'border-hairline text-steel'}"
		>
			＋ Add a workout
		</button>
		{#if !editable}
			<p class="mt-2 text-xs text-steel">
				This day is more than 30 days old, so it is read-only history. You can look back, but not change it.
			</p>
		{:else if !dayInPlan}
			<p class="mt-2 text-xs text-steel">{outsidePlanNote}</p>
		{/if}

		<AdjustmentsCard />

		{#if note}<p class="mt-5 rounded-lg bg-sunken p-3 text-sm">{note}</p>{/if}

		{#if selWeek}
			<hr class="my-6 border-hairline" />
			<SectionHeader id="week-so-far" eyebrow="Week so far" />
			<div class="flex flex-wrap gap-1" role="img" aria-label="{weekLogged} of {weekPlanned} sessions done this week{weekSkipped ? `, ${weekSkipped} skipped` : ''}">
				{#each selWeek.sessions as s (s.id)}
					{@const done = loggedBySession.has(s.id)}
					{@const sk = !done && isSkipped(s.id)}
					<span class="h-4 w-2 rounded-[1px]" style="background: {done ? TRAINING_PROGRESS : sk ? CHART_MUTED : CHART_EMPTY}"></span>
				{/each}
			</div>
			<p class="tabular mt-2 text-sm">
				{weekLogged} of {weekPlanned} done{#if weekSkipped}<span class="text-steel"> · {weekSkipped} skipped</span>{/if}
				<span class="text-steel"> · {fmtDistance(weekKm)} of {fmtDistance(planCap)}</span>
			</p>

			{#if daySessions[0]}
				<hr class="my-6 border-hairline" />
				<SectionHeader id="why" eyebrow="Why this workout" />
				<p class="text-sm text-steel">{daySessions[0].purpose ?? 'The reasoning behind this session.'}</p>
				<button type="button" onclick={() => goto(sessionHref(daySessions[0]!.id, from))} class="mt-2 text-sm text-signal-ink hover:underline">
					Why this workout, and what's to come →
				</button>
			{/if}
		{/if}
	</div>
{/if}

{#snippet dayCard(item: DayItem)}
	{#if item.kind === 'session'}
		<SessionCard
			session={item.session}
			eyebrow={`${profileName} · Week ${selWeek?.weekNumber ?? ''}`}
			active={isToday}
			editable={editable}
			logged={loggedBySession.get(item.session.id) ?? null}
			onLog={() => logSession(item.session)}
			onStart={() => startSession(item.session)}
			onOpen={() => goto(sessionHref(item.session.id, from))}
			onUnskip={() =>
				(confirm = {
					title: 'Un-skip this workout?',
					body: 'It goes back to your normal plan for the day.',
					confirmLabel: 'Un-skip',
					action: () => unskipSession(item.session.id),
				})}
			onCancelProgress={() => {
				clearStarted(item.session.id);
				clearProgress(item.session.id);
			}}
		/>
	{:else}
		<ActivityCard
			activity={item.activity}
			eyebrow={selectedWeekdayName}
			onOpen={() => goto(activityHref(item.activity.id, from))}
		/>
	{/if}
{/snippet}

<ConfirmSheet
	open={confirm !== null}
	title={confirm?.title ?? ''}
	body={confirm?.body ?? ''}
	confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
	tone={confirm?.tone ?? 'default'}
	onConfirm={() => confirm?.action()}
	onClose={() => (confirm = null)}
/>

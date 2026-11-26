<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, beforeNavigate } from '$app/navigation';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api } from '$lib/api';
	import { fmtDistance, prefs, sessionLabel } from '$lib/prefs.svelte';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { summary, ensureSummary } from '$lib/summaryStore.svelte';
	import { store, ensurePlan, mergeLogs, upsertLog } from '$lib/planStore.svelte';
	import { readView, saveView } from '$lib/viewState';
	import { type ClientActivity, type ClientLog, type ClientSession, DAY_NAMES, addDaysIso, dayIndexInWeek, formatIsoDay, localIso, startOfWeekIso, weekColumn, weekdayIndexFromIso } from '$lib/plan';
	import { today } from '$lib/today.svelte';
	import { isSkipped, unskipSession } from '$lib/skipped.svelte';
	import { clearStarted, markStarted } from '$lib/started.svelte';
	import { clearProgress } from '$lib/sessionProgress.svelte';
	import { logHref, playHref, sessionHref, activityHref } from '$lib/sessionNav';
	import { TRAINING_PROGRESS, CHART_MUTED, CHART_EMPTY } from '$lib/chartPalette';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import InsightsCard from '$lib/components/InsightsCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import WeekStrip from '$lib/components/WeekStrip.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import PlanError from '$lib/components/PlanError.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import RaceCard from '$lib/components/RaceCard.svelte';
	import PlanCompleteCard from '$lib/components/PlanCompleteCard.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';
	import ConnectNudge from '$lib/components/ConnectNudge.svelte';
	import { sessionWhyLine } from '$lib/sessionWhy';

	/**
	 * One card in the day's scroll. Planned sessions and imported activities sit
	 * in the same carousel, so the day reads as one list of workouts; the kind
	 * says which card to draw. A goal day adds a milestone card, always last, so
	 * the finish line follows whatever else is on the day.
	 */
	type DayItem =
		| { kind: 'session'; id: string; session: ClientSession }
		| { kind: 'activity'; id: string; activity: ClientActivity }
		| { kind: 'milestone'; id: string; milestone: 'complete' };

	let revealId = $state<string | null>(null);
	// The card at the scroll center of the day's carousel, so a session view can
	// return the runner to the same card they left.
	let activeCardId = $state<string | null>(null);
	// The card to scroll back to on mount, from a saved view state (a Back).
	let restoreCardId = $state<string | null>(null);
	let activities = $state<ClientActivity[]>([]);
	// The goal day's log sheet, when the runner opens it from the milestone card.
	let milestoneSheet = $state<{
		session: ClientSession;
		variant: 'session' | 'reflection';
	} | null>(null);
	let confirm = $state<{
		title: string;
		body: string;
		confirmLabel: string;
		tone?: 'default' | 'danger';
		action: () => void;
	} | null>(null);

	const todayIso = $derived(today.iso);
	// The day the panel opens on, captured once: a later midnight rollover moves
	// "today" but leaves the runner on the day they were looking at.
	const initialIso = today.iso;
	let selectedIso = $state(initialIso);
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
	// The plan's total planned distance, for the plan-complete card's totals.
	const planKm = $derived(weeks.reduce((sum, w) => sum + (w.targetVolumeKm ?? 0), 0));
	const sel = $derived.by(() => {
		for (const w of weeks) {
			if (w.startDate && w.endDate && selectedIso >= w.startDate && selectedIso <= w.endDate) {
				return { week: w, day: dayIndexInWeek(w.startDate, selectedIso) };
			}
		}
		return undefined;
	});
	const selWeek = $derived(sel?.week);
	// The strip shows the calendar week the selected day sits in, grouped by the
	// runner's own week start (Monday by default, Sunday when they set that), so
	// it reads as the week they are living in. A calendar week can span two plan
	// weeks; the sessions on each column are gathered by date below.
	const weekStartIso = $derived(startOfWeekIso(selectedIso, prefs.weekStart));
	const todayWeekStartIso = $derived(startOfWeekIso(todayIso, prefs.weekStart));
	// The plan-week day offset of the selected day, for the day panel. The plan
	// week is untouched: a session's day is still its offset from the plan week's
	// own start.
	const selDay = $derived(sel?.day ?? 0);
	// Today's column in the runner's week order, so the ring lands on today when
	// it is in the week on screen (guarded by todayInWeek below).
	const todayOffset = $derived(weekColumn(todayIso, prefs.weekStart));
	// The strip's highlighted column is where the shown date sits in the week on
	// screen, read from the date itself. That way a swipe or a tap to a day
	// outside the plan still moves the indicator to the day actually selected.
	const stripSelectedDay = $derived(weekColumn(selectedIso, prefs.weekStart));
	// The weekday of the date actually shown, taken from the date itself, so the
	// label is right even on a day outside the plan's weeks, where there is no
	// session day to read it from.
	const selectedWeekdayName = $derived(DAY_NAMES[weekdayIndexFromIso(selectedIso)]);
	// The strip's slide key: stable while you stay in one week, and a fresh value
	// on every week step, including steps into weeks that are outside the plan.
	const weekKey = $derived(weekStartIso);
	// Every session keyed by the date it falls on, so a calendar week that spans
	// two plan weeks still finds each session on its real day. A session's date
	// is its plan week's start plus its day offset, exactly as the calendar
	// builds it.
	const sessionsByDate = $derived.by(() => {
		const map = new Map<string, ClientSession[]>();
		for (const w of weeks) {
			if (!w.startDate) continue;
			for (const s of w.sessions) {
				const key = addDaysIso(w.startDate, s.day);
				const list = map.get(key);
				if (list) list.push(s);
				else map.set(key, [s]);
			}
		}
		return map;
	});
	// The seven columns of the week on screen, first day first in the runner's
	// order, each with its date and the sessions on that date.
	const stripDays = $derived(
		[0, 1, 2, 3, 4, 5, 6].map((i) => {
			const iso = addDaysIso(weekStartIso, i);
			return { iso, sessions: sessionsByDate.get(iso) ?? [] };
		}),
	);
	const daySessions = $derived(selWeek ? selWeek.sessions.filter((s) => s.day === selDay) : []);
	// Skipped sessions stay on the card list, marked as skipped.
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);
	// The Insights card reads the day's planned sessions: ready once every one is
	// logged or skipped, with the count still open shown while it is not.
	const insightReady = $derived(
		daySessions.length > 0 && daySessions.every((s) => loggedBySession.has(s.id) || isSkipped(s.id)),
	);
	const insightPending = $derived(
		daySessions.filter((s) => !loggedBySession.has(s.id) && !isSkipped(s.id)).length,
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
		formatIsoDay(selectedIso, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase(),
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
	// Today is in the week on screen when it shares the selected day's calendar
	// week, whatever the plan week does.
	const todayInWeek = $derived(weekStartIso === todayWeekStartIso);
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
	const raceDate = $derived(store.plan?.goal?.targetDate ?? null);
	const isRaceDay = $derived(!!raceDate && raceDate === selectedIso);
	const raceName = $derived(
		(typeof store.plan?.goal?.baseline?.eventName === 'string' &&
			store.plan.goal.baseline.eventName) ||
			prefs.eventName ||
			profileName ||
			'Race day',
	);
	// The finish line the day belongs to: the race day for a race goal, else the
	// last day of the plan. Only one of the two ever applies.
	const milestoneKind = $derived<'race' | 'complete' | null>(
		isRaceDay ? 'race' : !raceDate && !!planEnd && selectedIso === planEnd ? 'complete' : null,
	);
	const milestoneDate = $derived(
		milestoneKind === 'race' ? raceDate : milestoneKind === 'complete' ? planEnd : null,
	);
	// The goal day's own result, a standalone log dated to the day. Imported
	// activities share the null session but are never the goal's result.
	const milestoneLog = $derived.by<ClientLog | null>(() => {
		if (!milestoneDate) return null;
		return (
			store.logs.find(
				(l) =>
					!l.sessionId &&
					l.source !== 'import' &&
					!!l.startedAt &&
					localIso(new Date(l.startedAt)) === milestoneDate,
			) ?? null
		);
	});
	// The day's scroll holds the planned sessions first, then the imported
	// activities, then the finish-line card, so the goal day always reads last.
	// A session carries only an AM or PM slot, not a clock time, so a true time
	// merge is not possible; the plan leads and the imports follow.
	const dayItems = $derived<DayItem[]>([
		...daySessions.map((s): DayItem => ({ kind: 'session', id: s.id, session: s })),
		...dayActivities.map((a): DayItem => ({ kind: 'activity', id: a.id, activity: a })),
		...(milestoneKind === 'complete'
			? [{ kind: 'milestone', id: 'milestone-complete', milestone: 'complete' } as DayItem]
			: []),
	]);
	// Minutes across both kinds, so the day header counts an imported workout too.
	const dayActivityMinutes = $derived(
		Math.round(dayActivities.reduce((m, a) => m + (a.durationSec ?? 0), 0) / 60),
	);
	const dayTotalMinutes = $derived(dayMinutes + dayActivityMinutes);
	// The day's actual workouts, without the milestone card, for the header count.
	const workoutItems = $derived(dayItems.filter((it) => it.kind !== 'milestone'));
	// A day inside the last 30 days can be edited. Older days are read-only
	// history, so the runner can look back without changing the past.
	const editCutoff = $derived(addDaysIso(todayIso, -30));
	const editable = $derived(selectedIso >= editCutoff);
	// Where a session view returns to: this day in Today.
	const from = $derived(isToday ? '/today' : `/today?date=${selectedIso}`);

	function dayLabel(iso: string): string {
		return formatIsoDay(iso, { weekday: 'short', day: 'numeric', month: 'short' });
	}

	// A week step moves the whole window onto the first day of the next (or
	// previous) week, land on the runner's own week boundary either way. Stepping
	// into the week that holds today lands on today itself, so the runner is not
	// sent to the week's first day when today is what they want. The week arrows
	// and the strip's swipe and horizontal wheel all land here, so the strip and
	// the day panel slide together. Tapping a day still moves a single day.
	function stepWeek(n: number) {
		changeKind = 'week';
		dayDir = n >= 0 ? 1 : -1;
		const target = addDaysIso(startOfWeekIso(selectedIso, prefs.weekStart), n * 7);
		selectedIso = target === startOfWeekIso(todayIso, prefs.weekStart) ? todayIso : target;
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

	// The named distance for a race goal, so its log opens with the distance set.
	function raceDistanceKm(slug: string | undefined): number | undefined {
		switch (slug) {
			case '5k':
				return 5;
			case '10k':
				return 10;
			case 'half-marathon':
				return 21.1;
			case 'marathon':
				return 42.2;
			default:
				return undefined;
		}
	}
	// A goal day has no session, so its result is a standalone log opened in the
	// same sheet a session uses. The date carries the standalone log's day.
	function openMilestoneLog(kind: 'race' | 'complete') {
		if (kind === 'race') {
			const km = raceDistanceKm(store.plan?.goal?.goalProfileSlug);
			milestoneSheet = {
				variant: 'session',
				session: {
					id: 'milestone-race',
					day: 0,
					slot: null,
					modality: 'running',
					type: 'race',
					title: raceName,
					purpose: null,
					prescription: km ? { targetDistanceKm: km } : null,
					durationMin: null,
				},
			};
		} else {
			milestoneSheet = {
				variant: 'reflection',
				session: {
					id: 'milestone-complete',
					day: 0,
					slot: null,
					modality: 'recovery',
					type: 'milestone',
					title: 'Plan complete',
					purpose: null,
					prescription: null,
					durationMin: null,
				},
			};
		}
	}
	function saveMilestoneLog(log: ClientLog) {
		// The card reads from the store, so it flips to logged without a refetch.
		upsertLog(log);
		milestoneSheet = null;
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
				// Listing writes a standalone log for each new imported activity and
				// returns it, so merge those in rather than refetching the whole plan.
				mergeLogs(res.logs ?? []);
			} catch {
				// no imports to show, or the call failed; Today still works
			}
			await ensureSummary();
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
	<PlanError message={store.error} />
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
			{:else if milestoneKind === 'complete'}
				Plan complete
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
			days={stripDays}
			selectedDay={stripSelectedDay}
			todayIndex={todayOffset}
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
						: workoutItems.length
							? dayTotalMinutes
								? `${workoutItems.length} · ${dayTotalMinutes} min`
								: `${workoutItems.length}`
							: milestoneKind === 'complete'
								? 'Plan complete'
								: 'Rest'}
					topGap={false}
				/>
				{#if isRaceDay}
					<RaceCard
						name={raceName}
						dateLabel={dateLabel}
						logged={!!milestoneLog}
						onLog={() => openMilestoneLog('race')}
					/>
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

		{#if daySessions.length}
			<InsightsCard date={selectedIso} ready={insightReady} pending={insightPending} />
		{/if}

		{#if summary.body}<p class="mt-5 rounded-lg bg-sunken p-3 text-sm">{summary.body}</p>{/if}

		{#if selWeek}
			<hr class="my-6 border-hairline" />
			<SectionHeader id="week-so-far" eyebrow="Week so far" topGap={false} />
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
				<SectionHeader id="why" eyebrow="Why this workout" topGap={false} />
				<p class="text-sm text-steel">{sessionWhyLine(daySessions[0].prescription) || daySessions[0].purpose || 'What this session trains, and why.'}</p>
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
	{:else if item.kind === 'activity'}
		<ActivityCard
			activity={item.activity}
			eyebrow={selectedWeekdayName}
			onOpen={() => goto(activityHref(item.activity.id, from))}
		/>
	{:else}
		<PlanCompleteCard
			name={profileName}
			dateLabel={dateLabel}
			weeks={weeks.length}
			distanceLabel={planKm > 0 ? fmtDistance(planKm) : undefined}
			logged={!!milestoneLog}
			onLog={() => openMilestoneLog('complete')}
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

{#if milestoneSheet}
	<LogSheet
		session={milestoneSheet.session}
		eyebrow={milestoneSheet.variant === 'reflection' ? 'Plan complete' : 'Race day'}
		variant={milestoneSheet.variant}
		standalone
		startedAtDate={milestoneDate ?? undefined}
		onClose={() => (milestoneSheet = null)}
		onSaved={saveMilestoneLog}
	/>
{/if}

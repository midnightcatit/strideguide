<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { api } from '$lib/api';
	import { fmtDistance, sessionLabel } from '$lib/prefs.svelte';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import { store, ensurePlan, reloadPlan, upsertLog } from '$lib/planStore.svelte';
	import { type ClientActivity, type ClientSession, DAY_NAMES, addDaysIso, dayIndexInWeek, localIso, mondayIndex, sessionTypeLabel } from '$lib/plan';
	import { overlayHistory } from '$lib/overlayHistory.svelte';
	import { isSkipped, skipSession, unskipSession } from '$lib/skipped.svelte';
	import { clearStarted, markStarted } from '$lib/started.svelte';
	import { clearProgress } from '$lib/sessionProgress.svelte';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';
	import SessionDetail from '$lib/components/SessionDetail.svelte';
	import AdjustmentsCard from '$lib/components/AdjustmentsCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import WeekStrip from '$lib/components/WeekStrip.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import WorkoutPicker from '$lib/components/WorkoutPicker.svelte';
	import type { LibraryWorkout } from '@strideguide/shared/plan';
	import type { CustomWorkoutInput } from '$lib/api';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import ActivityMatchSheet from '$lib/components/ActivityMatchSheet.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';
	import ConnectNudge from '$lib/components/ConnectNudge.svelte';

	let logTarget = $state<ClientSession | null>(null);
	let playTarget = $state<ClientSession | null>(null);
	let detailTarget = $state<ClientSession | null>(null);
	let note = $state<string | null>(null);
	let pickerDate = $state<string | null>(null);
	let addError = $state<string | null>(null);
	let revealId = $state<string | null>(null);
	let activities = $state<ClientActivity[]>([]);
	let reviewing = $state<ClientActivity | null>(null);
	let matchBusy = $state(false);
	let confirm = $state<{
		title: string;
		body: string;
		confirmLabel: string;
		tone?: 'default' | 'danger';
		action: () => void;
	} | null>(null);

	// The match sheet stays mounted so it can animate out; its copy is derived so
	// it is empty, not a crash, while the sheet is closed.
	const reviewTitle = $derived.by(() => {
		if (!reviewing) return '';
		const ref = reviewing.proposal?.session ?? null;
		return `Did this match your ${ref ? proposedLabel(reviewing) : 'session'}?`;
	});
	const reviewBody = $derived.by(() => {
		if (!reviewing) return '';
		const ref = reviewing.proposal?.session ?? null;
		const day = dayLabel(new Date(reviewing.startedAt).toISOString().slice(0, 10));
		const what = ref ? proposedLabel(reviewing) : 'session';
		const where = ref ? ` on ${dayLabel(ref.date)}` : '';
		return `${activitySummary(reviewing)} on ${day} looks like your ${what}${where}. If it was, we count it as done.`;
	});

	// Back (browser or hardware) closes an open overlay instead of leaving the page.
	overlayHistory(
		() => !!(detailTarget || playTarget || logTarget || reviewing),
		() => {
			if (reviewing) reviewing = null;
			else if (logTarget) logTarget = null;
			else if (playTarget) playTarget = null;
			else detailTarget = null;
		},
	);

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
	// The strip's slide key: stable while you stay in one week, and a fresh value
	// on every week step, including steps into weeks that are outside the plan.
	const weekKey = $derived(selWeek?.startDate ?? selectedIso);
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
	// Imported activities the matcher could not resolve on its own, waiting on a yes or no.
	const pendingMatches = $derived(
		activities.filter((a) => a.matchState === 'proposed' && a.proposal?.session),
	);

	function dayLabel(iso: string): string {
		return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
		});
	}
	function activitySummary(a: ClientActivity): string {
		const bits: string[] = [];
		if (a.distanceM) bits.push(fmtDistance(a.distanceM / 1000));
		if (a.durationSec) bits.push(`${Math.round(a.durationSec / 60)} min`);
		bits.push(a.modality);
		return bits.join(' · ');
	}
	function proposedLabel(a: ClientActivity): string {
		const ref = a.proposal?.session;
		if (!ref) return 'session';
		return ref.title ?? sessionTypeLabel(ref.type ?? '');
	}
	async function confirmMatch(a: ClientActivity) {
		matchBusy = true;
		try {
			const res = await api.confirmActivity(a.id, a.proposal?.sessionId);
			activities = activities.map((x) =>
				x.id === a.id ? { ...x, matchState: 'confirmed', sessionId: res.sessionId } : x,
			);
			reloadPlan();
		} catch {
			// the next list will show the truth
		} finally {
			matchBusy = false;
			reviewing = null;
		}
	}
	async function rejectMatch(a: ClientActivity) {
		matchBusy = true;
		try {
			await api.rejectActivity(a.id);
			activities = activities.map((x) =>
				x.id === a.id ? { ...x, matchState: 'rejected', proposal: null } : x,
			);
		} catch {
			// ignore
		} finally {
			matchBusy = false;
			reviewing = null;
		}
	}

	// A week step moves the whole window. The week arrows and the strip's swipe
	// and horizontal wheel all land here, so the strip and the day panel slide
	// together. Tapping a day still moves a single day.
	function stepWeek(n: number) {
		changeKind = 'week';
		dayDir = n >= 0 ? 1 : -1;
		selectedIso = addDaysIso(selectedIso, n * 7);
	}
	async function addFromLibrary(w: LibraryWorkout) {
		const date = pickerDate;
		pickerDate = null;
		if (!date) return;
		try {
			const { session } = await api.addWorkout(date, w.id);
			addError = null;
			revealId = session.id;
			reloadPlan();
		} catch (e) {
			addError = e instanceof Error ? e.message : 'Could not add that workout.';
		}
	}
	async function addCustom(c: CustomWorkoutInput) {
		const date = pickerDate;
		pickerDate = null;
		if (!date) return;
		try {
			const { session } = await api.addCustomWorkout(date, c);
			addError = null;
			revealId = session.id;
			reloadPlan();
		} catch (e) {
			addError = e instanceof Error ? e.message : 'Could not add that workout.';
		}
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
		if (confirmIfFuture(s, 'Start', () => { markStarted(s.id); playTarget = s; })) return;
		markStarted(s.id);
		playTarget = s;
	}
	function logSession(s: ClientSession) {
		if (confirmIfFuture(s, 'Log', () => (logTarget = s))) return;
		logTarget = s;
	}

	function selectDay(day: number) {
		if (!selWeek?.startDate) return;
		const iso = addDaysIso(selWeek.startDate, day);
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
		await ensureAuth();
		if (auth.user) {
			await ensurePlan();
			try {
				const res = await api.activities();
				activities = res.activities;
				// A strong match is applied server side. If it created a completion
				// we have not loaded yet, refresh the plan so the card shows it.
				const loggedIds = new Set(store.logs.map((l) => l.sessionId).filter(Boolean));
				if (
					activities.some(
						(a) => a.matchState === 'confirmed' && a.sessionId && !loggedIds.has(a.sessionId),
					)
				) {
					reloadPlan();
				}
			} catch {
				// no imports to show, or the call failed; Today still works
			}
			note = (await api.latestSummary().catch(() => ({ summary: null }))).summary?.body ?? null;
		}
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
			This plan predates guided workouts. Rebuild it to get step-by-step sessions and drills.
			<a href="/onboarding" class="ml-1 font-medium text-signal-ink hover:underline">Rebuild plan →</a>
		</div>
	{/if}

	{#if pendingMatches.length}
		<div class="mb-6 rounded-xl border border-signal bg-signal-wash p-4 text-sm">
			<p class="font-medium">
				{pendingMatches.length === 1
					? 'An imported workout might be one of your sessions.'
					: `${pendingMatches.length} imported workouts might be plan sessions.`}
			</p>
			<p class="mt-1 text-steel">Confirm each one so it counts, or set it aside.</p>
			<button
				type="button"
				onclick={() => (reviewing = pendingMatches[0] ?? null)}
				class="mt-3 rounded-md border border-signal-ink px-4 py-2.5 text-sm font-medium text-signal-ink hover:border-signal"
			>
				Review the match
			</button>
		</div>
	{/if}

	<ConnectNudge />

	<header class="mb-2">
		<div class="flex items-baseline justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">{isToday ? 'Today' : DAY_NAMES[selDay]}</p>
			<p class="tabular text-xs text-steel">{dateLabel}{#if selWeek} · Week {selWeek.weekNumber}{/if}</p>
		</div>
		<h1 class="font-display mt-1 text-2xl font-bold">
			{daySessions.length
				? daySessions.length > 1
					? `${daySessions.length} sessions`
					: sessionLabel(daySessions[0])
				: 'Rest day'}
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
			selectedDay={selDay}
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
					eyebrow={selWeek ? `Week ${selWeek.weekNumber} · ${DAY_NAMES[selDay]}` : 'Day'}
					meta={daySessions.length ? `${daySessions.length} · ${dayMinutes} min` : 'Rest'}
				/>
				{#if daySessions.length}
					<SessionCarousel sessions={daySessions} {card} bind:revealId />
				{:else if selWeek}
					<Card tone="sunken" frame>
						<p class="text-sm text-steel">
							Rest day, {dateLabel} (week {selWeek.weekNumber}). Nothing scheduled here, and that is part
							of the plan.
						</p>
					</Card>
				{:else}
					<Card tone="sunken" frame>
						<p class="text-sm text-steel">This day is outside your plan.</p>
					</Card>
				{/if}
			</div>
		{/key}

		<button
			type="button"
			disabled={!dayInPlan}
			onclick={() => {
				if (!dayInPlan) return;
				addError = null;
				pickerDate = selectedIso;
			}}
			class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm {dayInPlan
				? 'border-hairline-strong text-signal-ink hover:border-signal'
				: 'border-hairline text-steel'}"
		>
			＋ Add a workout
		</button>
		{#if !dayInPlan}
			<p class="mt-2 text-xs text-steel">{outsidePlanNote}</p>
		{:else if addError}
			<p class="mt-2 text-sm text-signal-ink">{addError}</p>
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
					<span class="h-4 w-2 rounded-[1px] {done ? 'bg-ok' : sk ? 'bg-steel' : 'bg-ink/40'}"></span>
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
				<button type="button" onclick={() => (detailTarget = daySessions[0] ?? null)} class="mt-2 text-sm text-signal-ink hover:underline">
					Why this workout, and what's to come →
				</button>
			{/if}
		{/if}
	</div>
{/if}

{#if playTarget}
	<SessionPlayer session={playTarget} eyebrow={`${profileName} · Week ${selWeek?.weekNumber ?? ''}`} onClose={() => (playTarget = null)} onFinish={() => { logTarget = playTarget; playTarget = null; }} />
{/if}

{#if logTarget}
	<LogSheet session={logTarget} eyebrow={`${profileName} · Week ${selWeek?.weekNumber ?? ''}`} onClose={() => (logTarget = null)} onSaved={(log) => { upsertLog(log); logTarget = null; }} />
{/if}

{#if detailTarget}
	<SessionDetail
		session={detailTarget}
		eyebrow={`${profileName} · Week ${selWeek?.weekNumber ?? ''}`}
		logged={loggedBySession.get(detailTarget.id) ?? null}
		skipped={isSkipped(detailTarget.id)}
		onClose={() => (detailTarget = null)}
		onLog={() => { logTarget = detailTarget; detailTarget = null; }}
		onStart={() => { playTarget = detailTarget; detailTarget = null; }}
		onSkip={() =>
			(confirm = {
				title: 'Skip this workout?',
				body: 'It stays on your calendar, marked as skipped. You can un-skip it any time.',
				confirmLabel: 'Skip it',
				action: () => {
					skipSession(detailTarget!.id);
					detailTarget = null;
				},
			})}
		onUnskip={() =>
			(confirm = {
				title: 'Un-skip this workout?',
				body: 'It goes back to your normal plan for the day.',
				confirmLabel: 'Un-skip',
				action: () => unskipSession(detailTarget!.id),
			})}
	/>
{/if}

{#snippet card(s: ClientSession)}
	<SessionCard
		session={s}
		eyebrow={`${profileName} · Week ${selWeek?.weekNumber ?? ''}`}
		active={isToday}
		logged={loggedBySession.get(s.id) ?? null}
		onLog={() => logSession(s)}
		onStart={() => startSession(s)}
		onOpen={() => (detailTarget = s)}
		onUnskip={() =>
			(confirm = {
				title: 'Un-skip this workout?',
				body: 'It goes back to your normal plan for the day.',
				confirmLabel: 'Un-skip',
				action: () => unskipSession(s.id),
			})}
		onCancelProgress={() => {
			clearStarted(s.id);
			clearProgress(s.id);
		}}
	/>
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

<ActivityMatchSheet
	open={reviewing !== null}
	title={reviewTitle}
	body={reviewBody}
	busy={matchBusy}
	onConfirm={() => {
		if (reviewing) confirmMatch(reviewing);
	}}
	onReject={() => {
		if (reviewing) rejectMatch(reviewing);
	}}
	onClose={() => (reviewing = null)}
/>

{#if pickerDate}
	<WorkoutPicker date={pickerDate} onPick={addFromLibrary} onCustom={addCustom} onClose={() => (pickerDate = null)} />
{/if}

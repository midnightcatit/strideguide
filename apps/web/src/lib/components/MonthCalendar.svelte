<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { store, ensurePlan, reloadPlan, upsertLog } from '$lib/planStore.svelte';
	import { api, type CustomWorkoutInput } from '$lib/api';
	import type { LibraryWorkout } from '@strideguide/shared/plan';
	import { type ClientSession, DAY_INITIALS, addDaysIso, localIso } from '$lib/plan';
	import { overlayHistory } from '$lib/overlayHistory.svelte';
	import { isSkipped, skipSession, unskipSession } from '$lib/skipped.svelte';
	import { clearStarted, markStarted } from '$lib/started.svelte';
	import { clearProgress } from '$lib/sessionProgress.svelte';
	import { modal } from '$lib/actions';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';
	import SessionDetail from '$lib/components/SessionDetail.svelte';
	import Card from '$lib/components/Card.svelte';
	import WorkoutPicker from '$lib/components/WorkoutPicker.svelte';
	import MiniSessionCard from '$lib/components/MiniSessionCard.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import InfoButton from '$lib/components/InfoButton.svelte';

	const todayIso = localIso();

	let monthOffset = $state(0);
	const MODE_KEY = 'sg:calendarMode';
	// The month or list choice is remembered with the other sg: prefs, so a
	// runner who left on list opens on list next time.
	function readMode(): 'month' | 'list' {
		if (typeof localStorage === 'undefined') return 'month';
		try {
			return localStorage.getItem(MODE_KEY) === 'list' ? 'list' : 'month';
		} catch {
			return 'month';
		}
	}
	let mode = $state<'month' | 'list'>(readMode());
	function setMode(next: 'month' | 'list') {
		mode = next;
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(MODE_KEY, next);
		} catch {
			// A private window can block storage; the choice still holds this visit.
		}
	}
	let sheetIso = $state<string | null>(null);
	let detailTarget = $state<ClientSession | null>(null);
	let playTarget = $state<ClientSession | null>(null);
	let logTarget = $state<ClientSession | null>(null);
	let pickerDate = $state<string | null>(null);
	let addError = $state<string | null>(null);
	let revealId = $state<string | null>(null);
	let listEl = $state<HTMLDivElement | undefined>(undefined);
	let confirm = $state<{
		title: string;
		body: string;
		confirmLabel: string;
		tone?: 'default' | 'danger';
		action: () => void;
	} | null>(null);

	// Back (browser or hardware) closes the topmost overlay: a session, then the day sheet.
	overlayHistory(
		() => !!(sheetIso || pickerDate || detailTarget || playTarget || logTarget),
		() => {
			if (logTarget) logTarget = null;
			else if (playTarget) playTarget = null;
			else if (detailTarget) detailTarget = null;
			else if (pickerDate) pickerDate = null;
			else sheetIso = null;
		},
	);

	const weeks = $derived(store.plan?.weeks ?? []);
	const profileName = $derived(
		store.plan?.goal
			? (getGoalProfile(store.plan.goal.goalProfileSlug)?.name ?? store.plan.goal.goalProfileSlug)
			: '',
	);
	const loggedBySession = $derived(
		new Map(store.logs.filter((l) => l.sessionId).map((l) => [l.sessionId as string, l])),
	);

	/** All sessions keyed by ISO date. */
	const byDate = $derived.by(() => {
		const map = new Map<string, ClientSession[]>();
		for (const w of weeks) {
			if (!w.startDate) continue;
			for (const s of w.sessions) {
				const key = addDaysIso(w.startDate, s.day);
				const list = map.get(key) ?? [];
				list.push(s);
				map.set(key, list);
			}
		}
		return map;
	});

	/** Training pressure for one session: time under load, weighted by intensity. */
	function sessionLoad(s: ClientSession): number {
		const band =
			s.prescription?.intensity === 'hard' ? 3 : s.prescription?.intensity === 'steady' ? 2 : 1;
		return (s.durationMin ?? 30) * band;
	}
	function loadLevel(load: number): number {
		if (load <= 0) return 0;
		if (load < 45) return 1;
		if (load < 85) return 2;
		if (load < 130) return 3;
		return 4;
	}
	function levelClass(level: number): string {
		return ['', 'pressure-1', 'pressure-2', 'pressure-3', 'pressure-4'][level] ?? '';
	}

	const monthCells = $derived.by(() => {
		const now = new Date();
		const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
		const y = first.getUTCFullYear();
		const m = first.getUTCMonth();
		const firstDow = (first.getUTCDay() + 6) % 7; // Monday = 0
		const start = new Date(Date.UTC(y, m, 1 - firstDow));
		const cells: {
			iso: string;
			day: number;
			inMonth: boolean;
			isToday: boolean;
			load: number;
			km: number;
			count: number;
			done: boolean;
			skipped: boolean;
		}[] = [];
		for (let i = 0; i < 42; i++) {
			const d = new Date(start.getTime() + i * 86400000);
			const key = d.toISOString().slice(0, 10);
			const sessions = byDate.get(key) ?? [];
			cells.push({
				iso: key,
				day: d.getUTCDate(),
				inMonth: d.getUTCMonth() === m,
				isToday: key === todayIso,
				load: sessions.reduce((sum, s) => sum + sessionLoad(s), 0),
				km: sessions
					.filter((s) => s.modality === 'running')
					.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0),
				count: sessions.length,
				done: sessions.some((s) => loggedBySession.has(s.id)),
				skipped: sessions.some((s) => isSkipped(s.id)),
			});
		}
		return cells;
	});
	const monthLabel = $derived.by(() => {
		const now = new Date();
		const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
		return first.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
	});

	const sheetSessions = $derived(sheetIso ? (byDate.get(sheetIso) ?? []) : []);
	const sheetWeek = $derived.by(() => {
		const iso = sheetIso;
		if (!iso) return undefined;
		return weeks.find((w) => w.startDate && w.endDate && iso >= w.startDate && iso <= w.endDate);
	});
	const sheetLabel = $derived(
		sheetIso
			? new Date(`${sheetIso}T00:00:00Z`).toLocaleDateString(undefined, {
					weekday: 'long',
					month: 'long',
					day: 'numeric',
					timeZone: 'UTC',
				})
			: '',
	);
	// The API only accepts days inside the plan, so the sheet says why when the
	// open day is not one of them, instead of failing on tap.
	const planStart = $derived(weeks[0]?.startDate ?? null);
	const planEnd = $derived(weeks.length ? weeks[weeks.length - 1]?.endDate ?? null : null);
	const dayInPlan = $derived(!!sheetWeek);
	const outsidePlanNote = $derived(
		planStart && planEnd
			? `Your plan runs ${dateHeading(planStart)} to ${dateHeading(planEnd)}. Pick a day inside it to add a workout.`
			: 'Your plan has no days yet. Pick a day inside it to add a workout.',
	);

	onMount(() => {
		void ensurePlan();
	});

	function confirmIfFuture(_s: ClientSession, label: string, action: () => void): boolean {
		const d = sheetIso;
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

	function stepMonth(delta: number) {
		monthOffset += delta;
	}


	async function addFromLibrary(w: LibraryWorkout) {
		const date = pickerDate;
		pickerDate = null;
		if (!date) return;
		try {
			const { session } = await api.addWorkout(date, w.id);
			addError = null;
			// The day sheet belongs to the month view. In the list, stay put and
			// let the reveal effect scroll the new card into view.
			if (mode === 'month') sheetIso = date;
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
			if (mode === 'month') sheetIso = date;
			revealId = session.id;
			reloadPlan();
		} catch (e) {
			addError = e instanceof Error ? e.message : 'Could not add that workout.';
		}
	}
	/** Upcoming sessions from today, for the list view. */
	const listDays = $derived.by(() => {
		const dates = [...byDate.keys()].filter((d) => d >= todayIso).sort();
		return dates.slice(0, 45).map((d) => ({ date: d, sessions: byDate.get(d) ?? [] }));
	});
	/** Total sessions in the list, so the reveal effect re-runs when one is added. */
	const listCount = $derived(listDays.reduce((n, day) => n + day.sessions.length, 0));
	// Bring a freshly added session into view in the list view, where the runner
	// already is. Mirrors the carousel reveal: it waits for the card to render,
	// scrolls the nearest edge into view, then clears revealId.
	$effect(() => {
		const id = revealId;
		void listCount;
		if (!id || mode !== 'list' || !listEl) return;
		const node = listEl.querySelector(`[data-session-id="${CSS.escape(id)}"]`);
		if (!node) return;
		const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
		revealId = null;
	});
	function dateHeading(iso: string): string {
		return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC',
		});
	}
</script>

<div class="flex min-h-11 items-center justify-between gap-3">
	<h2 class="font-display text-lg font-semibold text-ink">{mode === 'month' ? monthLabel : 'Upcoming'}</h2>
	{#if mode === 'month'}
		<div class="flex items-center gap-2">
			<button type="button" onclick={() => stepMonth(-1)} aria-label="Previous month" class="flex h-11 w-11 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink">‹</button>
			<button type="button" onclick={() => (monthOffset = 0)} class="tabular text-xs text-steel hover:text-ink">Today</button>
			<button type="button" onclick={() => stepMonth(1)} aria-label="Next month" class="flex h-11 w-11 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink">›</button>
		</div>
	{/if}
</div>

<div class="relative mt-3 w-44 rounded-lg border border-hairline p-0.5" role="group" aria-label="Calendar view">
	<span class="pointer-events-none absolute inset-0.5 grid grid-cols-2" aria-hidden="true">
		<span class="calendar-thumb rounded-md bg-ink" style="transform: translateX({mode === 'list' ? '100%' : '0%'})"></span>
	</span>
	<div class="relative grid grid-cols-2">
		<button type="button" aria-pressed={mode === 'month'} onclick={() => setMode('month')} class="min-h-9 rounded-md px-2.5 py-1 text-xs {mode === 'month' ? 'font-medium text-paper' : 'text-steel hover:text-ink'}">Month</button>
		<button type="button" aria-pressed={mode === 'list'} onclick={() => setMode('list')} class="min-h-9 rounded-md px-2.5 py-1 text-xs {mode === 'list' ? 'font-medium text-paper' : 'text-steel hover:text-ink'}">List</button>
	</div>
</div>

{#key mode}
<div class="calendar-view">
{#if mode === 'month'}
	<div class="mx-auto mt-4 max-w-md">
	<div class="grid grid-cols-7 gap-1">
		{#each DAY_INITIALS as initial, i (i)}
			<span class="tabular py-1 text-center text-[10px] uppercase tracking-wide text-steel">{initial}</span>
		{/each}
		{#each monthCells as cell, i (cell.iso)}
			{@const level = loadLevel(cell.load)}
			<button
				type="button"
				onclick={() => (sheetIso = cell.iso)}
				aria-label="{cell.iso}{cell.count ? `, ${cell.count} sessions` : ', rest'}{cell.km ? `, ${fmtDistance(cell.km)}` : ''}{cell.skipped ? ', a skipped session' : ''}"
				style="animation-delay: {Math.min(i * 8, 260)}ms"
				class="reveal relative flex aspect-square flex-col items-center justify-center rounded-md border transition-colors {cell.inMonth
					? 'border-hairline'
					: 'border-transparent opacity-40'} {levelClass(level)}"
			>
				<span class="tabular text-xs {cell.skipped ? 'text-steel' : ''}">{cell.day}</span>
				{#if cell.km}<span class="tabular text-[9px] text-steel">{fmtDistance(cell.km)}</span>{/if}
				{#if cell.done}
					<span class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true"></span>
				{/if}
				{#if cell.skipped}
					<span class="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-steel" aria-hidden="true"></span>
				{/if}
				{#if cell.isToday}
					<span class="absolute bottom-1 h-0.5 w-4 rounded-full bg-signal-ink" aria-hidden="true"></span>
				{/if}
			</button>
		{/each}
	</div>
	<div class="mt-3 flex items-center justify-center gap-2 text-xs text-steel">
		<span>Less</span>
		{#each [0, 1, 2, 3, 4] as l (l)}
			<span class="h-3 w-3 rounded-[2px] border border-hairline {levelClass(l)}" aria-hidden="true"></span>
		{/each}
		<span>More pressure</span>
		<span class="ml-2 h-1.5 w-1.5 rounded-full bg-steel" aria-hidden="true"></span>
		<span>Skipped</span>
		<InfoButton
			term="Pressure"
			definition="How much a day asks of you, from the length and intensity of its sessions. A darker day is a harder day. A green dot means it is done. A grey dot means it has a skipped session."
		/>
	</div>
	</div>
{:else}
	<div bind:this={listEl} class="mx-auto mt-4 max-w-2xl space-y-4">
		{#each listDays as day (day.date)}
			<section class="rounded-2xl border border-hairline bg-sunken/50 p-3 shadow-[0_1px_4px_rgba(25,28,34,0.07)]">
				<div class="flex items-center justify-between gap-2">
					<p class="tabular text-xs uppercase tracking-widest text-steel">{dateHeading(day.date)}</p>
					<button
						type="button"
						onclick={() => (pickerDate = day.date)}
						class="text-xs text-signal-ink hover:underline"
					>
						＋ Add
					</button>
				</div>
				<div class="relative mt-2">
					<div class="scroll-modern flex snap-x gap-2 overflow-x-auto pb-1">
						{#each day.sessions as s (s.id)}
							<div data-session-id={s.id} class="shrink-0 snap-start">
								<MiniSessionCard
									session={s}
									logged={loggedBySession.get(s.id) ?? null}
									onOpen={() => (detailTarget = s)}
								/>
							</div>
						{/each}
					</div>
					<div
						class="pointer-events-none absolute inset-y-0 right-0 w-8"
						style="background: linear-gradient(to left, var(--sunken), transparent)"
						aria-hidden="true"
					></div>
				</div>
			</section>
		{/each}
	</div>
{/if}
</div>
{/key}

{#if sheetIso}
	<div class="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={sheetLabel} use:modal={() => (sheetIso = null)}>
		<button type="button" aria-label="Close" onclick={() => (sheetIso = null)} class="overlay-fade absolute inset-0 bg-ink/30"></button>
		<div class="overlay-sheet absolute inset-x-2 bottom-2 top-12 mx-auto flex max-w-2xl flex-col rounded-2xl border border-hairline bg-paper sm:bottom-16 sm:top-16">
			<div class="flex items-center justify-between gap-3 border-b border-hairline p-4">
				<div class="min-w-0">
					<p class="tabular text-xs uppercase tracking-widest text-steel">Day</p>
					<h2 class="font-display truncate text-lg font-bold">{sheetLabel}</h2>
				</div>
				<button type="button" onclick={() => (sheetIso = null)} aria-label="Close" class="flex h-11 w-11 shrink-0 items-center justify-center text-steel hover:text-ink">✕</button>
			</div>
			<div class="scroll-modern min-h-0 flex-1 overflow-y-auto p-4">
				{#if sheetSessions.length}
					<SessionCarousel sessions={sheetSessions} {card} bind:revealId />
				{:else}
					<Card tone="sunken" frame>
						<p class="text-sm text-steel">Rest day. Nothing scheduled here, and that is part of the plan.</p>
					</Card>
				{/if}
				<button
					type="button"
					disabled={!dayInPlan}
					onclick={() => {
						if (!dayInPlan || !sheetIso) return;
						addError = null;
						pickerDate = sheetIso;
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
			</div>
		</div>
	</div>
{/if}

{#if pickerDate}
	<WorkoutPicker date={pickerDate} onPick={addFromLibrary} onCustom={addCustom} onClose={() => (pickerDate = null)} />
{/if}

{#if playTarget}
	<SessionPlayer
		session={playTarget}
		eyebrow="{profileName} · W{sheetWeek?.weekNumber ?? ''}"
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
		eyebrow="{profileName} · W{sheetWeek?.weekNumber ?? ''}"
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
		eyebrow={`${profileName} · W${sheetWeek?.weekNumber ?? ''}`}
		logged={loggedBySession.get(detailTarget.id) ?? null}
		skipped={isSkipped(detailTarget.id)}
		onClose={() => (detailTarget = null)}
		onLog={() => {
			logTarget = detailTarget;
			detailTarget = null;
		}}
		onStart={() => {
			if (detailTarget) markStarted(detailTarget.id);
			playTarget = detailTarget;
			detailTarget = null;
		}}
		onSkip={() => {
			if (detailTarget)
				confirm = {
					title: 'Skip this workout?',
					body: 'It stays on your calendar, marked as skipped. You can un-skip it any time.',
					confirmLabel: 'Skip it',
					action: () => {
						skipSession(detailTarget!.id);
						detailTarget = null;
					},
				};
		}}
		onUnskip={() => {
			if (detailTarget)
				confirm = {
					title: 'Un-skip this workout?',
					body: 'It goes back to your normal plan for the day.',
					confirmLabel: 'Un-skip',
					action: () => unskipSession(detailTarget!.id),
				};
		}}
	/>
{/if}

{#snippet card(s: ClientSession)}
	<SessionCard
		session={s}
		eyebrow={`${profileName} · W${sheetWeek?.weekNumber ?? ''}`}
		active={false}
		logged={loggedBySession.get(s.id) ?? null}
		onLog={() => (logTarget = s)}
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

<style>
	/*
	 * The month or list view fades and rises a few pixels when the toggle
	 * switches, so the change reads as motion rather than a hard swap. The
	 * sliding thumb under the active label uses the same motion tokens. Both are
	 * dropped under prefers-reduced-motion, leaving an instant state change.
	 */
	.calendar-view {
		animation: calendar-view-in var(--dur-2) var(--ease-out) both;
	}
	@keyframes calendar-view-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	.calendar-thumb {
		transition: transform var(--dur-2) var(--ease-out);
	}
	@media (prefers-reduced-motion: reduce) {
		.calendar-view {
			animation: none;
		}
		.calendar-thumb {
			transition: none;
		}
	}
</style>

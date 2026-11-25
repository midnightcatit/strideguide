<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { type ClientSession, DAY_INITIALS, addDaysIso, localIso } from '$lib/plan';
	import { isSkipped } from '$lib/skipped.svelte';
	import { sessionHref } from '$lib/sessionNav';
	import MiniSessionCard from '$lib/components/MiniSessionCard.svelte';
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
	let revealId = $state<string | null>(null);
	let listEl = $state<HTMLDivElement | undefined>(undefined);

	const weeks = $derived(store.plan?.weeks ?? []);
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

	onMount(() => {
		// A workout just added from the list's add route is revealed in the list.
		const reveal = page.url.searchParams.get('reveal');
		if (reveal) revealId = reveal;
		void ensurePlan();
	});

	function stepMonth(delta: number) {
		monthOffset += delta;
	}

	/** Upcoming sessions from today, for the list view. */
	const listDays = $derived.by(() => {
		const dates = [...byDate.keys()].filter((d) => d >= todayIso).sort();
		return dates.slice(0, 45).map((d) => ({ date: d, sessions: byDate.get(d) ?? [] }));
	});
	/** Total sessions in the list, so the reveal effect re-runs when one is added. */
	const listCount = $derived(listDays.reduce((n, day) => n + day.sessions.length, 0));
	// Bring a freshly added session into view in the list view, where the runner
	// already is. It waits for the card to render, scrolls the nearest edge into
	// view, then clears revealId.
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
			<a
				href={`/calendar/day/${cell.iso}`}
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
			</a>
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
						onclick={() => goto(`/calendar/add/${day.date}?back=${encodeURIComponent('/calendar')}`)}
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
									onOpen={() => goto(sessionHref(s.id, '/calendar'))}
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

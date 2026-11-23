<script lang="ts">
	import { onMount } from 'svelte';
	import { getGoalProfile } from '@strideguide/shared/profiles';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { store, ensurePlan, upsertLog } from '$lib/planStore.svelte';
	import { type ClientSession, DAY_INITIALS, addDaysIso } from '$lib/plan';
	import { overlayHistory } from '$lib/overlayHistory.svelte';
	import { modal } from '$lib/actions';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import SessionCarousel from '$lib/components/SessionCarousel.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';
	import SessionDetail from '$lib/components/SessionDetail.svelte';
	import Card from '$lib/components/Card.svelte';

	const todayIso = new Date().toISOString().slice(0, 10);

	let monthOffset = $state(0);
	let sheetIso = $state<string | null>(null);
	let detailTarget = $state<ClientSession | null>(null);
	let playTarget = $state<ClientSession | null>(null);
	let logTarget = $state<ClientSession | null>(null);

	// Back (browser or hardware) closes the topmost overlay: a session, then the day sheet.
	overlayHistory(
		() => !!(sheetIso || detailTarget || playTarget || logTarget),
		() => {
			if (logTarget) logTarget = null;
			else if (playTarget) playTarget = null;
			else if (detailTarget) detailTarget = null;
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
		return (
			['bg-transparent', 'bg-ink/5', 'bg-ink/15', 'bg-ink/30', 'bg-ink/50'][level] ?? 'bg-transparent'
		);
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

	onMount(() => {
		void ensurePlan();
	});

	function stepMonth(delta: number) {
		monthOffset += delta;
	}
</script>

<div class="flex items-center justify-between gap-3">
	<p class="tabular text-xs uppercase tracking-widest text-steel">{monthLabel}</p>
	<div class="flex items-center gap-2">
		<button type="button" onclick={() => stepMonth(-1)} aria-label="Previous month" class="flex h-11 w-11 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink">‹</button>
		<button type="button" onclick={() => (monthOffset = 0)} class="tabular text-xs text-steel hover:text-ink">Today</button>
		<button type="button" onclick={() => stepMonth(1)} aria-label="Next month" class="flex h-11 w-11 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink">›</button>
	</div>
</div>

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
				aria-label="{cell.iso}{cell.count ? `, ${cell.count} sessions` : ', rest'}{cell.km ? `, ${fmtDistance(cell.km)}` : ''}"
				style="animation-delay: {Math.min(i * 8, 260)}ms"
				class="reveal relative flex aspect-square flex-col items-center justify-center rounded-md border transition-colors {cell.inMonth
					? 'border-hairline'
					: 'border-transparent opacity-40'} {levelClass(level)}"
			>
				<span class="tabular text-xs">{cell.day}</span>
				{#if cell.km}<span class="tabular text-[9px] text-steel">{fmtDistance(cell.km)}</span>{/if}
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
	</div>
</div>

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
					<SessionCarousel sessions={sheetSessions} {card} />
				{:else}
					<Card tone="sunken" frame>
						<p class="text-sm text-steel">Rest day. Nothing scheduled.</p>
					</Card>
				{/if}
			</div>
		</div>
	</div>
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
		eyebrow={`${profileName} · W${sheetWeek?.weekNumber ?? ''}`}
		active={false}
		logged={loggedBySession.get(s.id) ?? null}
		onLog={() => (logTarget = s)}
		onStart={() => (playTarget = s)}
		onOpen={() => (detailTarget = s)}
	/>
{/snippet}

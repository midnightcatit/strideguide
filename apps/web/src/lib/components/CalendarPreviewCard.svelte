<script lang="ts">
	import Card from './Card.svelte';
	import { store } from '$lib/planStore.svelte';
	import { isSkipped } from '$lib/skipped.svelte';
	import { TRAINING_PROGRESS } from '$lib/chartPalette';
	import { type ClientSession, DAY_INITIALS, addDaysIso, localIso } from '$lib/plan';

	/**
	 * A small month preview of the plan: the current month with each planned
	 * session marked, and the whole card opens the full calendar. It reads the
	 * shared plan store, so it always matches the calendar tab.
	 */
	const todayIso = localIso();
	const weeks = $derived(store.plan?.weeks ?? []);
	const loggedIds = $derived(
		new Set(store.logs.filter((l) => l.sessionId).map((l) => l.sessionId as string)),
	);
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
	const month = $derived.by(() => {
		const now = new Date();
		const y = now.getFullYear();
		const m = now.getMonth();
		const first = new Date(Date.UTC(y, m, 1));
		const firstDow = (first.getUTCDay() + 6) % 7;
		const start = new Date(Date.UTC(y, m, 1 - firstDow));
		const cells: {
			key: string;
			day: number;
			count: number;
			inMonth: boolean;
			today: boolean;
			planned: boolean;
			done: boolean;
			skipped: boolean;
		}[] = [];
		for (let i = 0; i < 42; i++) {
			const d = new Date(start.getTime() + i * 86400000);
			const key = d.toISOString().slice(0, 10);
			const sessions = byDate.get(key) ?? [];
			const done = sessions.some((s) => loggedIds.has(s.id));
			const skipped = !done && sessions.some((s) => isSkipped(s.id));
			cells.push({
				key,
				day: d.getUTCDate(),
				count: sessions.length,
				inMonth: d.getUTCMonth() === m,
				today: key === todayIso,
				planned: sessions.length > 0,
				done,
				skipped,
			});
		}
		const monthCount = cells
			.filter((c) => c.inMonth)
			.reduce((n, c) => n + (byDate.get(c.key)?.length ?? 0), 0);
		return {
			cells,
			monthCount,
			label: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
		};
	});

	function cellStyle(c: { done: boolean }): string {
		// A finished day draws in the training palette's green, the same hue the
		// plan ring and the heatmap use.
		return c.done ? `background: ${TRAINING_PROGRESS}; border-color: ${TRAINING_PROGRESS}; color: var(--paper)` : '';
	}

	function cellClass(c: { inMonth: boolean; done: boolean; skipped: boolean; planned: boolean }): string {
		if (c.done) return '';
		if (c.skipped) return 'border-hairline bg-steel text-paper';
		if (c.planned) return 'border-transparent bg-signal-wash text-signal-ink';
		return c.inMonth ? 'border-hairline text-steel' : 'border-transparent text-hairline';
	}

	const openId = `calendar-open-${crypto.randomUUID()}`;
</script>

<a href="/calendar" class="lift block h-full rounded-xl" aria-labelledby={openId}>
	<Card class="flex h-full flex-col">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="min-w-0">
				<p class="tabular text-[10px] uppercase tracking-widest text-steel">Calendar</p>
				<p class="font-display mt-1 text-lg font-semibold">{month.label}</p>
				<p class="mt-0.5 text-sm text-steel">
					{month.monthCount === 0
						? 'No sessions this month.'
						: `${month.monthCount} session${month.monthCount === 1 ? '' : 's'} planned.`}
				</p>
				<p id={openId} class="mt-2 text-[11px] text-signal-ink">Open the calendar →</p>
			</div>
			<div class="w-full sm:max-w-[17rem]">
				<div class="grid grid-cols-7 gap-1">
					{#each DAY_INITIALS as d, i (i)}
						<span class="tabular py-0.5 text-center text-[10px] uppercase tracking-wide text-steel">{d}</span>
					{/each}
					{#each month.cells as c (c.key)}
						<span
							class="tabular flex h-7 items-center justify-center rounded-md border text-[11px] {cellClass(c)} {c.today ? 'ring-1 ring-signal-ink' : ''}"
							style={cellStyle(c)}
							aria-label="{c.key}{c.planned ? `, ${c.count} session${c.count === 1 ? '' : 's'}` : ', rest'}"
						>{c.day}</span>
					{/each}
				</div>
			</div>
		</div>
	</Card>
</a>

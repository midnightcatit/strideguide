<script lang="ts">
	import { localIso } from '$lib/plan';

	/**
	 * A GitHub-style weekly activity heatmap. Columns are weeks (oldest on the
	 * left), rows are the days of the week. The span is the only knob, so the same
	 * component serves a small card and a full-size page with changeable timelines.
	 * Cells are static once drawn; only the hover lift animates, and reduced motion
	 * drops it, so nothing moves for people who ask for that.
	 */
	let {
		trainedDays,
		skippedDays,
		weeks = 12,
		todayIso,
		cell = 12,
		gap = 3,
		showMonthLabels = true,
		showWeekdays = false,
	}: {
		trainedDays: string[] | Set<string>;
		skippedDays?: string[] | Set<string>;
		weeks?: number;
		todayIso?: string;
		cell?: number;
		gap?: number;
		showMonthLabels?: boolean;
		showWeekdays?: boolean;
	} = $props();

	const trained = $derived(
		trainedDays instanceof Set ? trainedDays : new Set<string>(trainedDays),
	);
	const skipped = $derived(
		skippedDays instanceof Set ? skippedDays : new Set<string>(skippedDays ?? []),
	);
	const today = $derived(todayIso ?? localIso());

	function isoOf(d: Date): string {
		return d.toISOString().slice(0, 10);
	}

	const columns = $derived.by(() => {
		const end = new Date(`${today}T00:00:00Z`);
		const endMonday = new Date(end);
		endMonday.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
		const start = new Date(endMonday);
		start.setUTCDate(endMonday.getUTCDate() - (weeks - 1) * 7);

		const out: { key: string; month: string; days: { key: string; state: 'done' | 'skipped' | 'miss' | 'future' | 'today' }[] }[] = [];
		for (let w = 0; w < weeks; w++) {
			const colStart = new Date(start);
			colStart.setUTCDate(start.getUTCDate() + w * 7);
			const month = colStart.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
			const days: { key: string; state: 'done' | 'skipped' | 'miss' | 'future' | 'today' }[] = [];
			for (let d = 0; d < 7; d++) {
				const day = new Date(colStart);
				day.setUTCDate(colStart.getUTCDate() + d);
				const key = isoOf(day);
				const state: 'done' | 'skipped' | 'miss' | 'future' | 'today' =
					key > today
						? 'future'
						: key === today
							? 'today'
							: trained.has(key)
								? 'done'
								: skipped.has(key)
									? 'skipped'
									: 'miss';
				days.push({ key, state });
			}
			out.push({ key: isoOf(colStart), month, days });
		}
		return out;
	});

	const cellClass = (state: 'done' | 'skipped' | 'miss' | 'future' | 'today'): string =>
		state === 'done'
			? 'bg-ok'
			: state === 'skipped'
				? 'bg-steel'
				: state === 'today'
					? 'bg-signal-wash ring-1 ring-signal-ink'
					: state === 'future'
						? 'bg-transparent'
						: 'bg-hairline';

	const trainedCount = $derived(columns.reduce((n, c) => n + c.days.filter((d) => d.state === 'done').length, 0));
	const skippedCount = $derived(columns.reduce((n, c) => n + c.days.filter((d) => d.state === 'skipped').length, 0));
	const label = $derived(
		`${trainedCount} training days in the last ${weeks} weeks${skippedCount ? `, ${skippedCount} skipped` : ''}`,
	);
</script>

<div class="inline-flex flex-col gap-1" role="img" aria-label={label}>
	{#if showMonthLabels}
		<div class="flex" style="gap: {gap}px; padding-left: {showWeekdays ? cell + 8 : 0}px">
			{#each columns as col, i (col.key)}
				<span class="overflow-visible text-[9px] text-steel" style="width: {cell}px">
					{#if i === 0 || col.month !== columns[i - 1]?.month}{col.month}{/if}
				</span>
			{/each}
		</div>
	{/if}
	<div class="flex" style="gap: {gap}px">
		{#if showWeekdays}
			<div class="flex flex-col pr-1 text-[9px] text-steel" style="gap: {gap}px">
				{#each ['M', '', 'W', '', 'F', '', 'S'] as d, i (i)}
					<span class="flex items-center" style="height: {cell}px">{d}</span>
				{/each}
			</div>
		{/if}
		{#each columns as col (col.key)}
			<div class="flex flex-col" style="gap: {gap}px">
				{#each col.days as day (day.key)}
					<span
						class="rounded-[2px] transition-transform hover:scale-125 {cellClass(day.state)}"
						style="width: {cell}px; height: {cell}px"
						title="{day.key}{day.state === 'done' ? ' · trained' : day.state === 'skipped' ? ' · skipped' : ''}"
					></span>
				{/each}
			</div>
		{/each}
	</div>
</div>

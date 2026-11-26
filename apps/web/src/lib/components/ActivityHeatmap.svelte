<script lang="ts">
	import { localIso } from '$lib/plan';
	import { TRAINING_PROGRESS, CHART_MUTED, CHART_EMPTY } from '$lib/chartPalette';

	/**
	 * A GitHub-style weekly activity heatmap. Columns are weeks (oldest on the
	 * left), rows are the days of the week. The span is the only knob, so the same
	 * component serves a small card and a full-size page with changeable timelines.
	 * A trained day draws in the training palette's green, the same hue the plan
	 * ring and the volume bars use, so the streak reads as part of the same family;
	 * a skipped day is the muted token and an untrained day the quiet one. Cells
	 * are static once drawn; only the hover lift animates, and reduced motion
	 * drops it, so nothing moves for people who ask for that.
	 *
	 * With `fluid`, the columns share the container width, so the cells grow
	 * square to fill it at any span: fewer weeks means larger boxes. That suits a
	 * small preview. With `scroll`, the cells instead hold a fixed size and the
	 * strip scrolls sideways, so every span keeps the same, tappable square and
	 * the weekday labels stay pinned while the columns move under them. `scroll`
	 * takes precedence over `fluid`. With `onDayClick`, each day becomes a button
	 * that reports its date, so a page can open a day's activity.
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
		fluid = false,
		scroll = false,
		onDayClick,
	}: {
		trainedDays: string[] | Set<string>;
		skippedDays?: string[] | Set<string>;
		weeks?: number;
		todayIso?: string;
		cell?: number;
		gap?: number;
		showMonthLabels?: boolean;
		showWeekdays?: boolean;
		/** Fill the container width; cells grow square instead of a fixed pixel size. */
		fluid?: boolean;
		/** Keep cells at their fixed size and scroll the strip sideways instead. */
		scroll?: boolean;
		/** When set, each day is a button that reports its ISO date. */
		onDayClick?: (iso: string) => void;
	} = $props();

	// Scrolling keeps the cells at their fixed size, so it wins over `fluid`.
	const expand = $derived(fluid && !scroll);

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

	const cellFill = (state: 'done' | 'skipped' | 'miss' | 'future' | 'today'): string =>
		state === 'done'
			? TRAINING_PROGRESS
			: state === 'skipped'
				? CHART_MUTED
				: state === 'today'
					? 'var(--signal-wash)'
					: state === 'future'
						? 'transparent'
						: CHART_EMPTY;

	const cellClass = (state: 'done' | 'skipped' | 'miss' | 'future' | 'today'): string =>
		state === 'today' ? 'ring-1 ring-signal-ink' : '';

	const cellStyle = (state: 'done' | 'skipped' | 'miss' | 'future' | 'today'): string => {
		const parts = [`background: ${cellFill(state)}`];
		if (!expand) parts.push(`width: ${cell}px`, `height: ${cell}px`);
		return parts.join('; ');
	};

	const dayLabel = (day: { key: string; state: 'done' | 'skipped' | 'miss' | 'future' | 'today' }): string => {
		const tail =
			day.state === 'done'
				? ', trained'
				: day.state === 'skipped'
					? ', skipped'
					: day.state === 'today'
						? ', today'
						: day.state === 'future'
							? ', upcoming'
							: ', no training';
		return `${day.key}${tail}`;
	};

	const trainedCount = $derived(columns.reduce((n, c) => n + c.days.filter((d) => d.state === 'done').length, 0));
	const skippedCount = $derived(columns.reduce((n, c) => n + c.days.filter((d) => d.state === 'skipped').length, 0));
	const label = $derived(
		`${trainedCount} training days in the last ${weeks} weeks${skippedCount ? `, ${skippedCount} skipped` : ''}`,
	);

	// The weekday column's own width, measured, so the month labels line up with
	// the day columns at any span instead of guessing at it.
	let weekdayW = $state(0);

	/*
	 * Keyboard handling for the interactive grid. One tab stop, not one per day:
	 * only the focused cell is tabbable and the arrow keys roam the grid, so a
	 * year's view does not put 364 stops in the Tab order. Focus starts on today.
	 */
	let gridEl = $state<HTMLElement | undefined>(undefined);
	let focusW = $state(-1);
	let focusD = $state(-1);

	function isActiveCell(w: number, d: number): boolean {
		if (!onDayClick) return false;
		if (focusW < 0) return columns[w]?.days[d]?.key === today;
		return w === focusW && d === focusD;
	}

	function onCellKey(e: KeyboardEvent, w: number, d: number) {
		if (!onDayClick || !columns.length) return;
		let nw = w;
		let nd = d;
		if (e.key === 'ArrowRight') nw = Math.min(columns.length - 1, w + 1);
		else if (e.key === 'ArrowLeft') nw = Math.max(0, w - 1);
		else if (e.key === 'ArrowDown') nd = Math.min(6, d + 1);
		else if (e.key === 'ArrowUp') nd = Math.max(0, d - 1);
		else if (e.key === 'Home') {
			nw = 0;
			nd = 0;
		} else if (e.key === 'End') {
			nw = columns.length - 1;
			nd = 6;
		} else return;
		e.preventDefault();
		focusW = nw;
		focusD = nd;
		gridEl
			?.querySelector<HTMLElement>(`[data-heat-w="${nw}"][data-heat-d="${nd}"]`)
			?.focus();
	}
</script>

<div
	class={scroll ? 'scroll-modern overflow-x-auto overflow-y-hidden py-0.5' : ''}
	style={scroll ? 'touch-action: pan-x; -webkit-overflow-scrolling: touch;' : ''}
>
	<div
		class="{expand ? 'flex w-full' : 'inline-flex'} flex-col gap-1"
		role={onDayClick ? 'group' : 'img'}
		aria-label={label}
	>
		{#if showMonthLabels}
			<div class="flex {expand ? 'w-full' : ''}" style="gap: {gap}px{showWeekdays ? `; padding-left: ${weekdayW + gap}px` : ''}">
				{#each columns as col, i (col.key)}
					<span class="overflow-visible whitespace-nowrap text-[9px] text-steel {expand ? 'min-w-0 flex-1' : ''}" style={expand ? '' : `width: ${cell}px`}>
						{#if i === 0 || col.month !== columns[i - 1]?.month}{col.month}{/if}
					</span>
				{/each}
			</div>
		{/if}
		<div bind:this={gridEl} class="flex {expand ? 'w-full' : ''}" style="gap: {gap}px">
			{#if showWeekdays}
				<div bind:clientWidth={weekdayW} class="flex flex-col pr-1 text-[9px] text-steel {scroll ? 'sticky left-0 z-10 bg-paper' : ''}" style="gap: {gap}px">
					{#each ['M', '', 'W', '', 'F', '', 'S'] as d, i (i)}
						{#if expand}
							<span class="flex flex-1 items-center">{d}</span>
						{:else}
							<span class="flex items-center" style="height: {cell}px">{d}</span>
						{/if}
					{/each}
				</div>
			{/if}
			{#each columns as col, w (col.key)}
				<div class="flex flex-col {expand ? 'min-w-0 flex-1' : ''}" style="gap: {gap}px">
					{#each col.days as day, d (day.key)}
						{#if onDayClick}
							<button
								type="button"
								class="rounded-[2px] border-0 p-0 transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-signal-ink {expand ? 'aspect-square w-full' : ''} {cellClass(day.state)}"
								style={cellStyle(day.state)}
								data-heat-w={w}
								data-heat-d={d}
								tabindex={isActiveCell(w, d) ? 0 : -1}
								aria-label={dayLabel(day)}
								onfocus={() => {
									focusW = w;
									focusD = d;
								}}
								onkeydown={(e) => onCellKey(e, w, d)}
								onclick={() => onDayClick(day.key)}
							></button>
						{:else}
							<span
								class="rounded-[2px] transition-transform hover:scale-125 {expand ? 'aspect-square w-full' : ''} {cellClass(day.state)}"
								style={cellStyle(day.state)}
								title={dayLabel(day)}
							></span>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

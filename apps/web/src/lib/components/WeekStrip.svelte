<script lang="ts">
	import { type ClientWeek, DAY_INITIALS, DAY_NAMES, addDaysIso, weekdayIndexFromIso } from '$lib/plan';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { weekSwipe } from '$lib/actions';
	import { isSkipped } from '$lib/skipped.svelte';

	let {
		week,
		weekKey,
		weekStart,
		selectedDay,
		todayIndex,
		todayInWeek = false,
		loggedBySession,
		onSelect,
		onWeekStep,
		weekDir = 1,
	}: {
		week: ClientWeek | undefined;
		// Changes on every week step, even between two weeks outside the plan, so
		// the strip always replays its slide. A plain day tap keeps it stable.
		weekKey: string;
		// The first day shown, so the columns label the real weekdays even when the
		// plan's week does not begin on a Monday.
		weekStart: string;
		selectedDay: number;
		todayIndex: number;
		todayInWeek?: boolean;
		loggedBySession: { has(id: string): boolean };
		onSelect: (day: number) => void;
		onWeekStep?: (delta: 1 | -1) => void;
		weekDir?: number;
	} = $props();

	/** The weekday (0 = Monday) shown in a column, read from its real date. */
	function weekdayAt(day: number): number {
		return weekStart ? weekdayIndexFromIso(addDaysIso(weekStart, day)) : day;
	}

	function level(day: number): number {
		const ds = week?.sessions.filter((s) => s.day === day) ?? [];
		if (!ds.length) return 0;
		return Math.max(
			...ds.map((s) =>
				s.prescription?.intensity === 'hard' ? 3 : s.prescription?.intensity === 'steady' ? 2 : 1,
			),
		);
	}
	function logged(day: number): boolean {
		return (week?.sessions ?? []).some((s) => s.day === day && loggedBySession.has(s.id));
	}
	function skipped(day: number): boolean {
		return (week?.sessions ?? []).some((s) => s.day === day && isSkipped(s.id));
	}
	function distance(day: number): number {
		return (week?.sessions ?? [])
			.filter((s) => s.day === day && s.modality === 'running')
			.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0);
	}
</script>

<!-- Week control: the arrows move a whole week at a time. They only show on a
     large, non-touch screen; on a phone the swipe and the horizontal wheel do
     the same job. Tapping a day still selects that day. -->
{#if onWeekStep}
	<div class="mb-1 hidden items-center justify-between gap-2 sm:pointer-fine:flex">
		<button
			type="button"
			onclick={() => onWeekStep(-1)}
			aria-label="Previous week"
			class="flex h-9 w-9 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink"
		>
			‹
		</button>
		<span class="tabular text-xs uppercase tracking-widest text-steel">{week ? `Week ${week.weekNumber}` : 'Week'}</span>
		<button
			type="button"
			onclick={() => onWeekStep(1)}
			aria-label="Next week"
			class="flex h-9 w-9 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink"
		>
			›
		</button>
	</div>
{/if}

{#key weekKey}
	<div
		class="grid grid-cols-7 gap-1 {weekDir >= 0 ? 'sg-enter-week-right' : 'sg-enter-week-left'}"
		role="group"
		aria-label="Days of the week"
		use:weekSwipe={onWeekStep}
	>
	{#each [0, 1, 2, 3, 4, 5, 6] as day (day)}
		{@const wd = weekdayAt(day)}
		{@const lv = level(day)}
		{@const lg = logged(day)}
		{@const sk = skipped(day)}
		{@const km = distance(day)}
		{@const isToday = todayInWeek && day === todayIndex}
		{@const isSelected = day === selectedDay}
		<!-- One channel per state, so they never fight: the selected day is the
		     filled pill, today is the ring, logged is the check. The ring draws
		     outside the box, so it adds no height and the strip stays one size
		     whether or not today is in the week. -->
		<button
			type="button"
			aria-pressed={isSelected}
			aria-current={isToday ? 'date' : undefined}
			aria-label="{DAY_NAMES[wd]}{isToday ? ', today' : ''}{lg ? ', logged' : ''}{sk ? ', has a skipped session' : ''}{km ? `, ${fmtDistance(km)}` : ''}"
			onclick={() => onSelect(day)}
			class="flex flex-col items-center gap-1.5 rounded-md py-2 transition-colors {isSelected
				? 'bg-ink text-paper'
				: 'text-steel hover:text-ink'} {isToday ? 'ring-1 ring-signal-ink' : ''}"
		>
			<span class="tabular text-xs uppercase tracking-wide {isSelected ? 'font-semibold' : ''}">{DAY_INITIALS[wd]}</span>
			<span class="flex h-3 items-end gap-0.5" aria-hidden="true">
				{#each [1, 2, 3] as i (i)}
					<span
						class="w-0.5 rounded-[1px] {i <= lv
							? isSelected
								? 'bg-paper'
								: 'bg-ink'
							: isSelected
								? 'bg-paper/30'
								: 'bg-hairline'}"
						style="height: {3 + i * 3}px"
					></span>
				{/each}
			</span>
			<span class="flex h-3 items-center justify-center" aria-hidden="true">
				{#if lg}
					<span class="text-[10px] text-ok-ink" aria-hidden="true">✓</span>
				{:else if sk}
					<span class="h-1.5 w-1.5 rounded-full {isSelected ? 'bg-paper' : 'bg-steel'}"></span>
				{/if}
			</span>
		</button>
	{/each}
	</div>
{/key}

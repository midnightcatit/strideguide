<script lang="ts">
	import { type ClientWeek, DAY_INITIALS, DAY_NAMES } from '$lib/plan';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { dayWheel } from '$lib/actions';

	let {
		week,
		selectedDay,
		todayIndex,
		todayInWeek = false,
		loggedBySession,
		onSelect,
		onWeekStep,
		onDayStep,
	}: {
		week: ClientWeek | undefined;
		selectedDay: number;
		todayIndex: number;
		todayInWeek?: boolean;
		loggedBySession: { has(id: string): boolean };
		onSelect: (day: number) => void;
		onWeekStep?: (delta: 1 | -1) => void;
		onDayStep?: (delta: 1 | -1) => void;
	} = $props();

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
	function distance(day: number): number {
		return (week?.sessions ?? [])
			.filter((s) => s.day === day && s.modality === 'running')
			.reduce((sum, s) => sum + (s.prescription?.targetDistanceKm ?? 0), 0);
	}
</script>

<!-- Week control: the arrows move a whole week at a time. The day tabs below
     step a single day. -->
{#if onWeekStep}
	<div class="mb-1 flex items-center justify-between gap-2">
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

<div class="grid grid-cols-7 gap-1" role="group" aria-label="Days of the week" use:dayWheel={onDayStep}>
	{#each DAY_INITIALS as initial, day (day)}
		{@const lv = level(day)}
		{@const lg = logged(day)}
		{@const km = distance(day)}
		<button
			type="button"
			aria-pressed={day === selectedDay}
			aria-label="{DAY_NAMES[day]}{lg ? ', logged' : ''}{km ? `, ${fmtDistance(km)}` : ''}"
			onclick={() => onSelect(day)}
			class="flex flex-col items-center gap-1.5 rounded-md py-2 transition-colors {day === selectedDay
				? 'bg-ink text-paper'
				: 'text-steel hover:text-ink'}"
		>
			<span class="tabular text-xs uppercase tracking-wide">{initial}</span>
			<span class="flex h-3 items-end gap-0.5" aria-hidden="true">
				{#each [1, 2, 3] as i (i)}
					<span
						class="w-0.5 rounded-[1px] {i <= lv
							? day === selectedDay
								? 'bg-paper'
								: 'bg-ink'
							: day === selectedDay
								? 'bg-paper/30'
								: 'bg-hairline'}"
						style="height: {3 + i * 3}px"
					></span>
				{/each}
			</span>
			<span class="h-3 text-[10px] {lg ? 'text-ok' : 'text-transparent'}" aria-hidden="true">✓</span>
			{#if todayInWeek && day === todayIndex}
				<span class="h-0.5 w-4 rounded-full {day === selectedDay ? 'bg-paper' : 'bg-signal-ink'}" aria-hidden="true"></span>
			{/if}
		</button>
	{/each}
</div>

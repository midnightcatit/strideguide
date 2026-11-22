<script lang="ts">
	import type { ClientSession } from '$lib/plan';
	import { DAY_INITIALS } from '$lib/plan';

	let {
		sessions,
		activeDay,
		todayIndex,
		loggedDays = [],
		onSelect,
	}: {
		sessions: ClientSession[];
		activeDay: number;
		todayIndex: number;
		loggedDays?: number[];
		onSelect: (day: number) => void;
	} = $props();

	const hasSession = (day: number) => sessions.some((s) => s.day === day);

	/** Strongest intensity scheduled that day: 1 easy, 2 steady, 3 hard. */
	function dayLevel(day: number): number {
		const ds = sessions.filter((s) => s.day === day);
		if (!ds.length) return 0;
		return Math.max(
			...ds.map((s) =>
				s.prescription?.intensity === 'hard' ? 3 : s.prescription?.intensity === 'steady' ? 2 : 1,
			),
		);
	}
</script>

<div class="flex justify-between gap-1" role="tablist" aria-label="Days of the week">
	{#each DAY_INITIALS as initial, day (day)}
		{@const logged = loggedDays.includes(day)}
		<button
			type="button"
			role="tab"
			aria-selected={day === activeDay}
			aria-label="{initial}{logged ? ' (logged)' : hasSession(day) ? ' (planned)' : ''}"
			onclick={() => onSelect(day)}
			class="relative min-h-11 flex-1 rounded-md py-2 text-xs tabular transition-colors {day === activeDay
				? 'bg-ink text-paper font-bold'
				: 'text-steel hover:text-ink'}"
		>
			{initial}
			{#if todayIndex === day}
				<span
					class="absolute inset-x-2 bottom-1 h-0.5 rounded-full {day === activeDay ? 'bg-paper' : 'bg-signal'}"
					aria-hidden="true"
				></span>
			{/if}
			{#if logged}
				<span class="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] text-signal-ink" aria-hidden="true"
					>✓</span
				>
			{:else if dayLevel(day) > 0}
				<span class="absolute left-1/2 top-1 flex -translate-x-1/2 gap-px" aria-hidden="true">
					{#each [1, 2, 3] as i (i)}
						<span
							class="h-2 w-0.5 rounded-[1px] {i <= dayLevel(day)
								? day === activeDay
									? 'bg-paper'
									: 'bg-ink'
								: day === activeDay
									? 'bg-paper/40'
									: 'bg-hairline'}"
						></span>
					{/each}
				</span>
			{/if}
		</button>
	{/each}
</div>

<script lang="ts">
	import type { ClientSession } from '$lib/plan';
	import { DAY_INITIALS } from '$lib/plan';

	let {
		sessions,
		activeDay,
		todayIndex,
		onSelect,
	}: {
		sessions: ClientSession[];
		activeDay: number;
		todayIndex: number;
		onSelect: (day: number) => void;
	} = $props();

	function hasSession(day: number): boolean {
		return sessions.some((s) => s.day === day);
	}
</script>

<div class="flex justify-between gap-1" role="tablist" aria-label="Days of the week">
	{#each DAY_INITIALS as initial, day (day)}
		<button
			type="button"
			role="tab"
			aria-selected={day === activeDay}
			onclick={() => onSelect(day)}
			class="relative flex-1 rounded-md py-2 text-xs tabular transition-colors {day === activeDay
				? 'bg-ink text-paper font-bold'
				: 'text-steel hover:text-ink'}"
		>
			{initial}
			{#if todayIndex === day}
				<span
					class="absolute inset-x-2 bottom-1 h-0.5 rounded-full {day === activeDay
						? 'bg-paper'
						: 'bg-signal'}"
					aria-hidden="true"
				></span>
			{/if}
			{#if hasSession(day)}
				<span
					class="absolute left-1/2 top-1 h-1 w-1 -translate-x-1/2 rounded-full {day === activeDay
						? 'bg-paper'
						: 'bg-steel'}"
					aria-hidden="true"
				></span>
			{/if}
		</button>
	{/each}
</div>

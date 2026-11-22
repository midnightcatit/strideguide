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
			{:else if hasSession(day)}
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

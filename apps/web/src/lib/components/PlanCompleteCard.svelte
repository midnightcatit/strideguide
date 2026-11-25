<script lang="ts">
	/**
	 * The last day of a plan with no race, so the plan's end reads as the finish
	 * line it is. It sits after the day's workouts and can be logged, the same as
	 * a session, to mark the plan done.
	 */
	let {
		name,
		dateLabel,
		line = 'You finished the plan. That is the hard part, and it is behind you now.',
		weeks = 0,
		distanceLabel = '',
		logged = false,
		onLog,
	}: {
		name: string;
		dateLabel: string;
		line?: string;
		/** The plan's length, for the finish-line stats. */
		weeks?: number;
		/** The plan's total planned distance, already converted to the runner's units. */
		distanceLabel?: string;
		logged?: boolean;
		onLog?: () => void;
	} = $props();

	const stats = $derived.by(() => {
		const out: { text: string }[] = [];
		if (weeks) out.push({ text: `${weeks} week${weeks === 1 ? '' : 's'}` });
		if (distanceLabel) out.push({ text: `${distanceLabel} planned` });
		return out;
	});
</script>

<article class="stage-card lift relative overflow-hidden rounded-xl border border-ok bg-ok-wash p-5 sm:p-6">
	<div class="absolute left-0 top-0 h-full w-1 bg-ok" aria-hidden="true"></div>

	<div class="relative">
		<div class="flex items-center gap-2">
			<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ok text-paper" aria-hidden="true">
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 10.5l4 4 8-9" />
				</svg>
			</span>
			<p class="tabular text-xs uppercase tracking-widest text-ok">Plan complete</p>
		</div>

		<h2 class="font-display mt-3 text-2xl font-bold leading-tight">{name}</h2>
		<p class="tabular mt-1 text-sm text-ok">{dateLabel}</p>
		<p class="mt-3 text-sm leading-relaxed text-ink">{line}</p>

		{#if stats.length}
			<div class="mt-3 flex flex-wrap gap-1.5" role="list" aria-label="Plan totals">
				{#each stats as stat (stat.text)}
					<span class="rounded-full border border-ok/40 bg-paper px-2.5 py-1 text-xs font-medium text-ok" role="listitem">{stat.text}</span>
				{/each}
			</div>
		{/if}
	</div>

	{#if onLog && !logged}
		<button
			type="button"
			onclick={onLog}
			class="relative mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
		>
			Log how it went
		</button>
	{:else if logged}
		<p class="relative mt-4 flex items-center gap-2 text-sm font-medium text-ok">
			<span class="flex h-5 w-5 items-center justify-center rounded-full bg-ok text-paper" aria-hidden="true">
				<svg class="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 10.5l4 4 8-9" />
				</svg>
			</span>
			Logged
		</p>
	{/if}
</article>

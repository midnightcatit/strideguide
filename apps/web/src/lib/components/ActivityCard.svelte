<script lang="ts">
	import type { ClientActivity } from '$lib/plan';
	import { activityModalityLabel, activityTitle, formatDurationSeconds } from '$lib/plan';
	import { fmtDistance, fmtPace } from '$lib/prefs.svelte';

	/**
	 * A completed workout imported from a connected health app. It stands on its
	 * own: its own stats, its own date. It is never tied to a planned session, so
	 * it reads as a separate card type from the plan's session cards.
	 */
	let {
		activity,
		eyebrow = '',
		onOpen,
	}: {
		activity: ClientActivity;
		eyebrow?: string;
		/** When set, the whole card opens the activity's own page. */
		onOpen?: () => void;
	} = $props();

	const category = $derived(activityModalityLabel(activity.modality));
	const title = $derived(activityTitle(activity));
	const pace = $derived(
		activity.avgPaceSecPerKm ??
			(activity.distanceM && activity.durationSec
				? Math.round(activity.durationSec / (activity.distanceM / 1000))
				: null),
	);
	const pills = $derived.by(() => {
		const out: string[] = [];
		if (activity.distanceM) out.push(fmtDistance(activity.distanceM / 1000));
		if (pace) out.push(fmtPace(pace));
		if (activity.durationSec) out.push(formatDurationSeconds(activity.durationSec));
		if (activity.avgHr) out.push(`${Math.round(activity.avgHr)} bpm`);
		return out;
	});
</script>

<article
	class="stage-card lift relative overflow-hidden rounded-xl border border-hairline bg-cool-wash p-4 sm:p-5 {onOpen
		? 'shadow-[0_1px_3px_rgba(25,28,34,0.06)]'
		: ''}"
>
	<div class="absolute left-0 top-0 h-full w-0.5 bg-cool" aria-hidden="true"></div>

	{#if onOpen}
		<button
			type="button"
			class="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-ink"
			aria-label="Open {title} details"
			onclick={onOpen}
		></button>
	{/if}

	<div class="pointer-events-none relative z-10 flex flex-col">
		<div class="flex items-baseline justify-between gap-3">
			<span class="tabular truncate text-xs uppercase tracking-widest text-steel">{eyebrow}</span>
			<span class="flex shrink-0 items-center gap-2">
				<span class="rounded-full border border-badge bg-badge-wash px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-badge">{category}</span>
				<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-paper" aria-label="Completed">
					<svg class="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M4 10.5l4 4 8-9" />
					</svg>
				</span>
			</span>
		</div>

		<h2 class="font-display mt-1.5 truncate text-xl font-semibold leading-tight">{title}</h2>

		<hr class="my-3 border-hairline" />

		<div class="scroll-modern flex gap-1.5 overflow-x-auto" role="list" aria-label="Workout facts">
			{#each pills as pill (pill)}
				<span class="shrink-0 whitespace-nowrap rounded-full border border-badge bg-badge-wash px-2.5 py-1 text-xs font-medium text-badge" role="listitem">{pill}</span>
			{/each}
		</div>

		<div class="mt-3 flex items-center gap-2">
			<span class="rounded-full bg-ok-wash px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ok-ink">Done</span>
			<p class="text-sm text-steel">Imported from your health app</p>
		</div>
	</div>
</article>

<script lang="ts">
	import type { ClientActivity } from '$lib/plan';
	import { sessionTypeLabel } from '$lib/plan';
	import { fmtDistance, fmtPace } from '$lib/prefs.svelte';

	/**
	 * A completed workout imported from a connected health app. It stands on its
	 * own: its own stats, its own date. It is never tied to a planned session, so
	 * it reads as a separate card type from the plan's session cards.
	 */
	let { activity, eyebrow = '' }: { activity: ClientActivity; eyebrow?: string } = $props();

	const category = $derived(activityCategory(activity.modality));
	const title = $derived(activity.type ? sessionTypeLabel(activity.type) : category);
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
		if (activity.durationSec) out.push(durationLabel(activity.durationSec));
		if (activity.avgHr) out.push(`${Math.round(activity.avgHr)} bpm`);
		return out;
	});

	function activityCategory(modality: string): string {
		switch (modality) {
			case 'running':
				return 'Run';
			case 'walking':
				return 'Walk';
			case 'strength':
				return 'Strength';
			case 'mobility':
				return 'Mobility';
			case 'recovery':
				return 'Recovery';
			case 'cross-train':
				return 'Cross';
			default:
				return 'Workout';
		}
	}
	function durationLabel(sec: number): string {
		const m = Math.round(sec / 60);
		if (m >= 60) {
			const h = Math.floor(m / 60);
			const rest = m % 60;
			return rest ? `${h}h ${rest}m` : `${h}h`;
		}
		return `${m} min`;
	}
</script>

<article class="stage-card lift relative overflow-hidden rounded-xl border border-hairline bg-cool-wash p-4 sm:p-5">
	<div class="absolute left-0 top-0 h-full w-0.5 bg-cool" aria-hidden="true"></div>

	<div class="relative flex flex-col">
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
			<span class="rounded-full bg-ok-wash px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ok">Done</span>
			<p class="text-sm text-steel">Imported from your health app</p>
		</div>
	</div>
</article>

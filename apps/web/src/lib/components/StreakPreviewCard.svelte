<script lang="ts">
	import Card from './Card.svelte';
	import ActivityHeatmap from './ActivityHeatmap.svelte';

	/**
	 * The streak at a glance: the current run and a small heatmap. Shared by the
	 * dashboard and the progress tab so both read the same.
	 */
	let {
		streak,
		trainedDays,
		skippedDays,
		todayIso,
		weeks = 12,
		from = '/progress',
	}: {
		streak: number;
		trainedDays: string[] | Set<string>;
		skippedDays?: string[] | Set<string>;
		todayIso: string;
		weeks?: number;
		from?: string;
	} = $props();

	const href = $derived(`/progress/streak?from=${from}`);
</script>

<a {href} class="lift block rounded-xl" aria-label="Streak, open the full activity heatmap">
	<Card tone="sunken">
		<p class="tabular text-[10px] uppercase tracking-widest text-steel">Streak</p>
		<p class="tabular mt-1 text-lg {streak > 0 ? 'text-ok' : 'text-steel'}">{streak}<span class="text-sm">&nbsp;{streak === 1 ? 'day' : 'days'}</span></p>
		<div class="mt-2.5">
			<ActivityHeatmap {trainedDays} {skippedDays} {weeks} {todayIso} cell={6} gap={2} showMonthLabels={false} />
		</div>
		<p class="mt-2 text-[11px] text-signal-ink">See the heatmap →</p>
	</Card>
</a>

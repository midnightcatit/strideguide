<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { trainedDays, currentStreak, metricOrigin } from '$lib/metrics';
	import { addDaysIso } from '$lib/plan';
	import { isSkipped } from '$lib/skipped.svelte';
	import Card from '$lib/components/Card.svelte';
	import MetricHeader from '$lib/components/MetricHeader.svelte';
	import ActivityHeatmap from '$lib/components/ActivityHeatmap.svelte';

	onMount(() => void ensurePlan());

	const from = $derived(metricOrigin(page.url.searchParams.get('from')));
	const todayIso = new Date().toISOString().slice(0, 10);
	const days = $derived(trainedDays(store.logs));
	const streak = $derived(currentStreak(days, todayIso));
	// Days the plan marked skipped, so the streak read shows them as their own
	// state rather than as a plain miss.
	const skippedDays = $derived.by(() => {
		const out = new Set<string>();
		for (const w of store.plan?.weeks ?? []) {
			if (!w.startDate) continue;
			for (const s of w.sessions) {
				if (isSkipped(s.id)) out.add(addDaysIso(w.startDate, s.day));
			}
		}
		return out;
	});

	const best = $derived.by(() => {
		const sorted = [...days].sort();
		let best = 0;
		let run = 0;
		let prev: string | null = null;
		for (const iso of sorted) {
			run = prev && shift(prev, 1) === iso ? run + 1 : 1;
			best = Math.max(best, run);
			prev = iso;
		}
		return best;
	});

	function shift(iso: string, n: number): string {
		const d = new Date(`${iso}T00:00:00Z`);
		d.setUTCDate(d.getUTCDate() + n);
		return d.toISOString().slice(0, 10);
	}

	const spans = [
		{ weeks: 8, label: '8 weeks' },
		{ weeks: 26, label: '6 months' },
		{ weeks: 52, label: '1 year' },
	];
	let span = $state(26);
	const activeSpan = $derived(spans.find((s) => s.weeks === span) ?? spans[0]);
</script>

<MetricHeader eyebrow="Progress · Streak" title="Activity" {from} />

<Card>
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="tabular text-xs uppercase tracking-widest text-steel">Current streak</p>
			<p class="tabular mt-0.5 text-2xl font-semibold {streak > 0 ? 'text-ok' : 'text-steel'}">
				{streak}<span class="text-sm text-steel">&nbsp;{streak === 1 ? 'day' : 'days'}</span>
			</p>
		</div>
		{#if best > 0}
			<div class="text-right">
				<p class="tabular text-xs uppercase tracking-widest text-steel">Longest</p>
				<p class="tabular mt-0.5 text-lg text-steel">{best} {best === 1 ? 'day' : 'days'}</p>
			</div>
		{/if}
	</div>

	<div class="mt-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Timeline">
		{#each spans as s (s.weeks)}
			<button
				type="button"
				role="tab"
				aria-selected={span === s.weeks}
				onclick={() => (span = s.weeks)}
				class="rounded-md border px-3 py-1.5 text-xs font-medium {span === s.weeks
					? 'border-signal bg-signal-wash text-signal-ink'
					: 'border-hairline text-steel hover:border-signal'}"
			>
				{s.label}
			</button>
		{/each}
	</div>

	<div class="mt-5 overflow-x-auto pb-1">
		<ActivityHeatmap trainedDays={days} {skippedDays} weeks={span} {todayIso} cell={13} gap={3} showWeekdays showMonthLabels />
	</div>

	<div class="mt-4 flex items-center gap-3 text-xs text-steel">
		<span class="flex items-center gap-1.5">
			<span class="h-3 w-3 rounded-[2px] bg-hairline"></span> No training
		</span>
		<span class="flex items-center gap-1.5">
			<span class="h-3 w-3 rounded-[2px] bg-ok"></span> Trained
		</span>
		<span class="flex items-center gap-1.5">
			<span class="h-3 w-3 rounded-[2px] bg-steel"></span> Skipped
		</span>
		<span class="flex items-center gap-1.5">
			<span class="h-3 w-3 rounded-[2px] bg-signal-wash ring-1 ring-signal-ink"></span> Today
		</span>
	</div>
	<p class="mt-3 text-xs text-steel">
		Showing {activeSpan.label}. A filled square is a day you logged a session. A grey square is a day you skipped, which does not count as training. Rest days stay open on purpose.
	</p>
</Card>

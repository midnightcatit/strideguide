<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { store, ensurePlan } from '$lib/planStore.svelte';
	import { isSkipped } from '$lib/skipped.svelte';
	import { fmtDistance, sessionLabel } from '$lib/prefs.svelte';
	import { DAY_NAMES, addDaysIso, localIso } from '$lib/plan';
	import { metricOrigin } from '$lib/metrics';
	import Card from '$lib/components/Card.svelte';
	import MetricHeader from '$lib/components/MetricHeader.svelte';
	import SegmentedBar from '$lib/components/SegmentedBar.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';

	onMount(() => void ensurePlan());

	const from = $derived(metricOrigin(page.url.searchParams.get('from')));
	const todayIso = localIso();
	const weeks = $derived(store.plan?.weeks ?? []);
	const todayWeek = $derived(
		weeks.find((w) => w.startDate && w.endDate && todayIso >= w.startDate && todayIso <= w.endDate) ??
			weeks[0],
	);
	const loggedIds = $derived(new Set(store.logs.filter((l) => l.sessionId).map((l) => l.sessionId)));

	const rows = $derived.by(() => {
		if (!todayWeek?.startDate) return [];
		return todayWeek.sessions
			.map((s) => ({
				session: s,
				date: addDaysIso(todayWeek.startDate as string, s.day),
				done: loggedIds.has(s.id),
				skipped: !loggedIds.has(s.id) && isSkipped(s.id),
			}))
			.sort((a, b) => a.date.localeCompare(b.date));
	});
	const doneCount = $derived(rows.filter((r) => r.done).length);
	const skippedCount = $derived(rows.filter((r) => r.skipped).length);
	const percent = $derived(rows.length ? (doneCount / rows.length) * 100 : 0);
</script>

<MetricHeader title={todayWeek ? `Week ${todayWeek.weekNumber}` : 'This week'} {from} />

{#if !store.loaded}
	<p class="tabular text-sm text-steel">Loading…</p>
{:else if !rows.length}
	<Card>
		<p class="text-sm text-steel">No sessions on the plan this week.</p>
	</Card>
{:else}
	<Card>
		<div class="flex items-baseline justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">Sessions done</p>
			<p class="tabular text-sm font-semibold">{doneCount}<span class="text-steel">/{rows.length}</span>{#if skippedCount}<span class="text-steel"> · {skippedCount} skipped</span>{/if}</p>
		</div>
		<div class="mt-3">
			<SegmentedBar
				segments={rows.map((r) => ({ filled: r.done, skipped: r.skipped }))}
				{percent}
				size="lg"
				ariaLabel="{doneCount} of {rows.length} sessions done this week{skippedCount ? `, ${skippedCount} skipped` : ''}"
			/>
		</div>
		<p class="mt-2 text-xs text-steel">One section per planned session, filled when you log it. Grey means skipped.</p>
	</Card>

	<ul class="mt-4 divide-y divide-hairline">
		{#each rows as row (row.session.id)}
			<li class="flex items-center gap-3 py-3">
				<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {row.done ? 'bg-ok-wash text-ok-ink' : row.skipped ? 'bg-sunken text-steel ring-1 ring-hairline-strong' : 'bg-sunken text-steel'}">
					<SessionIcon type={row.session.type} size="h-4 w-4" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium">{sessionLabel(row.session)}</span>
					<span class="tabular block text-xs text-steel">
						{DAY_NAMES[row.session.day]}{row.date === todayIso ? ' · today' : ''}
					</span>
				</span>
				<span class="shrink-0 text-right">
					{#if row.session.modality === 'running' && row.session.prescription?.targetDistanceKm}
						<span class="tabular block text-sm">{fmtDistance(row.session.prescription.targetDistanceKm)}</span>
					{/if}
					<span class="text-[11px] {row.done ? 'text-ok-ink' : 'text-steel'}">{row.done ? 'Done' : row.skipped ? 'Skipped' : 'Not logged'}</span>
				</span>
			</li>
		{/each}
	</ul>
{/if}

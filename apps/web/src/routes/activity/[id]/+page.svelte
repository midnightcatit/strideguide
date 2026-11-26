<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { auth, ensureAuth } from '$lib/auth.svelte';
	import {
		type ClientActivity,
		activityModalityLabel,
		activityProviderLabel,
		activityTitle,
		formatDurationSeconds,
		sessionTypeLabel,
	} from '$lib/plan';
	import { fmtDistance, fmtPace } from '$lib/prefs.svelte';
	import ActivityCard from '$lib/components/ActivityCard.svelte';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	// An imported activity's own page. The API has no single-activity route, so
	// this reads the same list the day uses and picks the one by id. Listing is
	// idempotent (it only writes a log for an activity that lacks one), so a
	// deep link straight here is safe.
	const id = $derived(page.params.id ?? '');
	let activity = $state<ClientActivity | null>(null);
	let loading = $state(true);

	onMount(async () => {
		await ensureAuth();
		if (!auth.user) {
			loading = false;
			return;
		}
		try {
			const res = await api.activities();
			activity = res.activities.find((a) => a.id === id) ?? null;
		} catch {
			activity = null;
		} finally {
			loading = false;
		}
	});

	const started = $derived(activity ? new Date(activity.startedAt) : null);
	const dateLabel = $derived(
		started
			? started.toLocaleDateString(undefined, {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric',
				})
			: '',
	);
	const timeLabel = $derived(
		started ? started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '',
	);
	const pace = $derived(
		activity
			? (activity.avgPaceSecPerKm ??
				(activity.distanceM && activity.durationSec
					? Math.round(activity.durationSec / (activity.distanceM / 1000))
					: null))
			: null,
	);

	// One row per field the API actually returned. A null field is not shown, so
	// the list is exactly the stats this workout has.
	const stats = $derived.by<{ label: string; value: string }[]>(() => {
		const a = activity;
		if (!a) return [];
		const out: { label: string; value: string }[] = [];
		out.push({ label: 'Modality', value: activityModalityLabel(a.modality) });
		if (a.type) out.push({ label: 'Type', value: sessionTypeLabel(a.type) });
		if (dateLabel) out.push({ label: 'Date', value: timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel });
		if (a.durationSec) out.push({ label: 'Duration', value: formatDurationSeconds(a.durationSec) });
		if (a.distanceM) out.push({ label: 'Distance', value: fmtDistance(a.distanceM / 1000) });
		if (pace) out.push({ label: 'Average pace', value: fmtPace(pace) });
		if (a.avgHr) out.push({ label: 'Average heart rate', value: `${Math.round(a.avgHr)} bpm` });
		out.push({ label: 'Provider', value: activityProviderLabel(a.provider) });
		return out;
	});
</script>

{#if loading}
	<p class="tabular mt-6 text-sm text-steel">Loading…</p>
{:else if !activity}
	<Card tone="sunken" frame>
		<p class="text-sm text-steel">
			This workout is not in your imported activities. It may have been removed at the health app.
		</p>
	</Card>
{:else}
	<header class="mb-7">
		<p class="tabular text-xs uppercase tracking-widest text-steel">Imported workout</p>
		<h1 class="font-display mt-1 text-2xl font-bold">{activityTitle(activity)}</h1>
		{#if dateLabel}<p class="tabular mt-1 text-xs text-steel">{dateLabel}</p>{/if}
	</header>

	<ActivityCard activity={activity} eyebrow={timeLabel} />

	<SectionHeader id="activity-stats" eyebrow="All the details" />
	<Card frame class="mt-2">
		<dl class="divide-y divide-hairline">
			{#each stats as stat (stat.label)}
				<div class="flex items-baseline justify-between gap-3 py-2.5">
					<dt class="text-sm text-steel">{stat.label}</dt>
					<dd class="tabular text-sm font-medium">{stat.value}</dd>
				</div>
			{/each}
		</dl>
	</Card>
{/if}

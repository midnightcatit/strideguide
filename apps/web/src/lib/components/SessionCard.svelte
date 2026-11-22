<script lang="ts">
	import type { ClientLog, ClientSession } from '$lib/plan';
	import { formatDuration } from '$lib/plan';
	import { fmtDistance, fmtPace, fmtPaceBand, sessionLabel } from '$lib/prefs.svelte';
	import IntensityLadder from '$lib/components/IntensityLadder.svelte';

	let {
		session,
		eyebrow = '',
		active = false,
		logged = null,
		onLog,
		onStart,
	}: {
		session: ClientSession;
		eyebrow?: string;
		active?: boolean;
		logged?: ClientLog | null;
		onLog?: () => void;
		onStart?: () => void;
	} = $props();

	const p = $derived(session.prescription ?? {});
	const isRun = $derived(session.modality === 'running');
	const isStrength = $derived(session.modality === 'strength');
	const machines = $derived(p.blocks ?? []);
	const reps = $derived(machines[0]?.sets?.[0]?.reps ?? 0);
	const band = $derived(fmtPaceBand(p.targetPaceSecPerKm));
	const primary = $derived(
		isRun && p.targetDistanceKm != null
			? fmtDistance(p.targetDistanceKm)
			: isStrength
				? `${machines.length} machines`
				: (formatDuration(session.durationMin) ?? '–'),
	);
	const secondary = $derived(
		isStrength ? (reps ? `3 × ${reps}` : '3 sets') : (formatDuration(session.durationMin) ?? '–'),
	);

	const loggedLine = $derived.by(() => {
		if (!logged) return null;
		const sync = logged.pending ? ' · syncing' : '';
		if (isStrength && logged.strengthSets?.length) return `Logged · ${logged.strengthSets.length} machines${sync}`;
		if (logged.runStats?.distanceKm) {
			const pace = logged.runStats.avgPaceSecPerKm ? ` · ${fmtPace(logged.runStats.avgPaceSecPerKm)}` : '';
			return `Logged · ${fmtDistance(logged.runStats.distanceKm)}${pace}${sync}`;
		}
		return `Logged${sync}`;
	});
</script>

<article
	class="relative overflow-hidden rounded-xl border bg-paper p-4 sm:p-5 transition-colors {active
		? 'border-signal/50'
		: 'border-hairline'}"
>
	<!-- amber/steel session edge (left) -->
	<div class="absolute left-0 top-0 h-full w-0.5 {isStrength ? 'bg-steel' : 'bg-signal'}" aria-hidden="true"></div>

	<div class="flex items-baseline justify-between gap-3">
		<span class="flex items-center gap-2">
			<span class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</span>
			<IntensityLadder intensity={p.intensity} label={false} />
		</span>
		<span class="tabular text-xs uppercase tracking-widest {isStrength ? 'text-steel' : 'text-signal-ink'}"
			>{session.type}{#if logged} ✓{/if}</span
		>
	</div>

	<h2 class="font-display mt-1.5 text-lg font-medium leading-tight">{sessionLabel(session)}</h2>

	<hr class="my-3 border-hairline" />

	<div class="grid grid-cols-2 gap-3">
		<div>
			<p class="tabular text-2xl font-medium leading-none">{primary}</p>
			<p class="mt-1 text-xs text-steel">{isStrength ? 'circuit' : 'prescribed'}</p>
		</div>
		<div>
			<p class="tabular text-2xl font-medium leading-none">{secondary}</p>
			<p class="mt-1 text-xs text-steel">{isStrength ? 'sets × reps' : 'target'}</p>
		</div>
	</div>

	<hr class="my-3 border-hairline" />

	{#if loggedLine}
		<p class="tabular text-sm text-ink">{loggedLine}</p>
	{:else}
		<p class="tabular text-sm">
			{#if band}{band}{/if}
			{#if p.targetZone}<span class="text-steel"> · {p.targetZone}</span>{/if}
			{#if p.targetRpe}<span class="text-steel"> · RPE {p.targetRpe[0]}–{p.targetRpe[1]}</span>{/if}
			{#if session.type === 'race-pace'}<span class="text-signal-ink"> · at goal pace</span>{/if}
			{#if !band && !p.targetZone && !p.targetRpe}<span class="text-steel">Effort: see notes</span>{/if}
		</p>
	{/if}

	{#if isStrength && machines.length}
		<ul class="mt-3 space-y-1">
			{#each machines as block (block.machine)}
				<li class="flex justify-between text-sm">
					<span class="text-ink">{block.machine}</span>
					<span class="tabular text-steel">{block.sets?.[0]?.reps ?? 10} reps × {block.sets?.length ?? 3}</span>
				</li>
			{/each}
		</ul>
	{/if}

	<div class="mt-4 flex gap-2">
		{#if onStart && session.prescription?.workout}
			<button
				type="button"
				onclick={onStart}
				class="flex-1 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper hover:opacity-90"
			>
				Start
			</button>
		{/if}
		{#if onLog}
			<button
				type="button"
				onclick={onLog}
				class="flex-1 rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink"
			>
				{logged ? 'Log again' : 'Log it'}
			</button>
		{/if}
	</div>
</article>

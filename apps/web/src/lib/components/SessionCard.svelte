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
		onOpen,
	}: {
		session: ClientSession;
		eyebrow?: string;
		active?: boolean;
		logged?: ClientLog | null;
		onLog?: () => void;
		onStart?: () => void;
		onOpen?: () => void;
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
	// One line for every card, so run and strength cards stay the same height.
	const metaLine = $derived.by(() => {
		if (logged) {
			const sync = logged.pending ? ' · syncing' : '';
			if (isStrength && logged.strengthSets?.length) return `Logged · ${logged.strengthSets.length} machines${sync}`;
			if (logged.runStats?.distanceKm) {
				const pace = logged.runStats.avgPaceSecPerKm ? ` · ${fmtPace(logged.runStats.avgPaceSecPerKm)}` : '';
				return `Logged · ${fmtDistance(logged.runStats.distanceKm)}${pace}${sync}`;
			}
			return `Logged${sync}`;
		}
		if (isStrength && machines.length) return machines.map((m) => m.machine).join(' · ');
		const bits: string[] = [];
		if (band) bits.push(band);
		if (p.targetZone) bits.push(p.targetZone);
		if (p.targetRpe) bits.push(`RPE ${p.targetRpe[0]}–${p.targetRpe[1]}`);
		if (session.type === 'race-pace') bits.push('at goal pace');
		return bits.join(' · ') || 'Effort: see detail';
	});
</script>

<article
	class="stage-card lift relative overflow-hidden rounded-xl border bg-paper p-4 sm:p-5 {active
		? 'border-signal-ink'
		: 'border-hairline'}"
>
	<div
		class="absolute left-0 top-0 h-full w-0.5 {logged
			? 'bg-ok'
			: isStrength
				? 'bg-steel'
				: 'bg-signal-ink'} {active && !logged ? 'breathe' : ''}"
		aria-hidden="true"
	></div>

	{#if onOpen}
		<button
			type="button"
			class="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-ink"
			aria-label="Open {sessionLabel(session)} details"
			onclick={onOpen}
		></button>
	{/if}

	<div class="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col">
		<div class="flex items-baseline justify-between gap-3">
			<span class="flex min-w-0 items-center gap-2">
				<span class="tabular truncate text-xs uppercase tracking-widest text-steel">{eyebrow}</span>
				<IntensityLadder intensity={p.intensity} label={false} />
			</span>
			<span class="tabular shrink-0 text-xs uppercase tracking-widest {isStrength ? 'text-steel' : 'text-signal-ink'}"
				>{session.type}{#if logged} <span class="text-ok">✓</span>{/if}</span
			>
		</div>

		<h2 class="font-display mt-1.5 truncate text-lg font-medium leading-tight">{sessionLabel(session)}</h2>

		<hr class="my-3 border-hairline" />

		<div class="grid grid-cols-2 gap-3">
			<div class="min-w-0">
				<p class="tabular truncate text-2xl font-medium leading-none">{primary}</p>
				<p class="mt-1 text-xs text-steel">{isStrength ? 'circuit' : 'prescribed'}</p>
			</div>
			<div class="min-w-0">
				<p class="tabular truncate text-2xl font-medium leading-none">{secondary}</p>
				<p class="mt-1 text-xs text-steel">{isStrength ? 'sets × reps' : 'target'}</p>
			</div>
		</div>

		<hr class="my-3 border-hairline" />

		<p class="tabular mt-auto truncate pt-3 text-sm {logged ? 'text-ink' : 'text-steel'}">{metaLine}</p>
	</div>

	<div class="relative z-20 mt-4 flex shrink-0 gap-2">
		{#if onStart && session.prescription?.workout}
			<button
				type="button"
				onclick={onStart}
				class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90"
			>
				Start
			</button>
		{/if}
		{#if onLog}
			<button
				type="button"
				onclick={onLog}
				class="flex-1 rounded-md border border-hairline-strong px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
			>
				{logged ? 'Log again' : 'Log it'}
			</button>
		{/if}
	</div>
</article>

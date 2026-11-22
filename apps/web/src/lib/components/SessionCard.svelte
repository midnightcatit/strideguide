<script lang="ts">
	import type { ClientLog, ClientSession } from '$lib/plan';
	import { formatDuration, modalityLabel } from '$lib/plan';
	import { fmtDistance, fmtPace, fmtPaceBand } from '$lib/prefs.svelte';

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

	let expanded = $state(false);

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
				: (formatDuration(session.durationMin) ?? '—'),
	);
	const secondary = $derived(
		isStrength ? (reps ? `3 × ${reps}` : '3 sets') : (formatDuration(session.durationMin) ?? '—'),
	);

	const loggedLine = $derived.by(() => {
		if (!logged) return null;
		const sync = logged.pending ? ' · syncing' : '';
		if (isStrength && logged.strengthSets?.length) {
			return `Logged · ${logged.strengthSets.length} machines${sync}`;
		}
		if (logged.runStats?.distanceKm) {
			const pace = logged.runStats.avgPaceSecPerKm ? ` · ${fmtPace(logged.runStats.avgPaceSecPerKm)}` : '';
			return `Logged · ${fmtDistance(logged.runStats.distanceKm)}${pace}${sync}`;
		}
		return `Logged${sync}`;
	});
</script>

<article
	class="relative overflow-hidden rounded-xl border bg-paper transition-colors {active
		? 'border-signal/60'
		: 'border-hairline'}"
>
	<!-- signature: amber modality edge (fills to solid when logged) -->
	<div
		class="absolute right-0 top-0 h-full w-1.5 {isStrength ? 'bg-steel' : 'bg-signal'} {logged
			? ''
			: 'opacity-100'}"
		aria-hidden="true"
	></div>

	<div class="p-4">
		<div class="flex items-baseline justify-between gap-3">
			<span class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</span>
			<span class="tabular text-xs uppercase tracking-widest {isStrength ? 'text-steel' : 'text-signal-ink'}"
				>{session.type}{#if logged} ✓{/if}</span
			>
		</div>

		<h2 class="font-display mt-1 text-lg font-medium leading-tight">
			{session.title ?? modalityLabel(session.modality)}
		</h2>

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
				{#if !band && !p.targetZone && !p.targetRpe}<span class="text-steel">Effort: see notes</span>{/if}
			</p>
		{/if}

		{#if session.purpose}
			<p class="mt-3 text-sm text-steel">{session.purpose}</p>
		{/if}

		<div class="mt-3 flex items-center justify-between">
			<button
				type="button"
				onclick={() => (expanded = !expanded)}
				aria-expanded={expanded}
				class="text-sm text-signal-ink hover:underline"
			>
				{expanded ? 'Show less ▴' : 'Why this? ▾'}
			</button>
			<div class="flex gap-2">
				{#if onStart && session.prescription?.workout}
					<button
						type="button"
						onclick={onStart}
						class="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
					>
						Start
					</button>
				{/if}
				{#if onLog}
					<button
						type="button"
						onclick={onLog}
						class="rounded-md border border-hairline px-3 py-2 text-sm hover:border-signal hover:text-signal-ink"
					>
						{logged ? 'Log again' : 'Log it'}
					</button>
				{/if}
			</div>
		</div>

		{#if expanded}
			<div class="mt-3 space-y-2 border-t border-hairline pt-3 text-sm text-steel">
				{#if isStrength && machines.length}
					<ul class="space-y-1">
						{#each machines as block (block.machine)}
							<li class="flex justify-between tabular">
								<span class="text-ink">{block.machine}</span>
								<span>{block.sets?.[0]?.reps ?? '—'} reps × {block.sets?.length ?? 0}</span>
							</li>
						{/each}
					</ul>
				{/if}
				{#if p.notes}<p>{p.notes}</p>{/if}
				<p class="text-xs">Sources and the full deep-dive arrive with the knowledge base (M3).</p>
			</div>
		{/if}
	</div>
</article>

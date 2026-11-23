<script lang="ts">
	import { SHORT_WHY, type MachineExercise } from '@strideguide/shared/plan';
	import type { ClientSession } from '$lib/plan';
	import { sessionDrills } from '$lib/plan';
	import { fmtDistance, fmtPaceBand, sessionLabel } from '$lib/prefs.svelte';
	import IntensityLadder from '$lib/components/IntensityLadder.svelte';
	import MoveList from '$lib/components/MoveList.svelte';
	import DrillList from '$lib/components/DrillList.svelte';
	import { modal } from '$lib/actions';

	/**
	 * The Preview sheet: a bottom sheet that opens from the drill-down card. A
	 * strength session shows its move list, plus the warm-up drills and the
	 * stretches that carry a demo, each one expandable. A run with no moves shows
	 * an overview instead: what the session is, what it is for, and what to
	 * expect, all in the runner's own units.
	 */
	let {
		session,
		machines,
		onClose,
	}: {
		session: ClientSession;
		machines: MachineExercise[];
		onClose: () => void;
	} = $props();

	const p = $derived(session.prescription ?? {});
	const workout = $derived(p.workout);
	const dist = $derived(p.targetDistanceKm ?? workout?.totalDistanceKm);
	const band = $derived(fmtPaceBand(p.targetPaceSecPerKm));
	const minutes = $derived(session.durationMin ?? workout?.estimatedDurationMin);
	const lead = $derived(SHORT_WHY[session.type as keyof typeof SHORT_WHY] ?? session.purpose ?? '');
	const hasMoves = $derived(machines.length > 0);
	const moveHeading = $derived(session.type === 'machine-circuit' ? 'The machines' : 'The moves');
	const drills = $derived(sessionDrills(workout));
</script>

<div
	class="fixed inset-0 z-[60] flex items-end justify-center"
	role="dialog"
	aria-modal="true"
	aria-label={`Preview of ${sessionLabel(session)}`}
	use:modal={onClose}
>
	<button type="button" aria-label="Close preview" onclick={onClose} class="overlay-fade absolute inset-0 bg-ink/40"></button>
	<div
		class="sheet-in relative max-h-[85vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl border-t border-hairline bg-paper px-4 pb-8 pt-3"
	>
		<div class="mx-auto mb-2 h-1 w-10 rounded-full bg-hairline" aria-hidden="true"></div>
		<div class="flex items-start justify-between gap-3">
			<div>
				<p class="tabular text-xs uppercase tracking-widest text-steel">Preview</p>
				<h2 class="mt-0.5 font-display text-lg font-medium">{sessionLabel(session)}</h2>
			</div>
			<button type="button" onclick={onClose} aria-label="Close preview" class="-mr-1 rounded-full px-3 py-1 text-steel hover:text-ink">
				✕
			</button>
		</div>

		{#if hasMoves}
			<h3 class="mt-4 tabular text-xs uppercase tracking-widest text-steel">{moveHeading}</h3>
			<p class="mt-1 text-sm text-steel">Tap a move to see how it looks and the cues that matter.</p>
			<div class="mt-2"><MoveList {machines} /></div>
		{:else}
			{#if p.summary}
				<p class="mt-3 text-[15px] leading-relaxed">{p.summary}</p>
			{/if}
			{#if lead}
				<h3 class="mt-4 tabular text-xs uppercase tracking-widest text-steel">What it is for</h3>
				<p class="mt-1 text-[15px] leading-relaxed text-signal-ink">{lead}</p>
			{/if}

			<h3 class="mt-4 tabular text-xs uppercase tracking-widest text-steel">What to expect</h3>
			<dl class="mt-2 divide-y divide-hairline">
				{#if dist}
					<div class="flex items-baseline justify-between gap-3 py-2 text-sm">
						<dt class="text-steel">Distance</dt>
						<dd class="tabular">{fmtDistance(dist)}</dd>
					</div>
				{/if}
				{#if minutes}
					<div class="flex items-baseline justify-between gap-3 py-2 text-sm">
						<dt class="text-steel">Time</dt>
						<dd class="tabular">about {minutes} min</dd>
					</div>
				{/if}
				{#if band}
					<div class="flex items-baseline justify-between gap-3 py-2 text-sm">
						<dt class="text-steel">Pace</dt>
						<dd class="tabular">{band}</dd>
					</div>
				{/if}
				<div class="flex items-baseline justify-between gap-3 py-2 text-sm">
					<dt class="text-steel">Effort</dt>
					<dd class="flex items-center gap-2">
						<IntensityLadder intensity={p.intensity} />
						{#if p.targetZone}<span class="tabular text-steel">{p.targetZone}</span>{/if}
					</dd>
				</div>
			</dl>
			<p class="mt-3 text-xs text-steel">This is the shape of the session. The guided player walks you through each part when you start.</p>
		{/if}

		{#if drills.warmups.length}
			<h3 class="mt-5 tabular text-xs uppercase tracking-widest text-steel">Warm-ups</h3>
			<p class="mt-1 text-sm text-steel">Tap a drill to see how it looks and the cues that matter.</p>
			<div class="mt-2"><DrillList drills={drills.warmups} /></div>
		{/if}

		{#if drills.stretches.length}
			<h3 class="mt-5 tabular text-xs uppercase tracking-widest text-steel">Stretches</h3>
			<p class="mt-1 text-sm text-steel">Tap a stretch to see how it looks and the cues that matter.</p>
			<div class="mt-2"><DrillList drills={drills.stretches} /></div>
		{/if}
	</div>
</div>

<style>
	.sheet-in {
		animation: sheet-up 0.22s ease-out;
	}
	@media (prefers-reduced-motion: reduce) {
		.sheet-in {
			animation: none;
		}
	}
	@keyframes sheet-up {
		from {
			transform: translateY(12%);
			opacity: 0.6;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { Drill, MachineExercise, MoveMedia } from '@strideguide/shared/plan';
	import MoveDemo from '$lib/components/MoveDemo.svelte';

	/**
	 * The form sheet: a bottom sheet opened from the in-progress player so a move,
	 * warm-up drill or stretch can be checked mid-workout. Shows the demo, what it
	 * works, the cues and the common mistakes. Dismiss with the backdrop, the
	 * close button, or Escape.
	 */
	let {
		move,
		drill,
		media,
		onClose,
	}: {
		move?: MachineExercise;
		drill?: Drill;
		media?: MoveMedia;
		onClose: () => void;
	} = $props();

	const name = $derived(move?.name ?? drill?.name ?? '');

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div class="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`${name} form`}>
	<button class="absolute inset-0 h-full w-full bg-ink/40" aria-label="Close form" onclick={onClose}
	></button>
	<div
		class="sheet-in absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-hairline bg-paper px-4 pb-8 pt-3 shadow-xl"
	>
		<div class="mx-auto mb-2 h-1 w-10 rounded-full bg-hairline" aria-hidden="true"></div>
		<div class="flex items-start justify-between gap-3">
			<h2 class="font-display text-lg font-medium">{name}</h2>
			<button
				type="button"
				onclick={onClose}
				aria-label="Close form"
				class="-mr-1 rounded-full px-3 py-1 text-steel hover:text-ink"
			>
				✕
			</button>
		</div>

		{#if media}
			<div class="mt-3"><MoveDemo {media} {name} /></div>
		{/if}

		{#if move}
			<p class="mt-3 text-sm text-steel"><span class="text-ink">Muscles:</span> {move.muscles.join(', ')}</p>
			<p class="mt-1 text-sm text-steel"><span class="text-ink">Feel it:</span> {move.feel}</p>
			<p class="mt-3 tabular text-xs uppercase tracking-widest text-steel">Form</p>
			<ul class="mt-1 space-y-1 text-sm">
				{#each move.form as cue (cue)}<li class="flex gap-2"><span class="text-steel">·</span><span>{cue}</span></li>{/each}
			</ul>
			<p class="mt-2 text-xs text-steel">Avoid: {move.mistakes.join('; ').toLowerCase()}.</p>
		{:else if drill}
			<p class="mt-3 text-sm leading-relaxed">{drill.why}</p>
			<p class="mt-1 text-sm text-steel">{drill.feel} Targets {drill.targets.join(', ')}.</p>
			<p class="mt-3 tabular text-xs uppercase tracking-widest text-steel">Form</p>
			<ul class="mt-1 space-y-1 text-sm">
				{#each drill.form as cue (cue)}<li class="flex gap-2"><span class="text-steel">·</span><span>{cue}</span></li>{/each}
			</ul>
			<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">Watch for</p>
			<ul class="mt-1 space-y-1 text-sm text-steel">
				{#each drill.mistakes as m (m)}<li class="flex gap-2"><span aria-hidden="true">·</span><span>{m}</span></li>{/each}
			</ul>
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

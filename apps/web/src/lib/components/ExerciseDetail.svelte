<script lang="ts">
	import type { MoveMedia } from '@strideguide/shared/plan';
	import MoveDemo from '$lib/components/MoveDemo.svelte';

	/**
	 * The shared detail for a drill or a move: its demo when we have one, what it
	 * works, its technique cues and what to watch for. Used by the warm-up and
	 * stretch list, the move list and the session structure, so a drill or a move
	 * reads the same wherever it appears.
	 */
	let {
		name,
		media,
		why,
		works,
		form,
		mistakes,
		avoidLabel = 'Watch for',
	}: {
		name: string;
		/** The two-pose demo, when the library has one. */
		media?: MoveMedia;
		/** One plain sentence on why the drill or move helps running. */
		why: string;
		/** The plain line on what it works and where you feel it. */
		works: string;
		form: string[];
		mistakes: string[];
		/** Heading for the mistakes list: "Watch for" for drills, "Avoid" for moves. */
		avoidLabel?: string;
	} = $props();
</script>

<div class="pb-3 pt-1">
	{#if media}
		<div class="mb-3"><MoveDemo {media} {name} /></div>
	{/if}
	<p class="text-sm leading-relaxed">{why}</p>
	<p class="mt-2 text-sm leading-relaxed text-steel">{works}</p>
	<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">Form</p>
	<ul class="mt-1 space-y-1 text-sm">
		{#each form as f (f)}<li class="flex gap-2"><span class="text-steel">·</span><span>{f}</span></li>{/each}
	</ul>
	<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">{avoidLabel}</p>
	<ul class="mt-1 space-y-1 text-sm text-steel">
		{#each mistakes as m (m)}<li class="flex gap-2"><span aria-hidden="true">·</span><span>{m}</span></li>{/each}
	</ul>
</div>

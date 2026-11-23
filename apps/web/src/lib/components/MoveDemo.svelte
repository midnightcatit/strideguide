<script lang="ts">
	import { onMount } from 'svelte';
	import type { MoveMedia } from '@strideguide/shared/plan';

	/**
	 * A movement demo from two still frames. Only two poses exist per move, so the
	 * motion is implied: the end pose cross-fades in over the start pose, holding
	 * at each end, so the pair reads like a short looping clip. It runs on CSS
	 * keyframes, keeps working offline, and adds no runtime JavaScript. With
	 * reduced motion, playback turns into a manual start/finish toggle.
	 */
	let {
		media,
		name,
	}: {
		media: MoveMedia;
		name: string;
	} = $props();

	let playing = $state(true);
	let showEnd = $state(false);
	let reduced = $state(false);

	onMount(() => {
		reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	const animated = $derived(!!media.end && !reduced);
</script>

<figure class="demo">
	<div
		class="frame-wrap"
		class:playing={playing && animated}
		class:show-end={showEnd}
		role="img"
		aria-label={`${name}, movement demonstration`}
	>
		<img class="frame a" src={media.start} alt="" loading="lazy" decoding="async" />
		{#if media.end}
			<img class="frame b" src={media.end} alt="" loading="lazy" decoding="async" />
		{/if}
	</div>

	<div class="mt-2 flex items-center justify-between gap-3">
		{#if media.end}
			<button
				type="button"
				onclick={() => (reduced ? (showEnd = !showEnd) : (playing = !playing))}
				class="rounded-full border border-hairline px-3 py-1 text-xs text-steel hover:border-steel hover:text-ink"
			>
				{#if reduced}
					{showEnd ? 'Show start' : 'Show finish'}
				{:else}
					{playing ? 'Pause' : 'Play'}
				{/if}
			</button>
		{:else}
			<span class="text-xs text-steel">One position for this move</span>
		{/if}
		{#if media.credit}
			<span class="text-[0.6875rem] text-steel">Demo: {media.credit}</span>
		{/if}
	</div>
</figure>

<style>
	.frame-wrap {
		position: relative;
		width: 100%;
		max-width: 260px;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: 0.75rem;
		background: var(--color-sunken, #f1f1f3);
	}
	.frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	/*
	 * The end pose sits on top and fades in over the start pose, then back out,
	 * so the two frames read as one short looping clip instead of a wipe.
	 */
	.b {
		opacity: 0;
	}
	.playing .b {
		animation: demo-crossfade 3s var(--ease-in-out) infinite;
	}
	/* Hold each pose, ease across to the other, then hold again at the far end. */
	@keyframes demo-crossfade {
		0%,
		12% {
			opacity: 0;
		}
		42%,
		58% {
			opacity: 1;
		}
		88%,
		100% {
			opacity: 0;
		}
	}

	/* Manual start/finish toggle (reduced motion). */
	.show-end .b {
		opacity: 1;
	}
</style>

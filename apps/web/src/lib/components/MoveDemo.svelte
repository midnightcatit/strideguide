<script lang="ts">
	import { onMount } from 'svelte';
	import type { MoveMedia } from '@strideguide/shared/plan';

	/**
	 * A movement demo from two still frames. Only two poses exist per move, so the
	 * motion is implied: the end pose is revealed with a short, eased directional
	 * wipe that lands in the direction the body moves, with a brief hold at each
	 * end. This reads as movement far better than a plain dissolve, keeps working
	 * offline and adds no runtime JavaScript. With reduced motion, playback turns
	 * into a manual start/end toggle.
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
		class="frame-wrap motion-{media.motion}"
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
	.b {
		opacity: 0;
		clip-path: inset(0 0 100% 0);
	}
	/* Directional reveal, matching how the body actually travels. */
	.motion-horizontal .b {
		clip-path: inset(0 100% 0 0);
	}
	.motion-fade .b {
		clip-path: none;
	}

	/* Eased wipe out and back, with a hold at each end. */
	.playing .b {
		animation: reveal 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}
	.playing.motion-horizontal .b {
		animation-name: reveal-x;
	}
	.playing.motion-fade .b {
		animation-name: reveal-fade;
	}

	@keyframes reveal {
		0%,
		12% {
			clip-path: inset(0 0 100% 0);
			opacity: 0;
		}
		45%,
		55% {
			clip-path: inset(0 0 0 0);
			opacity: 1;
		}
		88%,
		100% {
			clip-path: inset(0 0 100% 0);
			opacity: 0;
		}
	}
	@keyframes reveal-x {
		0%,
		12% {
			clip-path: inset(0 100% 0 0);
			opacity: 0;
		}
		45%,
		55% {
			clip-path: inset(0 0 0 0);
			opacity: 1;
		}
		88%,
		100% {
			clip-path: inset(0 100% 0 0);
			opacity: 0;
		}
	}
	@keyframes reveal-fade {
		0%,
		12% {
			opacity: 0;
		}
		45%,
		55% {
			opacity: 1;
		}
		88%,
		100% {
			opacity: 0;
		}
	}

	/* Manual start/end toggle (reduced motion). */
	.show-end .b {
		opacity: 1;
		clip-path: none;
	}
</style>

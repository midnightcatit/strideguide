<script lang="ts">
	/**
	 * A movement demo from two still frames. It cross-fades between the start and
	 * end positions to imply the motion, which keeps it fully offline and costs no
	 * runtime JavaScript. With reduced motion it shows a single frame.
	 */
	let {
		media,
		name,
	}: {
		media: { start: string; end?: string; credit?: string };
		name: string;
	} = $props();
</script>

<figure class="demo" class:animate={!!media.end}>
	<div class="frame-wrap" role="img" aria-label={`${name}, movement demonstration`}>
		<img class="frame a" src={media.start} alt="" loading="lazy" decoding="async" />
		{#if media.end}
			<img class="frame b" src={media.end} alt="" loading="lazy" decoding="async" />
		{/if}
	</div>
	{#if media.credit}
		<figcaption class="mt-1.5 text-[0.6875rem] text-steel">Demo frames: {media.credit}</figcaption>
	{/if}
</figure>

<style>
	.frame-wrap {
		position: relative;
		width: 100%;
		max-width: 240px;
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
	}
	.animate .a {
		animation: frame-a 2.6s ease-in-out infinite;
	}
	.animate .b {
		animation: frame-b 2.6s ease-in-out infinite;
	}
	@keyframes frame-a {
		0%,
		42% {
			opacity: 1;
		}
		58%,
		100% {
			opacity: 0;
		}
	}
	@keyframes frame-b {
		0%,
		42% {
			opacity: 0;
		}
		58%,
		100% {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.animate .a,
		.animate .b {
			animation: none;
		}
		.animate .b {
			opacity: 0;
		}
	}
</style>

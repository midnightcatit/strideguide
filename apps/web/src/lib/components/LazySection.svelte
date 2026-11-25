<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Mount its content only once it is about to enter the viewport, so a long
	 * page of charts does not build every chart on load. The wrapper reserves a
	 * little height so the scroll position stays roughly right until the real
	 * content arrives; a browser without IntersectionObserver mounts at once.
	 */
	let { children }: { children: Snippet } = $props();

	let el = $state<HTMLDivElement | undefined>(undefined);
	let shown = $state(false);

	$effect(() => {
		if (shown || !el) return;
		if (typeof IntersectionObserver === 'undefined') {
			shown = true;
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					shown = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '300px 0px' },
		);
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

<div bind:this={el} style={shown ? undefined : 'min-height: 12rem'}>
	{#if shown}{@render children()}{/if}
</div>

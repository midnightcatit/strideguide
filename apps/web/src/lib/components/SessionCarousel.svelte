<script lang="ts" generics="T extends { id: string }">
	import type { Snippet } from 'svelte';

	/**
	 * A horizontal scroll of same-width cards for one day. It is generic over the
	 * item, so a day can hold the planned sessions and the imported activities in
	 * one scroll; each item only has to carry an id. The caller draws each card
	 * through the `card` snippet, so the carousel knows nothing about card shape.
	 */
	let {
		items,
		card,
		revealId = $bindable<string | null>(null),
		label = 'workouts',
	}: {
		items: T[];
		card: Snippet<[T]>;
		revealId?: string | null;
		label?: string;
	} = $props();

	let active = $state(0);
	let el = $state<HTMLDivElement | undefined>(undefined);

	// Smooth scrolling is a nicety, not the point, so it steps aside when the
	// runner has asked for less motion.
	function scrollBehavior(): ScrollBehavior {
		return typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
			? 'auto'
			: 'smooth';
	}

	function onScroll(e: Event) {
		const node = e.currentTarget as HTMLElement;
		const step = node.scrollWidth / Math.max(1, items.length);
		active = Math.min(items.length - 1, Math.max(0, Math.round(node.scrollLeft / step)));
	}

	function onKeydown(e: KeyboardEvent) {
		if (!el) return;
		const step = el.clientWidth * 0.9;
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			el.scrollBy({ left: step, behavior: scrollBehavior() });
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			el.scrollBy({ left: -step, behavior: scrollBehavior() });
		}
	}

	// Bring a named item into view once it is on screen. The caller sets revealId
	// to a session it just added; the effect waits until that item is in the list
	// and its card is rendered, then scrolls the nearest edge into view (a no-op
	// when it is already visible). It clears revealId afterwards so a later list
	// change does not move the page again.
	$effect(() => {
		const id = revealId;
		void items.length;
		if (!id || !el) return;
		const node = el.querySelector(`[data-item-id="${CSS.escape(id)}"]`);
		if (!node) return;
		node.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest', inline: 'nearest' });
		revealId = null;
	});
</script>

{#if items.length === 0}
	<!-- nothing -->
{:else if items.length === 1}
	{@render card(items[0]!)}
{:else}
	<!-- A scrollable region with arrow-key support; the ignore rules do not model that. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={el}
		class="scroll-modern flex select-none snap-x snap-mandatory items-stretch gap-3 overflow-x-auto -mx-4 px-4 pb-2 sm:mx-0 sm:px-0"
		role="region"
		tabindex="0"
		aria-label="{items.length} {label} today, use the arrow keys to scroll"
		onkeydown={onKeydown}
		onscroll={onScroll}
	>
		{#each items as item, i (item.id)}
			<div
				data-item-id={item.id}
				class="reveal w-[calc(100vw-68px)] max-w-[360px] shrink-0 snap-center sm:w-[24rem] sm:max-w-none"
				style="animation-delay: {i * 45}ms"
			>
				{@render card(item)}
			</div>
		{/each}
	</div>
	<div class="mt-2 flex justify-center gap-1 sm:hidden" aria-hidden="true">
		{#each items as item, i (item.id)}
			<span class="h-1 w-4 rounded-full {i === active ? 'bg-ink' : 'bg-hairline'}"></span>
		{/each}
	</div>
{/if}

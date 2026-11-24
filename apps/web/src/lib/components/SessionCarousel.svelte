<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClientSession } from '$lib/plan';

	let {
		sessions,
		card,
	}: {
		sessions: ClientSession[];
		card: Snippet<[ClientSession]>;
	} = $props();

	let active = $state(0);
	let el = $state<HTMLDivElement | undefined>(undefined);

	function onScroll(e: Event) {
		const node = e.currentTarget as HTMLElement;
		const step = node.scrollWidth / Math.max(1, sessions.length);
		active = Math.min(sessions.length - 1, Math.max(0, Math.round(node.scrollLeft / step)));
	}

	function onKeydown(e: KeyboardEvent) {
		if (!el) return;
		const step = el.clientWidth * 0.9;
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			el.scrollBy({ left: step, behavior: 'smooth' });
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			el.scrollBy({ left: -step, behavior: 'smooth' });
		}
	}
</script>

{#if sessions.length === 0}
	<!-- nothing -->
{:else if sessions.length === 1}
	{@render card(sessions[0]!)}
{:else}
	<!-- A scrollable region with arrow-key support; the ignore rules do not model that. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={el}
		class="scroll-modern flex select-none snap-x snap-mandatory items-stretch gap-3 overflow-x-auto -mx-4 px-4 pb-2 sm:mx-0 sm:px-0"
		role="region"
		tabindex="0"
		aria-label="{sessions.length} sessions today, use the arrow keys to scroll"
		onkeydown={onKeydown}
		onscroll={onScroll}
	>
		{#each sessions as s, i (s.id)}
			<div
				class="reveal w-[calc(100vw-68px)] max-w-[360px] shrink-0 snap-center sm:w-[24rem] sm:max-w-none"
				style="animation-delay: {i * 45}ms"
			>
				{@render card(s)}
			</div>
		{/each}
	</div>
	<div class="mt-2 flex justify-center gap-1 sm:hidden" aria-hidden="true">
		{#each sessions as s, i (s.id)}
			<span class="h-1 w-4 rounded-full {i === active ? 'bg-ink' : 'bg-hairline'}"></span>
		{/each}
	</div>
{/if}

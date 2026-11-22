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

	function onScroll(e: Event) {
		const el = e.currentTarget as HTMLElement;
		const step = el.scrollWidth / Math.max(1, sessions.length);
		active = Math.min(sessions.length - 1, Math.max(0, Math.round(el.scrollLeft / step)));
	}
</script>

{#if sessions.length === 0}
	<!-- nothing -->
{:else if sessions.length === 1}
	{@render card(sessions[0]!)}
{:else}
	<div
		class="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:px-0"
		role="group"
		aria-label="{sessions.length} sessions today, scroll for more"
		onscroll={onScroll}
	>
		{#each sessions as s (s.id)}
			<div class="w-[calc(100vw-68px)] max-w-[322px] shrink-0 snap-center sm:w-auto sm:max-w-none">
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

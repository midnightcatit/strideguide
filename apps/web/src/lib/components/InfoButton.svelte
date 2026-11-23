<script lang="ts">
	import { onMount } from 'svelte';
	import { closeInfo, isInfoOpen, toggleInfo } from '$lib/infoPopover.svelte';

	let { term, definition }: { term: string; definition: string } = $props();

	const id = crypto.randomUUID();
	const open = $derived(isInfoOpen(id));
	let root = $state<HTMLElement | undefined>(undefined);

	// Tap outside (anywhere not in this button or its card) closes it, and Escape
	// closes it. Because the open id is shared, opening another closes this one.
	onMount(() => {
		function onPointerDown(e: PointerEvent) {
			if (!open) return;
			if (root && !root.contains(e.target as Node)) closeInfo();
		}
		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && open) closeInfo();
		}
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeydown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeydown);
		};
	});
</script>

<span bind:this={root} class="relative inline-flex">
	<button
		type="button"
		aria-label="What does {term} mean?"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			toggleInfo(id);
		}}
		class="pointer-events-auto relative z-20 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-hairline-strong text-[10px] font-medium leading-none text-steel hover:border-signal hover:text-signal-ink"
	>
		i
	</button>
	{#if open}
		<span
			role="tooltip"
			class="absolute left-0 top-6 z-30 block w-64 rounded-lg border border-hairline bg-paper p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg"
		>
			<span class="flex items-start justify-between gap-2">
				<strong class="font-semibold">{term}.</strong>
				<button
					type="button"
					aria-label="Close"
					onclick={(e) => {
						e.stopPropagation();
						closeInfo();
					}}
					class="pointer-events-auto -mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink"
				>
					✕
				</button>
			</span>
			{definition}
		</span>
	{/if}
</span>

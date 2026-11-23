<script lang="ts">
	import { onMount } from 'svelte';
	import { closeInfo, isInfoOpen, toggleInfo } from '$lib/infoPopover.svelte';

	let { term, definition }: { term: string; definition: string } = $props();

	const id = crypto.randomUUID();
	const open = $derived(isInfoOpen(id));
	let btn = $state<HTMLElement | undefined>(undefined);
	let pos = $state({ top: 0, left: 0, width: 288 });

	// The card is fixed to the viewport and clamped inside it, so it never runs off
	// the screen or makes the page scroll. It flips above the button when there is
	// no room below, and scrolls inside itself if the text is tall.
	function place() {
		if (!btn) return;
		const r = btn.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const width = Math.min(288, vw - 16);
		let left = r.left;
		if (left + width > vw - 8) left = vw - 8 - width;
		if (left < 8) left = 8;
		const estimated = 150;
		let top = r.bottom + 6;
		if (top + estimated > vh - 8 && r.top - 6 - estimated > 8) top = r.top - 6 - estimated;
		pos = { top, left, width };
	}

	$effect(() => {
		if (open) place();
	});

	onMount(() => {
		function onPointerDown(e: PointerEvent) {
			if (!open) return;
			const target = e.target as Node;
			if (btn && !btn.contains(target) && !(target instanceof Element && target.closest('[data-info-popover]'))) {
				closeInfo();
			}
		}
		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && open) closeInfo();
		}
		function onReflow() {
			if (open) place();
		}
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeydown);
		window.addEventListener('resize', onReflow);
		window.addEventListener('scroll', onReflow, true);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeydown);
			window.removeEventListener('resize', onReflow);
			window.removeEventListener('scroll', onReflow, true);
		};
	});
</script>

<span bind:this={btn} class="relative inline-flex">
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
</span>

{#if open}
	<div
		data-info-popover
		role="tooltip"
		class="fixed z-[60] block max-h-[60vh] overflow-y-auto rounded-lg border border-hairline bg-paper p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg"
		style="top: {pos.top}px; left: {pos.left}px; width: {pos.width}px"
	>
		<div class="flex items-start justify-between gap-2">
			<strong class="font-semibold">{term}.</strong>
			<button
				type="button"
				aria-label="Close"
				onclick={closeInfo}
				class="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink"
			>
				✕
			</button>
		</div>
		<p class="mt-0.5">{definition}</p>
	</div>
{/if}

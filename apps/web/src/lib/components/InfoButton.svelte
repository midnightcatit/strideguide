<script lang="ts">
	import { onMount } from 'svelte';
	import { anchor } from '$lib/actions';
	import { closeInfo, isInfoOpen, toggleInfo } from '$lib/infoPopover.svelte';

	let { term, definition }: { term: string; definition: string } = $props();

	const id = crypto.randomUUID();
	const open = $derived(isInfoOpen(id));
	const cardId = `info-card-${id}`;
	const titleId = `info-title-${id}`;
	let btn = $state<HTMLButtonElement | undefined>(undefined);
	let card = $state<HTMLElement | undefined>(undefined);

	// Move focus onto the card when it opens, so someone on a keyboard lands on
	// the close button instead of having to hunt for it. The card is focusable
	// but is not in the document while closed, so it never sits in the tab order.
	$effect(() => {
		if (open && card) card.focus();
	});

	// Only give focus back to the icon when the close came from the card itself,
	// so a tap somewhere else on the page keeps the focus it moved to.
	function closeAndReturn() {
		closeInfo();
		btn?.focus();
	}

	onMount(() => {
		function onPointerDown(e: PointerEvent) {
			if (!open) return;
			const target = e.target as Node;
			if (btn && !btn.contains(target) && !(target instanceof Element && target.closest('[data-info-popover]'))) {
				closeInfo();
			}
		}
		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && open) closeAndReturn();
		}
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeydown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeydown);
		};
	});
</script>

<span class="relative inline-flex">
	<button
		bind:this={btn}
		type="button"
		aria-label="What does {term} mean?"
		aria-expanded={open}
		aria-controls={open ? cardId : undefined}
		onclick={(e) => {
			e.stopPropagation();
			toggleInfo(id);
		}}
		class="group tap-target pointer-events-auto relative z-20 -mx-3 -my-3 shrink-0 rounded-full text-steel"
	>
		<span
			class="flex h-4 w-4 items-center justify-center rounded-full border border-hairline-strong text-[10px] font-medium leading-none group-hover:border-signal group-hover:text-signal-ink"
			aria-hidden="true"
		>i</span>
	</button>
</span>

{#if open}
	<div
		bind:this={card}
		id={cardId}
		data-info-popover
		role="dialog"
		aria-labelledby={titleId}
		tabindex="-1"
		use:anchor={{ anchor: btn, width: 288 }}
		class="info-card fixed z-[60] block max-h-[60vh] w-72 overflow-y-auto rounded-lg border border-hairline bg-paper p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg outline-none"
	>
		<div class="flex items-start justify-between gap-2">
			<strong id={titleId} class="font-semibold">{term}.</strong>
			<button
				type="button"
				aria-label="Close"
				onclick={closeAndReturn}
				class="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-steel hover:bg-sunken hover:text-ink"
			>
				✕
			</button>
		</div>
		<p class="mt-0.5">{definition}</p>
	</div>
{/if}

<style>
	/*
	 * A short fade as the card opens, on the shared motion tokens. It only fades
	 * opacity, so it never fights the placement the action works out, and it is
	 * dropped under reduced motion, like the rest of the app.
	 */
	@media (prefers-reduced-motion: no-preference) {
		.info-card {
			animation: info-card-in var(--dur-1) var(--ease-out) both;
		}
	}
	@keyframes info-card-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>

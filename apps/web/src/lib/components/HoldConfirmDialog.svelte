<script lang="ts">
	import { modal } from '$lib/actions';
	import { sheetOverlay, sheetPanel } from '$lib/motion';
	import { overlayHistory } from '$lib/overlayHistory.svelte';

	// A destructive action that only fires after the person holds the button for a
	// set time. The fill shows how far they are; letting go resets it. This is the
	// last step, so it should sit behind a clear warning.
	let {
		open,
		title,
		body,
		holdLabel = 'Hold to confirm',
		holdMs = 2000,
		onConfirm,
		onClose,
	}: {
		open: boolean;
		title: string;
		body: string;
		holdLabel?: string;
		holdMs?: number;
		onConfirm: () => void;
		onClose: () => void;
	} = $props();

	// Back closes the dialog instead of leaving the page. The confirm handler
	// waits for `release` first, so an action that navigates or goes back runs on
	// the page's own history entry, not the one this dialog pushed on top.
	const { release: releaseHistory } = overlayHistory(
		() => open,
		() => onClose(),
	);

	let holding = $state(false);
	let progress = $state(0);
	let raf = 0;
	let startedAt = 0;
	let fired = false;
	const titleId = `hold-title-${crypto.randomUUID()}`;

	async function fire() {
		await releaseHistory();
		onConfirm();
		onClose();
	}

	function frame(now: number) {
		if (!holding) return;
		const p = Math.min(1, (now - startedAt) / holdMs);
		progress = p;
		if (p >= 1) {
			fired = true;
			holding = false;
			void fire();
			return;
		}
		raf = requestAnimationFrame(frame);
	}

	function begin() {
		if (fired || holding) return;
		holding = true;
		startedAt = performance.now();
		raf = requestAnimationFrame(frame);
	}

	function release() {
		if (fired) return;
		holding = false;
		cancelAnimationFrame(raf);
		progress = 0;
	}

	function onKeyDown(e: KeyboardEvent) {
		if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
			e.preventDefault();
			begin();
		}
	}

	$effect(() => () => cancelAnimationFrame(raf));
</script>

{#if open}
	<div
		class="sg-dialog fixed inset-0 flex items-end justify-center sm:items-center sm:p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		use:modal={onClose}
	>
		<button
			type="button"
			aria-label="Close"
			data-modal-backdrop
			onclick={onClose}
			class="absolute inset-0 bg-ink/30"
			transition:sheetOverlay
		></button>
		<div
			data-modal-panel
			tabindex="-1"
			class="sg-overlay-pad relative w-full max-w-md rounded-t-2xl border border-hairline bg-paper p-5 outline-none sm:rounded-2xl"
			style="--overlay-pad: 1.25rem"
			transition:sheetPanel
		>
			<h2 id={titleId} class="font-display text-lg font-bold">{title}</h2>
			<p class="mt-2 text-sm leading-relaxed text-steel">{body}</p>
			<div class="mt-5 grid gap-2">
				<button
					type="button"
					onpointerdown={begin}
					onpointerup={release}
					onpointerleave={release}
					onpointercancel={release}
					onkeydown={onKeyDown}
					onkeyup={release}
					oncontextmenu={(e) => e.preventDefault()}
					aria-label={holdLabel}
					class="relative touch-none select-none overflow-hidden rounded-md bg-danger px-4 py-3 text-sm font-medium text-paper"
				>
					<span
						class="absolute inset-y-0 left-0 bg-ink/30"
						style="width: {progress * 100}%"
						aria-hidden="true"
					></span>
					<span class="relative block">{holding ? 'Keep holding…' : holdLabel}</span>
				</button>
				<button
					type="button"
					onclick={onClose}
					class="btn-outline rounded-md border border-hairline-strong px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

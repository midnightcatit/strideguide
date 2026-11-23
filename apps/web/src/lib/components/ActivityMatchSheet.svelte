<script lang="ts">
	import { modal } from '$lib/actions';
	import { sheetOverlay, sheetPanel } from '$lib/motion';

	let {
		open,
		title,
		body,
		busy = false,
		onConfirm,
		onReject,
		onClose,
	}: {
		open: boolean;
		title: string;
		body: string;
		busy?: boolean;
		onConfirm: () => void;
		onReject: () => void;
		onClose: () => void;
	} = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
		role="dialog"
		aria-modal="true"
		aria-label={title}
		use:modal={onClose}
	>
		<button
			type="button"
			aria-label="Close"
			onclick={onClose}
			class="absolute inset-0 bg-ink/30"
			transition:sheetOverlay
		></button>
		<div
			class="relative w-full max-w-md rounded-t-2xl border border-hairline bg-paper p-5 sm:rounded-2xl"
			style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))"
			transition:sheetPanel
		>
			<h2 class="font-display text-lg font-bold">{title}</h2>
			<p class="mt-2 text-sm leading-relaxed text-steel">{body}</p>
			<div class="mt-5 flex gap-2">
				<button
					type="button"
					disabled={busy}
					onclick={onReject}
					class="flex-1 rounded-md border border-hairline-strong px-4 py-3 text-sm hover:border-signal hover:text-signal-ink disabled:opacity-60"
				>
					Not this one
				</button>
				<button
					type="button"
					disabled={busy}
					onclick={onConfirm}
					class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
				>
					{busy ? 'Saving…' : 'Yes, it matched'}
				</button>
			</div>
		</div>
	</div>
{/if}

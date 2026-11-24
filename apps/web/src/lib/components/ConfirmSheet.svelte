<script lang="ts">
	import { modal } from '$lib/actions';
	import { sheetOverlay, sheetPanel } from '$lib/motion';

	let {
		open,
		title,
		body,
		confirmLabel = 'Confirm',
		tone = 'default',
		onConfirm,
		onClose,
	}: {
		open: boolean;
		title: string;
		body: string;
		confirmLabel?: string;
		tone?: 'default' | 'danger';
		onConfirm: () => void;
		onClose: () => void;
	} = $props();
</script>

{#if open}
	<div
		class="sg-dialog fixed inset-0 flex items-end justify-center sm:items-center sm:p-4"
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
			class="sg-overlay-pad relative w-full max-w-md rounded-t-2xl border border-hairline bg-paper p-5 sm:rounded-2xl"
			style="--overlay-pad: 1.25rem"
			transition:sheetPanel
		>
			<h2 class="font-display text-lg font-bold">{title}</h2>
			<p class="mt-2 text-sm leading-relaxed text-steel">{body}</p>
			<div class="mt-5 flex gap-2">
				<button
					type="button"
					onclick={onClose}
					class="flex-1 rounded-md border border-hairline-strong px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={() => {
						onConfirm();
						onClose();
					}}
					class="flex-1 rounded-md px-4 py-3 text-sm font-medium text-paper hover:opacity-90 {tone === 'danger'
						? 'bg-danger'
						: 'bg-ink'}"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}

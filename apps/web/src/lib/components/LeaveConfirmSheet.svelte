<script lang="ts">
	import ConfirmSheet from './ConfirmSheet.svelte';

	// A lightweight guard for a page with unsaved edits. When the person tries to
	// leave, they either keep editing or discard the draft and move on. The host
	// decides where "move on" goes.
	let {
		open,
		title = 'Discard your changes?',
		body = 'Your edits are not saved yet. Leaving now throws them away.',
		onKeep,
		onDiscard,
	}: {
		open: boolean;
		title?: string;
		body?: string;
		onKeep: () => void;
		onDiscard: () => void;
	} = $props();
</script>

<ConfirmSheet
	{open}
	{title}
	{body}
	confirmLabel="Discard"
	cancelLabel="Keep editing"
	tone="danger"
	onConfirm={onDiscard}
	onClose={onKeep}
/>

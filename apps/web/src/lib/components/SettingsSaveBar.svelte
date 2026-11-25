<script lang="ts">
	// A settings page that edits a draft shows this bar at the foot of the page.
	// Both buttons stay disabled until the draft differs from what is stored, so
	// there is nothing to save or throw away on a page left untouched.
	let {
		dirty,
		saving = false,
		onSave,
		onDiscard,
	}: {
		dirty: boolean;
		saving?: boolean;
		onSave: () => void;
		onDiscard: () => void;
	} = $props();
</script>

<div
	class="sticky z-30 -mx-4 border-t border-hairline bg-paper/95 px-4 py-3 backdrop-blur bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))] sm:bottom-0"
	aria-busy={saving}
>
	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={onDiscard}
			disabled={!dirty || saving}
			class="flex-1 rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-steel disabled:opacity-40"
		>
			Discard
		</button>
		<button
			type="button"
			onclick={onSave}
			disabled={!dirty || saving}
			class="flex-1 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
		>
			{saving ? 'Saving…' : 'Save'}
		</button>
	</div>
	<p class="sr-only" role="status" aria-live="polite">
		{saving ? 'Saving settings' : dirty ? 'Unsaved changes' : 'All changes saved'}
	</p>
</div>

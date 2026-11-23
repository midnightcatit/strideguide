<script lang="ts">
	import { untrack } from 'svelte';
	import { SESSION_NOTES_MAX } from '@strideguide/shared';
	import type { ClientSession } from '$lib/plan';
	import { sessionLabel } from '$lib/prefs.svelte';
	import { api } from '$lib/api';
	import { modal } from '$lib/actions';
	import { sheetOverlay, sheetPanel } from '$lib/motion';

	/**
	 * The notes sheet: a modal with a textarea and a sticky Save / Discard bar.
	 * Save writes the note against this session and closes; Discard closes and
	 * keeps whatever was stored before. The stored note is what a later plan
	 * rebuild reads, so it is saved on the server, not just held here.
	 */
	let {
		open,
		session,
		onSaved,
		onClose,
	}: {
		open: boolean;
		session: ClientSession;
		onSaved: (notes: string) => void;
		onClose: () => void;
	} = $props();

	let draft = $state(untrack(() => session.notes ?? ''));
	let saving = $state(false);
	let error = $state<string | null>(null);
	const remaining = $derived(SESSION_NOTES_MAX - draft.length);

	async function save() {
		if (saving) return;
		saving = true;
		error = null;
		try {
			const res = await api.setSessionNotes(session.id, draft);
			onSaved(res.notes);
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the note. Try again.';
		} finally {
			saving = false;
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center"
		role="dialog"
		aria-modal="true"
		aria-label={`Notes for ${sessionLabel(session)}`}
		use:modal={onClose}
	>
		<button
			type="button"
			aria-label="Close notes"
			onclick={onClose}
			class="absolute inset-0 bg-ink/40"
			transition:sheetOverlay
		></button>
		<div
			class="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl border-t border-hairline bg-paper"
			transition:sheetPanel
		>
		<div class="flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
			<div class="mx-auto mb-2 h-1 w-10 rounded-full bg-hairline" aria-hidden="true"></div>
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="tabular text-xs uppercase tracking-widest text-steel">Notes</p>
					<h2 class="mt-0.5 font-display text-lg font-medium">{sessionLabel(session)}</h2>
				</div>
				<button type="button" onclick={onClose} aria-label="Close notes" class="-mr-1 rounded-full px-3 py-1 text-steel hover:text-ink">
					✕
				</button>
			</div>
			<p class="mt-1 text-sm text-steel">Anything you want to remember about this session: how it felt, what to change next time, a niggle to watch.</p>
			<textarea
				bind:value={draft}
				rows="8"
				maxlength={SESSION_NOTES_MAX}
				placeholder="Felt strong on the last set. Left calf was tight after."
				class="mt-3 w-full resize-none rounded-lg border border-hairline bg-sunken p-3 text-sm leading-relaxed text-ink focus:border-signal focus:outline-none"
			></textarea>
			<p class="mt-1 text-right tabular text-[11px] text-steel">{remaining} characters left</p>
			{#if error}<p class="mt-1 text-sm text-danger">{error}</p>{/if}
			<div class="h-3"></div>
		</div>

		<!-- Sticky action bar: stays put while the textarea scrolls. -->
		<div
			class="sticky bottom-0 flex gap-2 border-t border-hairline bg-paper px-4 py-3"
			style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))"
		>
			<button
				type="button"
				onclick={onClose}
				class="flex-1 rounded-md border border-hairline px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
			>
				Discard
			</button>
			<button
				type="button"
				onclick={save}
				disabled={saving}
				class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
			>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
		</div>
	</div>
{/if}

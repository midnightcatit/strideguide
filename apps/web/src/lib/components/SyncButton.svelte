<script lang="ts">
	import { api } from '$lib/api';

	/**
	 * Manual sync for a health connection. Calls POST /connections/:provider/sync,
	 * which returns { synced, cached, lastSyncedAt }, and reports the outcome in
	 * plain words. When the server reuses a recent result it says so rather than
	 * claiming new records.
	 */
	let {
		provider = 'google-health',
		label = 'Sync now',
		disabled = false,
		onSynced,
	}: {
		provider?: string;
		label?: string;
		/** True when there is no connection to sync; the button greys out and does nothing. */
		disabled?: boolean;
		onSynced?: (result: { synced: number; cached: boolean; lastSyncedAt: string }) => void;
	} = $props();

	let status = $state<'idle' | 'syncing' | 'done' | 'error'>('idle');
	let message = $state('');

	async function run() {
		if (disabled || status === 'syncing') return;
		status = 'syncing';
		message = '';
		try {
			const result = await api.syncConnection(provider);
			status = 'done';
			message = result.cached
				? 'Up to date.'
				: result.synced > 0
					? `Synced ${result.synced} record${result.synced === 1 ? '' : 's'}.`
					: 'Nothing new.';
			onSynced?.(result);
		} catch (e) {
			status = 'error';
			message = e instanceof Error ? e.message : 'Could not sync. Try again.';
		}
	}
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
	<button
		type="button"
		onclick={run}
		disabled={disabled || status === 'syncing'}
		class="rounded-md border border-hairline px-3.5 py-2 text-sm font-medium text-signal-ink hover:border-signal disabled:cursor-not-allowed disabled:text-steel disabled:opacity-50 disabled:hover:border-hairline"
	>
		{status === 'syncing' ? 'Syncing…' : label}
	</button>
	{#if message}
		<span class="text-xs {status === 'error' ? 'text-danger' : 'text-steel'}">{message}</span>
	{/if}
</div>

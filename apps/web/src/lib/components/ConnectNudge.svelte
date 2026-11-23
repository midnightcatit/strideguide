<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { prefs, setConnectNudgeDismissed } from '$lib/prefs.svelte';

	// Show only when the server can offer the connector and it is not linked yet.
	let configured = $state(false);
	let connected = $state(true);
	let busy = $state(false);

	onMount(async () => {
		try {
			const res = await api.connections();
			const provider = res.providers.find((p) => p.id === 'google-health');
			configured = Boolean(provider?.configured);
			connected = Boolean(provider?.connected);
		} catch {
			// Cannot tell, so leave it hidden rather than nag.
		}
	});

	const visible = $derived(configured && !connected && !prefs.connectNudgeDismissed);

	function connect() {
		window.location.href = api.connectionConnectUrl('google-health', '/today');
	}

	async function dismiss() {
		busy = true;
		await setConnectNudgeDismissed(true);
		busy = false;
	}
</script>

{#if visible}
	<div class="mb-6 rounded-xl border border-signal bg-signal-wash p-4">
		<p class="text-sm font-medium">Import your runs from Google Health.</p>
		<p class="mt-1 text-sm text-steel">
			Link the app that already records your training, so a run logged there still counts here and
			the plan stays honest about what you actually do.
		</p>
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={connect}
				class="rounded-md border border-signal-ink px-4 py-2.5 text-sm font-medium text-signal-ink hover:border-signal"
			>
				Connect Google Health
			</button>
			<button
				type="button"
				onclick={dismiss}
				disabled={busy}
				class="px-2 py-2.5 text-sm text-steel hover:text-signal-ink disabled:opacity-60"
			>
				Dismiss
			</button>
		</div>
	</div>
{/if}

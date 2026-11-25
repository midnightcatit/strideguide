<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import { api, type ConnectionStatus } from '$lib/api';

	/** What each connector reads, in plain words, shown on the card. */
	const SHARED: Record<string, string> = {
		'google-health':
			'Workouts and daily activity from Google Health, including Fitbit and Pixel Watch. It fills your vitals, progress charts and recovery view with resting heart rate, HRV, sleep, steps, distance, energy, active minutes, heart rate range, oxygen saturation, breathing rate, night temperature and body measurements like weight, body fat and height.',
	};

	const ERROR_TEXT: Record<string, string> = {
		not_configured: 'This connection is not set up yet.',
		invalid_state: 'That link expired. Try connecting again.',
		exchange_failed: 'The provider did not return a token. Try again.',
		denied: 'You cancelled before finishing.',
		unknown_provider: 'That provider is not available.',
	};

	let providers = $state<ConnectionStatus[]>([]);
	let loading = $state(true);
	let loadError = $state('');
	let pendingDisconnect = $state<ConnectionStatus | null>(null);
	let busy = $state(false);
	let syncingId = $state<string | null>(null);
	let syncNote = $state('');
	let syncError = $state('');

	const connectedParam = $derived(page.url.searchParams.get('connected'));
	const errorParam = $derived(page.url.searchParams.get('error'));

	function syncedText(iso: string | null): string {
		if (!iso) return 'Not synced yet';
		const then = new Date(iso).getTime();
		if (Number.isNaN(then)) return 'Not synced yet';
		const mins = Math.round((Date.now() - then) / 60000);
		if (mins < 1) return 'Synced just now';
		if (mins < 60) return `Synced ${mins} min ago`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `Synced ${hours} h ago`;
		return `Synced ${Math.round(hours / 24)} d ago`;
	}

	async function load(silent = false) {
		if (!silent) loading = true;
		loadError = '';
		try {
			const res = await api.connections();
			providers = res.providers;
		} catch (e) {
			if (!silent) loadError = e instanceof Error ? e.message : 'Could not load connections.';
		} finally {
			if (!silent) loading = false;
		}
	}

	onMount(load);

	function connect(provider: ConnectionStatus) {
		window.location.href = api.connectionConnectUrl(provider.id);
	}

	async function syncNow(provider: ConnectionStatus) {
		syncingId = provider.id;
		syncNote = '';
		syncError = '';
		try {
			const res = await api.syncConnection(provider.id);
			syncNote = res.cached
				? 'Already up to date. Nothing new to pull right now.'
				: res.synced === 0
					? 'No new workouts to pull yet.'
					: `Pulled ${res.synced} ${res.synced === 1 ? 'workout' : 'workouts'}.`;
			await load(true);
		} catch (e) {
			syncError = e instanceof Error ? e.message : 'Could not sync. Try again.';
		} finally {
			syncingId = null;
		}
	}

	async function doDisconnect() {
		const provider = pendingDisconnect;
		if (!provider) return;
		busy = true;
		try {
			await api.disconnectConnection(provider.id);
			await load();
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Could not disconnect.';
		} finally {
			busy = false;
		}
	}
</script>

<SettingsHeader title="Connections" />

<p class="mb-5 text-sm leading-relaxed text-steel">
	Link the apps that already record your training, so the work you do outside the plan counts here.
	Syncing pulls your recent workouts from the linked app. Disconnecting removes the stored tokens from
	our side.
</p>

{#if connectedParam}
	<p role="status" aria-live="polite" class="mb-4 rounded-md border border-signal-ink bg-signal-wash px-4 py-3 text-sm">
		Linked. The first sync can take a few minutes.
	</p>
{:else if errorParam}
	<p role="alert" class="mb-4 rounded-md border border-danger px-4 py-3 text-sm">
		{ERROR_TEXT[errorParam] ?? 'Something went wrong. Try again.'}
	</p>
{/if}

{#if loading}
	<p class="text-sm text-steel">Loading connections.</p>
{:else if loadError}
	<div class="rounded-xl border border-hairline bg-paper p-4">
		<p role="alert" class="text-sm text-steel">{loadError}</p>
		<button
			type="button"
			onclick={() => load()}
			class="mt-3 rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink"
		>
			Try again
		</button>
	</div>
{:else}
	<div class="grid gap-3">
		{#each providers as provider (provider.id)}
			<div class="rounded-xl border border-hairline bg-paper p-4">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="font-display font-medium">{provider.label}</p>
						<p class="mt-1 text-sm leading-relaxed text-steel">
							{SHARED[provider.id] ?? 'Training recorded in this app.'}
						</p>
					</div>
					{#if !provider.configured}
						<span class="shrink-0 rounded-full bg-sunken px-2.5 py-1 text-xs text-steel">
							Not set up
						</span>
					{:else if provider.connected}
						<span
							class="shrink-0 rounded-full px-2.5 py-1 text-xs {provider.status === 'error'
								? 'bg-sunken text-danger'
								: 'bg-signal-wash text-signal-ink'}"
						>
							{provider.status === 'error' ? 'Needs attention' : 'Connected'}
						</span>
					{/if}
				</div>

				{#if provider.connected}
					<p class="mt-2 text-xs text-steel">{syncedText(provider.lastSyncedAt)}</p>
				{/if}

				<div class="mt-3">
					{#if !provider.configured}
						<p class="text-xs text-steel">This connection is not available here.</p>
					{:else if provider.connected}
						<div class="flex flex-wrap items-center gap-2">
							<button
								type="button"
								disabled={syncingId !== null}
								aria-busy={syncingId === provider.id}
								onclick={() => syncNow(provider)}
								class="flex items-center gap-2 rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink disabled:opacity-60"
							>
								{#if syncingId === provider.id}
									<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.25"></circle>
										<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
									</svg>
									Syncing
								{:else}
									Sync now
								{/if}
							</button>
							<button
								type="button"
								disabled={busy || syncingId !== null}
								onclick={() => (pendingDisconnect = provider)}
								class="rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-danger hover:text-danger disabled:opacity-60"
							>
								Disconnect
							</button>
						</div>
						{#if syncNote}
							<p role="status" aria-live="polite" class="mt-2 text-xs text-steel">{syncNote}</p>
						{:else if syncError}
							<p role="alert" class="mt-2 text-xs text-danger">{syncError}</p>
						{/if}
					{:else}
						<button
							type="button"
							onclick={() => connect(provider)}
							class="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90"
						>
							Connect
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<ConfirmSheet
	open={pendingDisconnect !== null}
	title={pendingDisconnect ? `Disconnect ${pendingDisconnect.label}?` : ''}
	body="We delete the stored tokens and stop importing from this app. You can connect again any time."
	confirmLabel="Disconnect"
	tone="danger"
	onConfirm={doDisconnect}
	onClose={() => (pendingDisconnect = null)}
/>

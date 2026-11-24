<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { prefs } from '$lib/prefs.svelte';
	import { auth } from '$lib/auth.svelte';
	import { api, type ConnectionStatus } from '$lib/api';
	import { getTheme, type Theme } from '$lib/theme';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';

	let confirmSignOut = $state(false);

	// Each row shows the value the section page itself reads, so a change made on
	// that page shows up the moment the runner navigates back here. The link
	// status comes from the server, and the theme from local storage, so both are
	// refreshed on mount and on the way back into this page.
	let theme = $state<Theme>('system');
	let connection = $state<ConnectionStatus | null>(null);
	let connectionsLoaded = $state(false);

	async function refresh() {
		theme = getTheme();
		try {
			const res = await api.connections();
			connection = res.providers.find((p) => p.id === 'google-health') ?? null;
			connectionsLoaded = true;
		} catch {
			// Leave the status unknown and the value blank; the row still opens the page.
		}
	}

	onMount(refresh);
	afterNavigate((nav) => {
		if (nav && nav.type === 'enter') return;
		void refresh();
	});

	const THEME_LABEL: Record<Theme, string> = {
		system: 'Follows your device',
		light: 'Light',
		dark: 'Dark',
	};

	const youValue = $derived.by(() => {
		const bits = [prefs.name, prefs.eventName].filter((v): v is string => Boolean(v));
		return bits.length ? bits.join(' · ') : 'Not set yet';
	});

	const trainingValue = $derived(
		`${prefs.units === 'imperial' ? 'Miles' : 'Kilometers'} · week starts ${prefs.weekStart === 1 ? 'Sunday' : 'Monday'}`,
	);

	const connectionValue = $derived.by(() => {
		if (!connectionsLoaded) return '';
		if (!connection) return 'Not linked';
		if (!connection.configured) return 'Not available here';
		return connection.connected ? `${connection.label} linked` : 'Not linked';
	});

	const rows = $derived([
		{
			href: '/settings/profile',
			label: 'You',
			value: youValue,
			edit: true,
			icon: 'M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17c0-3 2.7-5 6-5s6 2 6 5',
		},
		{
			href: '/settings/training',
			label: 'Training',
			value: trainingValue,
			edit: true,
			icon: 'M4 14V6M7.5 14V4M11 14v-8M14.5 14V4M3 16h12',
		},
		{
			href: '/settings/connections',
			label: 'Connections',
			value: connectionValue,
			edit: true,
			icon: 'M8 12a3 3 0 0 1 0-4l1.5-1.5a3 3 0 0 1 4.2 4.2L12.5 12M12 8a3 3 0 0 1 0 4l-1.5 1.5a3 3 0 0 1-4.2-4.2L7.5 8',
		},
		{
			href: '/settings/appearance',
			label: 'Appearance',
			value: THEME_LABEL[theme],
			edit: true,
			icon: 'M10 3.5a6.5 6.5 0 1 0 0 13c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5h.8a2.5 2.5 0 0 0 2.5-2.5C15.5 6 13 3.5 10 3.5z',
		},
		{
			href: '/settings/account',
			label: 'Account',
			value: auth.user?.email ?? 'Not signed in',
			edit: true,
			icon: 'M10 3.5l6 2.5v4c0 3.5-2.5 6.2-6 7-3.5-.8-6-3.5-6-7v-4z',
		},
		{
			href: '/settings/about',
			label: 'About',
			value: 'What this is and the version',
			edit: false,
			icon: 'M10 4.5v.5M10 8.5v7',
		},
	]);

	async function signOut() {
		await api.logout().catch(() => {});
		window.location.href = '/';
	}
</script>

<header class="mb-5">
	<p class="tabular text-xs uppercase tracking-widest text-steel">Settings</p>
	<h1 class="font-display mt-1 text-2xl font-bold">
		{prefs.name ? `${prefs.name}'s settings` : 'Settings'}
	</h1>
</header>

<nav class="divide-y divide-hairline border-y border-hairline" aria-label="Settings sections">
	{#each rows as row (row.href)}
		<a href={row.href} class="flex items-center gap-4 py-4">
			<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink" aria-hidden="true">
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
					<path d={row.icon} />
				</svg>
			</span>
			<span class="min-w-0 flex-1">
				<span class="font-display block font-medium">{row.label}</span>
				<span class="block truncate text-sm text-steel">{row.value}</span>
			</span>
			{#if row.edit}<span class="shrink-0 text-xs font-medium text-steel">Edit</span>{/if}
			<span class="text-steel" aria-hidden="true">›</span>
		</a>
	{/each}
</nav>

<div class="mt-6">
	<button
		type="button"
		onclick={() => (confirmSignOut = true)}
		class="w-full rounded-md border border-hairline px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
	>
		Sign out
	</button>
	<p class="mt-2 text-xs text-steel">You can sign back in any time with Google.</p>
</div>

<ConfirmSheet
	open={confirmSignOut}
	title="Sign out?"
	body="You can sign back in any time with Google."
	confirmLabel="Sign out"
	tone="danger"
	onConfirm={signOut}
	onClose={() => (confirmSignOut = false)}
/>

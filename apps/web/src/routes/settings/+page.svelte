<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { getLandingTab, LANDING_TABS, prefs, type LandingTab } from '$lib/prefs.svelte';
	import { GOAL_DEFAULTS } from '$lib/chartTheme';
	import { auth, forgetUser } from '$lib/auth.svelte';
	import { clearClientState } from '$lib/offline';
	import { api, type ConnectionStatus } from '$lib/api';
	import { getTheme, type Theme } from '$lib/theme';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';

	let confirmSignOut = $state(false);

	// Each row shows the value the section page itself reads, so a change made on
	// that page shows up the moment the runner navigates back here. The link
	// status comes from the server, and the theme and start tab from local
	// storage, so all three are refreshed on mount and on the way back here.
	let theme = $state<Theme>('system');
	let landingTab = $state<LandingTab>('today');
	let connection = $state<ConnectionStatus | null>(null);
	let connectionsLoaded = $state(false);
	// Whether to show the Admin entry. Checked once per load; the admin routes
	// are guarded on the server, so this only decides whether to draw the row.
	let isAdmin = $state(false);
	let adminChecked = $state(false);

	async function refresh() {
		theme = getTheme();
		landingTab = getLandingTab();
		if (!adminChecked) {
			try {
				isAdmin = (await api.adminMe()).isAdmin;
			} catch {
				// Not signed in, or the check failed; leave the entry hidden.
			} finally {
				adminChecked = true;
			}
		}
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

	const goalsValue = $derived(
		`${(prefs.stepGoal ?? GOAL_DEFAULTS.steps).toLocaleString()} steps · ${prefs.activeEnergyGoalKcal ?? GOAL_DEFAULTS.active_energy_kcal} kcal · ${prefs.activeZoneGoalMin ?? GOAL_DEFAULTS.active_zone_min} zone min`,
	);

	const favoritesValue = $derived.by(() => {
		const n = (prefs.favoriteMachines?.length ?? 0) + (prefs.favoriteWorkouts?.length ?? 0);
		return n ? `${n} picked` : 'None picked yet';
	});

	const landingLabel = $derived(
		LANDING_TABS.find((tab) => tab.key === landingTab)?.label ?? 'Today',
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
			href: '/settings/goals',
			label: 'Daily goals',
			value: goalsValue,
			edit: true,
			icon: 'M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM10 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
		},
		{
			href: '/settings/favorites',
			label: 'Favorites',
			value: favoritesValue,
			edit: true,
			icon: 'M10 3.5l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z',
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
			href: '/settings/landing',
			label: 'Start tab',
			value: landingLabel,
			edit: true,
			icon: 'M3.5 9.5 10 3.5l6.5 6M5.5 9v7.5h9V9',
		},
		{
			href: '/settings/account',
			label: 'Account',
			value: auth.user?.email ?? 'Not signed in',
			edit: true,
			icon: 'M10 3.5l6 2.5v4c0 3.5-2.5 6.2-6 7-3.5-.8-6-3.5-6-7v-4z',
		},
		...(isAdmin
			? [
					{
						href: '/settings/admin',
						label: 'Admin',
						value: 'Users and system status',
						edit: false,
						icon: 'M10 3.5l5.5 2.2v4.3c0 3.2-2.3 5.6-5.5 6.5-3.2-.9-5.5-3.3-5.5-6.5V5.7zM7.6 10l1.8 1.8 3.2-3.6',
					},
				]
			: []),
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
		clearClientState();
		forgetUser();
		window.location.href = '/';
	}
</script>

<header class="mb-7">
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

<div class="mt-7">
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

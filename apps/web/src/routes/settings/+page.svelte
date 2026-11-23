<script lang="ts">
	import { prefs } from '$lib/prefs.svelte';
	import { auth } from '$lib/auth.svelte';
	import { api } from '$lib/api';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';

	let confirmSignOut = $state(false);

	async function signOut() {
		await api.logout().catch(() => {});
		window.location.href = '/';
	}

	const categories = [
		{
			href: '/settings/profile',
			label: 'You',
			desc: 'Name, age and the event you are training for',
			icon: 'M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17c0-3 2.7-5 6-5s6 2 6 5',
		},
		{
			href: '/settings/training',
			label: 'Training',
			desc: 'Units, week start, countdown and auto next',
			icon: 'M4 14V6M7.5 14V4M11 14v-8M14.5 14V4M3 16h12',
		},
		{
			href: '/settings/connections',
			label: 'Connections',
			desc: 'Link Strava and Google Health',
			icon: 'M8 12a3 3 0 0 1 0-4l1.5-1.5a3 3 0 0 1 4.2 4.2L12.5 12M12 8a3 3 0 0 1 0 4l-1.5 1.5a3 3 0 0 1-4.2-4.2L7.5 8',
		},
		{
			href: '/settings/appearance',
			label: 'Appearance',
			desc: 'Light, dark or match the system',
			icon: 'M10 3.5a6.5 6.5 0 1 0 0 13c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5h.8a2.5 2.5 0 0 0 2.5-2.5C15.5 6 13 3.5 10 3.5z',
		},
		{
			href: '/settings/account',
			label: 'Account',
			desc: 'Switch account and your data',
			icon: 'M10 3.5l6 2.5v4c0 3.5-2.5 6.2-6 7-3.5-.8-6-3.5-6-7v-4z',
		},
		{
			href: '/settings/about',
			label: 'About',
			desc: 'What this is and the version',
			icon: 'M10 4.5v.5M10 8.5v7',
		},
	];
</script>

<header class="mb-5">
	<p class="tabular text-xs uppercase tracking-widest text-steel">Settings</p>
	<h1 class="font-display mt-1 text-2xl font-bold">
		{prefs.name ? `${prefs.name}'s settings` : 'Settings'}
	</h1>
	{#if auth.user}<p class="mt-1 text-sm text-steel">{auth.user.email}</p>{/if}
</header>

<nav class="divide-y divide-hairline border-y border-hairline" aria-label="Settings sections">
	{#each categories as c (c.href)}
		<a href={c.href} class="flex items-center gap-4 py-4">
			<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunken text-ink" aria-hidden="true">
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
					<path d={c.icon} />
				</svg>
			</span>
			<span class="min-w-0 flex-1">
				<span class="font-display block font-medium">{c.label}</span>
				<span class="block truncate text-sm text-steel">{c.desc}</span>
			</span>
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

{#if confirmSignOut}
	<ConfirmSheet
		title="Sign out?"
		body="You can sign back in any time with Google."
		confirmLabel="Sign out"
		tone="danger"
		onConfirm={signOut}
		onClose={() => (confirmSignOut = false)}
	/>
{/if}

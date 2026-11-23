<script lang="ts">
	import { goto } from '$app/navigation';
	import { prefs } from '$lib/prefs.svelte';
	import { auth } from '$lib/auth.svelte';

	/** Back to wherever we came from, or the dashboard if there is no history. */
	function back() {
		if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
		else void goto('/');
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
			href: '/settings/appearance',
			label: 'Appearance',
			desc: 'Light, dark or match the system',
			icon: 'M10 3.5a6.5 6.5 0 1 0 0 13c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5h.8a2.5 2.5 0 0 0 2.5-2.5C15.5 6 13 3.5 10 3.5z',
		},
		{
			href: '/settings/account',
			label: 'Account',
			desc: 'Sign out, switch account and your data',
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

<button type="button" onclick={back} class="-ml-1 mb-2 inline-flex items-center gap-1 px-1 py-1 text-sm text-steel hover:text-ink">
	‹ Back
</button>

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

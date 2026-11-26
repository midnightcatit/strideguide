<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { avatarColorFor, initialFor } from '$lib/avatar';
	import { menuPanel } from '$lib/motion';

	let {
		name,
		email,
		seed,
		isAdmin = false,
	}: {
		name?: string | null;
		email?: string | null;
		seed?: string;
		/** True for an admin, so the menu carries the Admin row. */
		isAdmin?: boolean;
	} = $props();

	// The circle is the initial when there is a name; otherwise a neutral person
	// icon on the sunken surface, so a runner who never set a name still gets a
	// recognisable control.
	const initial = $derived(initialFor(name));
	const seedValue = $derived(seed || name?.trim() || email || 'stride-guide');
	const circleColor = $derived(avatarColorFor(seedValue));
	const firstName = $derived(name?.trim().split(/\s+/)[0] ?? '');
	const triggerLabel = $derived(firstName ? `Account menu for ${firstName}` : 'Account menu');

	let open = $state(false);
	let root = $state<HTMLElement | undefined>(undefined);
	let trigger = $state<HTMLButtonElement | undefined>(undefined);

	function close(returnFocus = false) {
		open = false;
		if (returnFocus) trigger?.focus();
	}

	// The layout survives navigation, so a menu left open would hang over the
	// next page. Any navigation closes it.
	afterNavigate(() => (open = false));

	onMount(() => {
		function onPointerDown(e: PointerEvent) {
			if (!open) return;
			if (root && !root.contains(e.target as Node)) open = false;
		}
		function onKeydown(e: KeyboardEvent) {
			if (e.key === 'Escape' && open) {
				e.stopPropagation();
				close(true);
			}
		}
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeydown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeydown);
		};
	});
</script>

<div bind:this={root} class="relative">
	<button
		bind:this={trigger}
		type="button"
		aria-expanded={open}
		aria-label={triggerLabel}
		onclick={() => (open = !open)}
		class="flex h-11 w-11 items-center justify-center rounded-full"
	>
		<span
			class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold {initial
				? 'text-white'
				: 'bg-sunken text-steel'}"
			style={initial ? `background-color: ${circleColor}` : undefined}
			aria-hidden="true"
		>
			{#if initial}
				{initial}
			{:else}
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="10" cy="7.5" r="3" />
					<path d="M4.5 16.5a5.5 5.5 0 0 1 11 0" />
				</svg>
			{/if}
		</span>
	</button>

	{#if open}
		<div
			transition:menuPanel
			class="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-hairline bg-paper shadow-lg"
		>
			<div class="border-b border-hairline px-4 py-3">
				<p class="truncate font-display text-sm font-medium">{name?.trim() || 'Stride Guide'}</p>
				{#if email}<p class="mt-0.5 truncate text-xs text-steel">{email}</p>{/if}
			</div>
			<nav aria-label="Personal settings">
				<a
					href="/settings/profile"
					onclick={() => (open = false)}
					class="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-sunken"
				>
					<span>You</span>
					<span class="text-steel" aria-hidden="true">›</span>
				</a>
				<a
					href="/settings/account"
					onclick={() => (open = false)}
					class="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-sunken"
				>
					<span>Account</span>
					<span class="text-steel" aria-hidden="true">›</span>
				</a>
				<a
					href="/settings"
					onclick={() => (open = false)}
					class="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-sm hover:bg-sunken"
				>
					<span>All settings</span>
					<span class="text-steel" aria-hidden="true">›</span>
				</a>
				{#if isAdmin}
					<a
						href="/settings/admin"
						onclick={() => (open = false)}
						class="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-sm hover:bg-sunken"
					>
						<span>Admin</span>
						<span class="text-steel" aria-hidden="true">›</span>
					</a>
				{/if}
			</nav>
		</div>
	{/if}
</div>

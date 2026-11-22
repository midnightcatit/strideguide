<script lang="ts">
	import { applyTheme, getTheme, type Theme } from '$lib/theme';
	import { prefs, setUnits } from '$lib/prefs.svelte';
	import { api } from '$lib/api';
	import { modal } from '$lib/actions';
	import type { Units } from '@strideguide/shared/units';

	let { user, onClose }: { user: { email: string } | null; onClose: () => void } = $props();

	let theme = $state<Theme>(getTheme());
	let confirmText = $state('');
	let clearing = $state(false);
	let confirming = $state(false);

	function chooseTheme(t: Theme) {
		theme = t;
		applyTheme(t);
	}

	async function signOut() {
		await api.logout().catch(() => {});
		window.location.href = '/';
	}

	async function clearData() {
		if (confirmText.trim() !== 'DELETE MY DATA') return;
		clearing = true;
		try {
			await api.clearData();
		} catch {
			// proceed; the app will show onboarding
		}
		try {
			for (const k of Object.keys(localStorage)) {
				if (k.startsWith('sg:')) localStorage.removeItem(k);
			}
		} catch {
			// ignore
		}
		window.location.href = '/onboarding';
	}

	const canClear = $derived(confirmText.trim() === 'DELETE MY DATA');
</script>

<div
	class="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
	role="dialog"
	aria-modal="true"
	aria-label="Settings"
	use:modal={onClose}
>
	<button type="button" aria-label="Close settings" onclick={onClose} class="absolute inset-0 bg-ink/30"></button>

	<div
		class="relative w-full max-w-md max-h-[92dvh] overflow-y-auto scroll-modern rounded-t-2xl border border-hairline bg-paper p-5 sm:rounded-2xl"
		style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))"
	>
		<div class="flex items-center justify-between">
			<h1 class="font-display text-lg font-bold">Settings</h1>
			<button type="button" onclick={onClose} class="flex h-11 w-11 items-center justify-center text-steel hover:text-ink" aria-label="Close">
				✕
			</button>
		</div>

		<!-- Appearance -->
		<section class="mt-5">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Appearance</h2>
			<div class="mt-2 flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Theme">
				{#each [{ v: 'system', l: 'System' }, { v: 'light', l: 'Light' }, { v: 'dark', l: 'Dark' }] as opt (opt.v)}
					<button
						type="button"
						aria-pressed={theme === opt.v}
						onclick={() => chooseTheme(opt.v as Theme)}
						class="flex-1 px-3 py-2.5 text-sm transition-colors {theme === opt.v
							? 'bg-ink text-paper'
							: 'text-steel hover:text-ink'}"
					>
						{opt.l}
					</button>
				{/each}
			</div>
		</section>

		<!-- Units -->
		<section class="mt-5">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Distance &amp; pace</h2>
			<div class="mt-2 flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Units">
				{#each [{ v: 'metric', l: 'Metric (km)' }, { v: 'imperial', l: 'Imperial (mi)' }] as opt (opt.v)}
					<button
						type="button"
						aria-pressed={prefs.units === opt.v}
						onclick={() => setUnits(opt.v as Units)}
						class="flex-1 px-3 py-2.5 text-sm transition-colors {prefs.units === opt.v
							? 'bg-ink text-paper'
							: 'text-steel hover:text-ink'}"
					>
						{opt.l}
					</button>
				{/each}
			</div>
			<p class="mt-2 text-xs text-steel">Distances, paces and weights update across the app.</p>
		</section>

		<!-- Plan -->
		<section class="mt-5 border-t border-hairline pt-5">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Plan</h2>
			<a
				href="/onboarding"
				onclick={onClose}
				class="mt-2 block rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink"
			>
				Rebuild plan
			</a>
			<p class="mt-2 text-xs text-steel">Builds a fresh plan from your goal and current race paces.</p>
		</section>

		<!-- Account -->
		<section class="mt-5 border-t border-hairline pt-5">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Account</h2>
			{#if user}
				<p class="tabular mt-2 text-sm">{user.email}</p>
				<div class="mt-3 flex flex-col gap-2">
					<button
						type="button"
						onclick={() => {
							window.location.href = '/auth/google';
						}}
						class="rounded-md border border-hairline px-4 py-2.5 text-left text-sm hover:border-signal hover:text-signal-ink"
					>
						Switch account
					</button>
					<button
						type="button"
						onclick={signOut}
						class="rounded-md border border-hairline px-4 py-2.5 text-left text-sm hover:border-signal hover:text-signal-ink"
					>
						Sign out
					</button>
				</div>
			{:else}
				<button
					type="button"
					onclick={() => {
						window.location.href = '/auth/google';
					}}
					class="mt-2 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
				>
					Sign in with Google
				</button>
			{/if}
		</section>

		<!-- Danger zone -->
		<section class="mt-5 border-t border-hairline pt-5">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Danger zone</h2>
			{#if !confirming}
				<button
					type="button"
					onclick={() => (confirming = true)}
					class="btn-danger mt-2 w-full rounded-md px-4 py-3 text-sm font-medium hover:opacity-90"
				>
					Delete my data
				</button>
				<p class="mt-2 text-xs text-steel">Deletes your plan and every logged session. Your account stays.</p>
			{:else}
				<p class="mt-2 text-sm text-steel">
					This removes your plan and every logged session. This cannot be undone. Type
					<span class="text-danger font-medium">DELETE MY DATA</span> to confirm.
				</p>
				<input
					bind:value={confirmText}
					placeholder="DELETE MY DATA"
					aria-label="Type DELETE MY DATA to confirm"
					class="mt-2 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
				/>
				<div class="mt-2 flex gap-2">
					<button
						type="button"
						onclick={() => {
							confirming = false;
							confirmText = '';
						}}
						class="flex-1 rounded-md border border-hairline px-4 py-2.5 text-sm hover:text-ink"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={clearData}
						disabled={!canClear || clearing}
						class="btn-danger flex-1 rounded-md px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
					>
						{clearing ? 'Deleting…' : 'Delete everything'}
					</button>
				</div>
			{/if}
		</section>
	</div>
</div>

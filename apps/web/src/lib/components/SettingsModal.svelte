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

	function chooseTheme(t: Theme) {
		theme = t;
		applyTheme(t);
	}

	async function clearData() {
		if (confirmText.trim() !== 'DELETE MY DATA') return;
		clearing = true;
		try {
			await api.clearData();
		} catch {
			// proceed anyway; the app will show onboarding
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
		class="relative w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-hairline bg-paper p-5 sm:rounded-2xl"
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
			<h2 class="text-xs uppercase tracking-widest text-steel">Appearance</h2>
			<div class="mt-2 flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Theme">
				{#each [{ v: 'system', l: 'System' }, { v: 'light', l: 'Light' }, { v: 'dark', l: 'Dark' }] as opt (opt.v)}
					<button
						type="button"
						aria-pressed={theme === opt.v}
						onclick={() => chooseTheme(opt.v as Theme)}
						class="flex-1 px-3 py-2 text-sm transition-colors {theme === opt.v
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
			<h2 class="text-xs uppercase tracking-widest text-steel">Distance &amp; pace</h2>
			<div class="mt-2 flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Units">
				{#each [{ v: 'metric', l: 'Metric (km)' }, { v: 'imperial', l: 'Imperial (mi)' }] as opt (opt.v)}
					<button
						type="button"
						aria-pressed={prefs.units === opt.v}
						onclick={() => setUnits(opt.v as Units)}
						class="flex-1 px-3 py-2 text-sm transition-colors {prefs.units === opt.v
							? 'bg-ink text-paper'
							: 'text-steel hover:text-ink'}"
					>
						{opt.l}
					</button>
				{/each}
			</div>
			<p class="mt-2 text-xs text-steel">Distances and paces update across the app.</p>
		</section>

		<!-- Plan -->
		<section class="mt-5 border-t border-hairline pt-5">
			<h2 class="text-xs uppercase tracking-widest text-steel">Plan</h2>
			<a
				href="/onboarding"
				onclick={onClose}
				class="mt-2 inline-block rounded-md border border-hairline px-4 py-2 text-sm hover:border-signal hover:text-signal-ink"
			>
				Rebuild plan
			</a>
			<p class="mt-2 text-xs text-steel">Builds a fresh plan from your goal and current race paces.</p>
		</section>

		<!-- Account -->
		<section class="mt-5 border-t border-hairline pt-5">
			<h2 class="text-xs uppercase tracking-widest text-steel">Account</h2>
			{#if user}
				<p class="tabular mt-2 text-sm">{user.email}</p>
				<a href="/auth/google" class="mt-3 block text-sm text-steel hover:text-signal-ink">Switch account</a>
				<button
					type="button"
					onclick={() => {
						void fetch('/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
							window.location.href = '/';
						});
					}}
					class="mt-2 text-sm text-signal-ink hover:underline"
				>
					Sign out
				</button>
			{:else}
				<button
					type="button"
					onclick={() => {
						window.location.href = '/auth/google';
					}}
					class="mt-2 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
				>
					Sign in with Google
				</button>
			{/if}
		</section>

		<!-- Danger zone -->
		<section class="mt-5 border-t border-hairline pt-5">
			<h2 class="text-xs uppercase tracking-widest text-steel">Clear data</h2>
			<p class="mt-2 text-xs text-steel">Deletes your plan and every logged session. Your account stays. This cannot be undone.</p>
			<input
				bind:value={confirmText}
				placeholder="Type DELETE MY DATA"
				aria-label="Type DELETE MY DATA to confirm"
				class="mt-2 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
			/>
			<button
				type="button"
				onclick={clearData}
				disabled={!canClear || clearing}
				class="mt-2 w-full rounded-md border border-hairline px-4 py-2.5 text-sm text-signal-ink hover:border-signal disabled:opacity-50"
			>
				{clearing ? 'Clearing…' : 'Clear all data'}
			</button>
		</section>
	</div>
</div>

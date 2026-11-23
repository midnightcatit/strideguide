<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import HoldConfirmDialog from '$lib/components/HoldConfirmDialog.svelte';
	import { api } from '$lib/api';
	import { auth } from '$lib/auth.svelte';

	let confirmSignOut = $state(false);
	let confirmDelete = $state(false);

	async function signOut() {
		await api.logout().catch(() => {});
		window.location.href = '/';
	}

	async function clearData() {
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
</script>

<SettingsHeader title="Account" />

<section class="grid gap-6">
	<div>
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Signed in as</h2>
		{#if auth.user}
			<p class="tabular mt-2 text-sm">{auth.user.email}</p>
			<div class="mt-3 grid gap-2">
				<a href="/auth/google" class="rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink">Switch account</a>
				<button type="button" onclick={() => (confirmSignOut = true)} class="rounded-md border border-hairline px-4 py-2.5 text-left text-sm hover:border-signal hover:text-signal-ink">
					Sign out
				</button>
			</div>
		{:else}
			<a href="/auth/google" class="mt-2 block w-full rounded-md bg-ink px-5 py-3 text-center text-sm font-medium text-paper hover:opacity-90">Sign in with Google</a>
		{/if}
	</div>

	<div class="border-t border-hairline pt-6">
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Your data</h2>
		<button type="button" onclick={() => (confirmDelete = true)} class="btn-danger mt-2 w-full rounded-md px-4 py-3 text-sm font-medium hover:opacity-90">
			Delete my data
		</button>
		<p class="mt-2 text-xs text-steel">Deletes your plan and every logged session, including saved workout progress, so you start fresh. Your account stays.</p>
	</div>
</section>

<ConfirmSheet
	open={confirmSignOut}
	title="Sign out?"
	body="You can sign back in any time with Google."
	confirmLabel="Sign out"
	tone="danger"
	onConfirm={signOut}
	onClose={() => (confirmSignOut = false)}
/>

<HoldConfirmDialog
	open={confirmDelete}
	title="Delete everything?"
	body="This removes your plan, every logged session and your saved workout progress. You start fresh from onboarding. There is no undo."
	holdLabel="Hold to delete everything"
	onConfirm={clearData}
	onClose={() => (confirmDelete = false)}
/>

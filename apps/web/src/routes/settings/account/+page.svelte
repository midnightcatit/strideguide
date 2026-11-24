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

	// Deleting the account is its own sign-out: the server removes the user, every
	// row they own and their sessions, then clears the cookie. A logout call first
	// would revoke the session and leave nothing to authenticate the delete with.
	async function deleteAccount() {
		try {
			await api.deleteAccount();
		} catch {
			// proceed to a fresh start either way
		}
		try {
			for (const k of Object.keys(localStorage)) {
				if (k.startsWith('sg:')) localStorage.removeItem(k);
			}
		} catch {
			// ignore
		}
		window.location.href = '/';
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
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Delete account</h2>
		<button type="button" onclick={() => (confirmDelete = true)} class="btn-danger mt-2 w-full rounded-md px-4 py-3 text-sm font-medium hover:opacity-90">
			Delete my account
		</button>
		<p class="mt-2 text-xs text-steel">Deletes your account and everything in it: your plan, every logged session, your saved workout progress and your connected health data. You are signed out, and signing in again starts a new account from scratch. There is no undo.</p>
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
	title="Delete your account?"
	body="This deletes your account and everything in it, including your plan and every logged session. You are signed out, and signing in again starts a new account from scratch. There is no undo."
	holdLabel="Hold to delete my account"
	onConfirm={deleteAccount}
	onClose={() => (confirmDelete = false)}
/>

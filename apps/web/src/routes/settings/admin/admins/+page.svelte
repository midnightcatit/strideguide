<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import { api, type AdminListItem } from '$lib/api';

	let loading = $state(true);
	let isAdmin = $state(false);
	let admins = $state<AdminListItem[]>([]);
	let email = $state('');
	let message = $state('');
	let error = $state('');
	let pendingRemove = $state<string | null>(null);

	async function load() {
		try {
			const res = await api.adminAdmins();
			admins = res.admins;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load admins.';
		}
	}

	async function invite(event: SubmitEvent) {
		event.preventDefault();
		message = '';
		error = '';
		try {
			await api.adminInviteAdmin(email.trim());
			email = '';
			message = 'Admin added.';
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not add that admin.';
		}
	}

	async function remove(admin: AdminListItem) {
		if (!admin.id) return;
		if (pendingRemove !== admin.email) {
			pendingRemove = admin.email;
			return;
		}
		pendingRemove = null;
		message = '';
		error = '';
		try {
			await api.adminRemoveAdmin(admin.id);
			message = `${admin.email} is no longer an admin.`;
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not remove that admin.';
		}
	}

	function invitedLabel(admin: AdminListItem): string {
		if (admin.isRoot) return 'Root admin, locked';
		if (admin.invitedAt) {
			const date = new Date(admin.invitedAt);
			return Number.isNaN(date.getTime())
				? 'Admin'
				: `Admin since ${date.toLocaleDateString()}`;
		}
		return 'Admin';
	}

	onMount(async () => {
		try {
			const me = await api.adminMe();
			isAdmin = me.isAdmin;
			if (!isAdmin) return;
			await load();
		} finally {
			loading = false;
		}
	});
</script>

<SettingsHeader title="Admins" />

{#if loading}
	<p class="text-sm text-steel">Loading.</p>
{:else if !isAdmin}
	<p class="text-sm text-steel">This page is only for admins.</p>
{:else}
	<section class="mb-8">
		<h2 class="font-display mb-1 text-lg font-semibold">Admins</h2>
		<p class="mb-4 text-sm leading-relaxed text-steel">
			Admins can open this area and act on accounts. Root admins come from the server's admin
			configuration and cannot be removed here. Someone has to have signed in once before they can
			be given admin access.
		</p>

		<form class="mb-5 flex items-end gap-3" onsubmit={invite}>
			<label class="block flex-1">
				<span class="mb-1 block text-xs uppercase tracking-wider text-steel">Add by email</span>
				<input
					type="email"
					bind:value={email}
					required
					placeholder="name@example.com"
					class="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm"
				/>
			</label>
			<button
				type="submit"
				class="rounded-lg border border-hairline-strong px-4 py-2 text-sm hover:border-signal hover:text-signal-ink"
			>
				Add admin
			</button>
		</form>

		{#if message}
			<p class="mb-3 text-sm text-steel" role="status">{message}</p>
		{/if}
		{#if error}
			<p class="mb-3 text-sm text-signal-ink" role="alert">{error}</p>
		{/if}

		<ul class="divide-y divide-hairline rounded-xl border border-hairline bg-paper">
			{#each admins as admin (admin.email)}
				<li class="flex items-center justify-between gap-3 px-4 py-3">
					<div class="min-w-0">
						<p class="truncate text-sm">{admin.email}</p>
						<p class="text-xs text-steel">{invitedLabel(admin)}</p>
					</div>
					{#if !admin.isRoot && admin.id}
						<button
							type="button"
							onclick={() => remove(admin)}
							class="rounded-md border border-hairline-strong px-3 py-1.5 text-xs hover:border-signal hover:text-signal-ink"
						>
							{pendingRemove === admin.email ? 'Confirm remove' : 'Remove'}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

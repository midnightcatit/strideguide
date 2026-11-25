<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import { api, type AdminOps, type AdminUser } from '$lib/api';

	let loading = $state(true);
	let isAdmin = $state(false);
	let users = $state<AdminUser[]>([]);
	let ops = $state<AdminOps | null>(null);
	let error = $state('');

	function formatDate(iso: string | null): string {
		if (!iso) return 'None';
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return 'Unknown';
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}

	function formatTime(iso: string | null): string {
		if (!iso) return 'Unknown time';
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return 'Unknown time';
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function roleLabel(user: AdminUser): string {
		if (user.isRoot) return 'Admin, locked';
		return user.role === 'admin' ? 'Admin' : 'User';
	}

	onMount(async () => {
		try {
			const me = await api.adminMe();
			isAdmin = me.isAdmin;
			if (!isAdmin) return;
			const [usersRes, opsRes] = await Promise.all([api.adminUsers(), api.adminOps()]);
			users = usersRes.users;
			ops = opsRes;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load admin data.';
		} finally {
			loading = false;
		}
	});
</script>

<SettingsHeader title="Admin" />

{#if loading}
	<p class="text-sm text-steel">Loading.</p>
{:else if !isAdmin}
	<p class="text-sm text-steel">This page is only for admins.</p>
{:else if error}
	<div class="rounded-xl border border-hairline bg-paper p-4">
		<p role="alert" class="text-sm text-steel">{error}</p>
	</div>
{:else}
	<section class="mb-8">
		<h2 class="font-display mb-1 text-lg font-semibold">Users</h2>
		<p class="mb-4 text-sm leading-relaxed text-steel">
			Metadata only. Health values, logs, notes and other private content are never shown here.
			Admins listed as locked come from the server's admin configuration and cannot be changed in
			the app.
		</p>

		<div class="overflow-x-auto rounded-xl border border-hairline">
			<table class="w-full min-w-[40rem] border-collapse text-sm">
				<thead>
					<tr class="border-b border-hairline text-left text-xs uppercase tracking-wider text-steel">
						<th scope="col" class="px-3 py-2 font-medium">Email</th>
						<th scope="col" class="px-3 py-2 font-medium">Role</th>
						<th scope="col" class="px-3 py-2 font-medium">Goal</th>
						<th scope="col" class="px-3 py-2 font-medium">Plans</th>
						<th scope="col" class="px-3 py-2 font-medium">Last log</th>
						<th scope="col" class="px-3 py-2 font-medium">Connections</th>
						<th scope="col" class="px-3 py-2 font-medium">Joined</th>
					</tr>
				</thead>
				<tbody>
					{#each users as user (user.id)}
						<tr class="border-b border-hairline last:border-b-0">
							<td class="px-3 py-2 font-medium text-ink">{user.email}</td>
							<td class="px-3 py-2">
								<span
									class="rounded-full px-2 py-0.5 text-xs {user.isRoot || user.role === 'admin'
										? 'bg-signal-wash text-signal-ink'
										: 'bg-sunken text-steel'}"
								>
									{roleLabel(user)}
								</span>
							</td>
							<td class="px-3 py-2 text-steel">{user.goalProfileSlug ?? 'None'}</td>
							<td class="tabular px-3 py-2 text-steel">{user.planCount}</td>
							<td class="px-3 py-2 text-steel">{formatDate(user.lastLogAt)}</td>
							<td class="px-3 py-2 text-steel">
								{user.connectionCount}
								{#if user.connectionStatus === 'error'}
									<span class="ml-1 text-xs text-danger">needs attention</span>
								{/if}
							</td>
							<td class="px-3 py-2 text-steel">{formatDate(user.createdAt)}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-3 py-4 text-sm text-steel">No users yet.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if ops}
		<section class="grid gap-6">
			<div>
				<h2 class="font-display mb-1 text-lg font-semibold">Errors in the last 24 hours</h2>
				<p class="mb-4 text-sm text-steel">
					{ops.appErrors.recentCount} API errors and {ops.clientErrors.recentCount} client errors.
				</p>

				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<h3 class="mb-2 text-sm font-medium">Recent API errors</h3>
						{#if ops.appErrors.items.length}
							<ul class="grid gap-2">
								{#each ops.appErrors.items as item, i (i)}
									<li class="rounded-lg border border-hairline bg-paper p-3">
										<p class="text-xs text-steel">{formatTime(item.at)}</p>
										<p class="mt-1 truncate text-sm font-medium text-ink">
											{item.name ?? 'Error'}
										</p>
										<p class="truncate text-sm text-steel">{item.message ?? 'No message'}</p>
										<p class="mt-1 truncate text-xs text-steel">
											{item.method ?? ''}
											{item.path ?? ''}
										</p>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-sm text-steel">Nothing recent.</p>
						{/if}
					</div>

					<div>
						<h3 class="mb-2 text-sm font-medium">Recent client errors</h3>
						{#if ops.clientErrors.items.length}
							<ul class="grid gap-2">
								{#each ops.clientErrors.items as item, i (i)}
									<li class="rounded-lg border border-hairline bg-paper p-3">
										<p class="text-xs text-steel">{formatTime(item.at)}</p>
										<p class="mt-1 truncate text-sm font-medium text-ink">
											{item.name ?? 'Error'}
										</p>
										<p class="truncate text-sm text-steel">{item.message ?? 'No message'}</p>
										<p class="mt-1 truncate text-xs text-steel">{item.path ?? ''}</p>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-sm text-steel">Nothing recent.</p>
						{/if}
					</div>
				</div>
			</div>

			<div>
				<h2 class="font-display mb-1 text-lg font-semibold">Rate limits</h2>
				<p class="text-sm leading-relaxed text-steel">
					{ops.rateLimits.keys} keys tracked, {ops.rateLimits.totalCount} requests counted in the
					current windows.
					{#if ops.rateLimits.newestWindowStart}
						Newest window started {formatTime(ops.rateLimits.newestWindowStart)}.
					{/if}
				</p>
			</div>
		</section>
	{/if}
{/if}

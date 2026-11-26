<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import HoldToConfirm from '$lib/components/HoldToConfirm.svelte';
	import { api, type AdminUserDetail } from '$lib/api';

	const id = page.params.id ?? '';

	let loading = $state(true);
	let detail = $state<AdminUserDetail | null>(null);
	let error = $state('');
	let message = $state('');
	let busy = $state<'rebuild' | 'sync' | 'disable' | 'enable' | 'softDelete' | 'restore' | 'delete' | null>(
		null,
	);
	let pendingAction = $state<'rebuild' | 'sync' | 'disable' | 'enable' | 'softDelete' | 'restore' | null>(
		null,
	);

	async function load() {
		try {
			detail = await api.adminUser(id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load this user.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	const CONFIRM = {
		rebuild: {
			title: 'Rebuild this plan?',
			body: "Weeks two onward are rebuilt from the user's week one. Week one is left exactly as it is.",
			confirmLabel: 'Rebuild',
			tone: 'default' as const,
		},
		sync: {
			title: 'Sync connections?',
			body: "Runs a sync for this user's connections now.",
			confirmLabel: 'Sync',
			tone: 'default' as const,
		},
		disable: {
			title: 'Disable this account?',
			body: 'The user is signed out and can no longer sign in or use the app. You can turn it back on later.',
			confirmLabel: 'Disable',
			tone: 'danger' as const,
		},
		enable: {
			title: 'Enable this account?',
			body: 'The user can sign in and use the app again.',
			confirmLabel: 'Enable',
			tone: 'default' as const,
		},
		softDelete: {
			title: 'Delete this account?',
			body: 'The account is hidden and blocked, and the user is signed out. Nothing is erased, and you can restore it later.',
			confirmLabel: 'Delete',
			tone: 'danger' as const,
		},
		restore: {
			title: 'Restore this account?',
			body: 'The account becomes visible and can be used again.',
			confirmLabel: 'Restore',
			tone: 'default' as const,
		},
	};

	const confirm = $derived(pendingAction ? CONFIRM[pendingAction] : CONFIRM.rebuild);

	async function runAction() {
		const action = pendingAction;
		if (!action) return;
		pendingAction = null;
		busy = action;
		error = '';
		message = '';
		try {
			if (action === 'rebuild') detail = await api.adminRebuildPlan(id);
			else if (action === 'sync') detail = await api.adminSyncUser(id);
			else if (action === 'disable') detail = await api.adminDisableUser(id);
			else if (action === 'enable') detail = await api.adminEnableUser(id);
			else if (action === 'softDelete') detail = await api.adminSoftDeleteUser(id);
			else detail = await api.adminRestoreUser(id);
			message =
				action === 'disable'
					? 'Done. The account is disabled.'
					: action === 'enable'
						? 'Done. The account is enabled again.'
						: action === 'softDelete'
							? 'Done. The account is deleted and hidden. You can restore it.'
							: action === 'restore'
								? 'Done. The account is restored.'
								: 'Done. The action finished.';
		} catch (e) {
			error = e instanceof Error ? e.message : 'That action did not finish.';
		} finally {
			busy = null;
		}
	}

	async function deletePermanently() {
		busy = 'delete';
		error = '';
		message = '';
		try {
			const res = await api.adminDeleteUser(id);
			if (res.failed.length) {
				error = `The account is gone, but some rows could not be removed: ${res.failed.join(', ')}.`;
				busy = null;
				return;
			}
			await goto('/settings/admin');
		} catch (e) {
			error = e instanceof Error ? e.message : 'That action did not finish.';
			busy = null;
		}
	}

	function formatDate(iso: string | null): string {
		if (!iso) return 'None';
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return 'Unknown';
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

	function roleLabel(user: AdminUserDetail): string {
		if (user.isRoot) return 'Admin, locked';
		return user.role === 'admin' ? 'Admin' : 'User';
	}
</script>

{#if loading}
	<p class="text-sm text-steel">Loading.</p>
{:else if !detail}
	<div class="rounded-xl border border-hairline bg-paper p-4">
		<p role="alert" class="text-sm text-steel">{error || 'No user with that id.'}</p>
	</div>
{:else}
	<header class="mb-6">
		<p class="tabular text-xs uppercase tracking-widest text-steel">User</p>
		<h1 class="font-display mt-1 break-all text-2xl font-bold">{detail.email}</h1>
		<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
			<span
				class="rounded-full px-2 py-0.5 text-xs {detail.isRoot || detail.role === 'admin'
					? 'bg-signal-wash text-signal-ink'
					: 'bg-sunken text-steel'}"
			>
				{roleLabel(detail)}
			</span>
			{#if detail.deleted}
				<span class="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">Deleted</span>
				<span class="text-steel">since {formatDate(detail.deletedAt)}</span>
			{:else if detail.disabled}
				<span class="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">Disabled</span>
				<span class="text-steel">since {formatDate(detail.disabledAt)}</span>
			{:else}
				<span class="rounded-full bg-sunken px-2 py-0.5 text-xs text-steel">Active</span>
			{/if}
			<span class="text-steel">Joined {formatDate(detail.createdAt)}</span>
		</div>
	</header>

	{#if detail.deleted}
		<div class="mb-6 rounded-xl border border-danger/40 bg-danger/5 p-4">
			<p class="text-sm text-danger">
				This account is deleted and hidden. The user cannot sign in. Restore it below, or delete it
				permanently.
			</p>
		</div>
	{/if}

	{#if detail.disabled}
		<div class="mb-6 rounded-xl border border-danger/40 bg-danger/5 p-4">
			<p class="text-sm text-danger">
				This account is disabled. The user cannot sign in or use the app until it is enabled again.
			</p>
		</div>
	{/if}

	{#if error}
		<div class="mb-4 rounded-xl border border-hairline bg-paper p-4">
			<p role="alert" class="text-sm text-steel">{error}</p>
		</div>
	{/if}
	{#if message}
		<div class="mb-4 rounded-xl border border-hairline bg-sunken p-4">
			<p role="status" class="text-sm text-steel">{message}</p>
		</div>
	{/if}

	<section class="mb-8">
		<h2 class="font-display mb-3 text-lg font-semibold">Actions</h2>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				onclick={() => (pendingAction = 'rebuild')}
				disabled={busy !== null}
				class="rounded-md border border-hairline-strong px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink disabled:opacity-50"
			>
				{busy === 'rebuild' ? 'Rebuilding.' : 'Rebuild plan'}
			</button>
			<button
				type="button"
				onclick={() => (pendingAction = 'sync')}
				disabled={busy !== null}
				class="rounded-md border border-hairline-strong px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink disabled:opacity-50"
			>
				{busy === 'sync' ? 'Syncing.' : 'Sync connections'}
			</button>
			{#if detail.disabled}
				<button
					type="button"
					onclick={() => (pendingAction = 'enable')}
					disabled={busy !== null}
					class="rounded-md border border-hairline-strong px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink disabled:opacity-50"
				>
					{busy === 'enable' ? 'Enabling.' : 'Enable account'}
				</button>
			{:else}
				<button
					type="button"
					onclick={() => (pendingAction = 'disable')}
					disabled={busy !== null || detail.isRoot || detail.role === 'admin'}
					title={detail.isRoot || detail.role === 'admin'
						? 'Locked admins cannot be disabled.'
						: undefined}
					class="rounded-md border border-danger/50 px-4 py-2.5 text-sm text-danger hover:border-danger disabled:cursor-not-allowed disabled:opacity-40"
				>
					{busy === 'disable' ? 'Disabling.' : 'Disable account'}
				</button>
				{#if detail.isRoot || detail.role === 'admin'}
					<p class="self-center text-xs text-steel">
						Root admins and admins cannot be disabled here.
					</p>
				{/if}
			{/if}

			{#if detail.deleted}
				<button
					type="button"
					onclick={() => (pendingAction = 'restore')}
					disabled={busy !== null}
					class="rounded-md border border-hairline-strong px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink disabled:opacity-50"
				>
					{busy === 'restore' ? 'Restoring.' : 'Restore account'}
				</button>
			{:else}
				<button
					type="button"
					onclick={() => (pendingAction = 'softDelete')}
					disabled={busy !== null || detail.isRoot || detail.role === 'admin'}
					title={detail.isRoot || detail.role === 'admin'
						? 'Locked admins cannot be deleted.'
						: undefined}
					class="rounded-md border border-danger/50 px-4 py-2.5 text-sm text-danger hover:border-danger disabled:cursor-not-allowed disabled:opacity-40"
				>
					{busy === 'softDelete' ? 'Deleting.' : 'Delete account'}
				</button>
			{/if}
		</div>

		{#if !detail.isRoot && detail.role !== 'admin'}
			<div class="mt-4 max-w-sm">
				<HoldToConfirm
					label="Hold for 5 seconds to delete permanently"
					holdingLabel="Keep holding,"
					disabled={busy !== null}
					onconfirm={deletePermanently}
				/>
				<p class="mt-2 text-xs text-steel">
					Permanent delete removes the account and everything it owns. This cannot be undone.
				</p>
			</div>
		{/if}
	</section>

	<section class="mb-8">
		<h2 class="font-display mb-3 text-lg font-semibold">Goals</h2>
		{#if detail.goals.length}
			<ul class="divide-y divide-hairline rounded-xl border border-hairline">
				{#each detail.goals as goal, i (i)}
					<li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
						<span class="font-medium text-ink">{goal.slug}</span>
						<span class="text-steel">
							{goal.status} · target {goal.targetDate ?? 'None'} · created {formatDate(goal.createdAt)}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-steel">No goals.</p>
		{/if}
	</section>

	<section class="mb-8">
		<h2 class="font-display mb-3 text-lg font-semibold">Plans</h2>
		{#if detail.plans.length}
			<ul class="divide-y divide-hairline rounded-xl border border-hairline">
				{#each detail.plans as plan, i (i)}
					<li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
						<span class="font-medium text-ink">Version {plan.version}</span>
						<span class="text-steel">
							{plan.status} · {plan.weekCount} weeks · generated {formatDate(plan.generatedAt)}
						</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-steel">No plans.</p>
		{/if}
	</section>

	<section class="mb-8">
		<h2 class="font-display mb-3 text-lg font-semibold">Logs</h2>
		<p class="text-sm text-steel">
			{detail.logs.count} logs.
			{#if detail.logs.count > 0}
				Earliest {formatDate(detail.logs.earliest)}, latest {formatDate(detail.logs.latest)}.
			{/if}
			Counts and dates only; log contents are never shown.
		</p>
	</section>

	<section class="mb-8">
		<h2 class="font-display mb-3 text-lg font-semibold">Connections</h2>
		{#if detail.connections.length}
			<ul class="divide-y divide-hairline rounded-xl border border-hairline">
				{#each detail.connections as conn, i (i)}
					<li class="px-3 py-2 text-sm">
						<div class="flex items-center justify-between gap-3">
							<span class="font-medium text-ink">{conn.provider}</span>
							<span class={conn.status === 'error' ? 'text-danger' : 'text-steel'}>{conn.status}</span>
						</div>
						<p class="text-xs text-steel">Last synced {formatDate(conn.lastSyncedAt)}</p>
						{#if conn.lastError}
							<p class="text-xs text-steel">Last error: {conn.lastError}</p>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-steel">No connections.</p>
		{/if}
	</section>

	<section class="mb-8">
		<h2 class="font-display mb-3 text-lg font-semibold">Health coverage</h2>
		{#if detail.healthCoverage.length}
			<div class="overflow-x-auto rounded-xl border border-hairline">
				<table class="w-full min-w-[28rem] border-collapse text-sm">
					<thead>
						<tr class="border-b border-hairline text-left text-xs uppercase tracking-wider text-steel">
							<th scope="col" class="px-3 py-2 font-medium">Metric</th>
							<th scope="col" class="px-3 py-2 font-medium">Rows</th>
							<th scope="col" class="px-3 py-2 font-medium">First</th>
							<th scope="col" class="px-3 py-2 font-medium">Last</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.healthCoverage as metric, i (i)}
							<tr class="border-b border-hairline last:border-b-0">
								<td class="px-3 py-2 font-medium text-ink">{metric.metric}</td>
								<td class="tabular px-3 py-2 text-steel">{metric.rows}</td>
								<td class="px-3 py-2 text-steel">{metric.firstDate ?? 'None'}</td>
								<td class="px-3 py-2 text-steel">{metric.lastDate ?? 'None'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="mt-2 text-xs text-steel">Coverage only: how many rows and the date span, never a value.</p>
		{:else}
			<p class="text-sm text-steel">No health metrics.</p>
		{/if}
	</section>

	<section>
		<h2 class="font-display mb-3 text-lg font-semibold">Recent admin actions</h2>
		{#if detail.actions.length}
			<ul class="divide-y divide-hairline rounded-xl border border-hairline">
				{#each detail.actions as action (action.id)}
					<li class="px-3 py-2 text-sm">
						<div class="flex items-center justify-between gap-3">
							<span class="font-medium text-ink">{action.action}</span>
							<span class="text-xs text-steel">{formatTime(action.createdAt)}</span>
						</div>
						<p class="text-xs text-steel">by actor {action.actorId}</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-steel">No admin actions recorded for this user.</p>
		{/if}
	</section>
{/if}

<ConfirmSheet
	open={pendingAction !== null}
	title={confirm.title}
	body={confirm.body}
	confirmLabel={confirm.confirmLabel}
	tone={confirm.tone}
	onConfirm={() => void runAction()}
	onClose={() => (pendingAction = null)}
/>

<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import { api, type AdminLoadShadow } from '$lib/api';

	/**
	 * The load model's records, across accounts. It shows what the model would
	 * have eased or held in shadow and advisory modes, and what it did in apply
	 * mode, with the fitness, fatigue and form behind each read. Metadata only,
	 * and a plan only has a record when it was generated or adapted, so an account
	 * that never rebuilds shows nothing new here.
	 */
	let loading = $state(true);
	let isAdmin = $state(false);
	let view = $state<AdminLoadShadow | null>(null);
	let error = $state('');

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

	const round = (v: number | null) => (v == null ? 'n/a' : String(Math.round(v)));

	const weekLabel = (week: number | null) => (week == null ? 'No change' : `Week ${week}`);

	const volumeLabel = (from: number | null, to: number | null) =>
		from == null || to == null ? 'none' : `${Math.round(from)} to ${Math.round(to)}`;

	onMount(async () => {
		try {
			const me = await api.adminMe();
			isAdmin = me.isAdmin;
			if (!isAdmin) return;
			view = await api.adminLoadShadow({ limit: 100 });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load the model records.';
		} finally {
			loading = false;
		}
	});
</script>

<SettingsHeader title="Load model" />

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
		<p class="mb-2 text-sm">
			<a href="/settings/admin" class="text-signal-ink hover:underline">Back to admin</a>
		</p>
		<h2 class="font-display mb-1 text-lg font-semibold">Load model decisions</h2>
		<p class="mb-4 text-sm leading-relaxed text-steel">
			Each row is a week the load model eased or held, or would have eased or held, depending on
			the mode that produced the record. Shadow and advisory change no plan; apply does. A row
			with no week means the model ran and found nothing to change. A plan only has a record when
			it was generated or adapted, so an account that never rebuilds adds nothing new here.
		</p>

		{#if view}
			<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
				<div class="rounded-lg border border-hairline bg-paper p-3">
					<p class="tabular text-lg font-semibold">{view.summary.plans}</p>
					<p class="text-xs text-steel">Plans with records</p>
				</div>
				<div class="rounded-lg border border-hairline bg-paper p-3">
					<p class="tabular text-lg font-semibold">{view.summary.users}</p>
					<p class="text-xs text-steel">Accounts</p>
				</div>
				<div class="rounded-lg border border-hairline bg-paper p-3">
					<p class="tabular text-lg font-semibold">{view.summary.records}</p>
					<p class="text-xs text-steel">Records</p>
				</div>
				<div class="rounded-lg border border-hairline bg-paper p-3">
					<p class="tabular text-lg font-semibold">{view.summary.ease}</p>
					<p class="text-xs text-steel">Ease</p>
				</div>
				<div class="rounded-lg border border-hairline bg-paper p-3">
					<p class="tabular text-lg font-semibold">{view.summary.hold}</p>
					<p class="text-xs text-steel">Hold</p>
				</div>
			</div>

			{#if Object.keys(view.summary.byMode).length > 0}
				<p class="mb-4 text-sm text-steel">
					Plans by mode:
					{Object.entries(view.summary.byMode)
						.map(([mode, count]) => `${mode} ${count}`)
						.join(', ')}.
				</p>
			{/if}

			<div class="overflow-x-auto rounded-xl border border-hairline">
				<table class="w-full min-w-[52rem] border-collapse text-sm">
					<thead>
						<tr class="border-b border-hairline text-left text-xs uppercase tracking-wider text-steel">
							<th scope="col" class="px-3 py-2 font-medium">When</th>
							<th scope="col" class="px-3 py-2 font-medium">Mode</th>
							<th scope="col" class="px-3 py-2 font-medium">Account</th>
							<th scope="col" class="px-3 py-2 font-medium">Week</th>
							<th scope="col" class="px-3 py-2 font-medium">Intent</th>
							<th scope="col" class="px-3 py-2 font-medium">Volume (km)</th>
							<th scope="col" class="px-3 py-2 font-medium">Fitness</th>
							<th scope="col" class="px-3 py-2 font-medium">Fatigue</th>
							<th scope="col" class="px-3 py-2 font-medium">Form</th>
						</tr>
					</thead>
					<tbody>
						{#each view.decisions as d, i (i)}
							<tr class="border-b border-hairline last:border-b-0">
								<td class="px-3 py-2 text-steel">{formatTime(d.at)}</td>
								<td class="px-3 py-2 text-steel">{d.mode ?? 'unknown'}</td>
								<td class="px-3 py-2 text-ink">{d.email}</td>
								<td class="tabular px-3 py-2 text-steel">{weekLabel(d.weekNumber)}</td>
								<td class="px-3 py-2 text-steel">{d.intent ?? 'none'}</td>
								<td class="tabular px-3 py-2 text-steel">
									{volumeLabel(d.fromVolumeKm, d.toVolumeKm)}
								</td>
								<td class="tabular px-3 py-2 text-steel">{round(d.fitness)}</td>
								<td class="tabular px-3 py-2 text-steel">{round(d.fatigue)}</td>
								<td class="tabular px-3 py-2 text-steel">{round(d.form)}</td>
							</tr>
						{:else}
							<tr>
								<td colspan="9" class="px-3 py-4 text-sm text-steel">
									No load records yet. They appear once plans are generated or adapted with
									the model on.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
{/if}

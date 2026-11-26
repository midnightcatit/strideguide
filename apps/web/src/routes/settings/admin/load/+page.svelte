<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import { api, type AdminLoadShadow } from '$lib/api';

	/**
	 * The load model's shadow records, across accounts. It exists to decide whether
	 * to turn `apply` on: it shows what the model would have eased or held, and the
	 * fitness, fatigue and form behind each one. Metadata only, and a plan only has
	 * a record when it was generated or adapted, so an account that never rebuilds
	 * shows nothing new here.
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

	onMount(async () => {
		try {
			const me = await api.adminMe();
			isAdmin = me.isAdmin;
			if (!isAdmin) return;
			view = await api.adminLoadShadow({ limit: 100 });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load the shadow records.';
		} finally {
			loading = false;
		}
	});
</script>

<SettingsHeader title="Load shadow" />

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
		<h2 class="font-display mb-1 text-lg font-semibold">What the model would change</h2>
		<p class="mb-4 text-sm leading-relaxed text-steel">
			Each row is a week the load model would have eased or held had it been switched to apply. It
			is recorded while the model runs in shadow, which changes no plan. The mode shown is the
			mode that produced the record. A plan only has a record when it was generated or adapted, so
			an account that never rebuilds adds nothing new here.
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
					<p class="text-xs text-steel">Would ease</p>
				</div>
				<div class="rounded-lg border border-hairline bg-paper p-3">
					<p class="tabular text-lg font-semibold">{view.summary.hold}</p>
					<p class="text-xs text-steel">Would hold</p>
				</div>
			</div>

			<div class="overflow-x-auto rounded-xl border border-hairline">
				<table class="w-full min-w-[52rem] border-collapse text-sm">
					<thead>
						<tr class="border-b border-hairline text-left text-xs uppercase tracking-wider text-steel">
							<th scope="col" class="px-3 py-2 font-medium">When</th>
							<th scope="col" class="px-3 py-2 font-medium">Account</th>
							<th scope="col" class="px-3 py-2 font-medium">Week</th>
							<th scope="col" class="px-3 py-2 font-medium">Would</th>
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
								<td class="px-3 py-2 text-ink">{d.email}</td>
								<td class="tabular px-3 py-2 text-steel">Week {d.weekNumber}</td>
								<td class="px-3 py-2 text-steel">{d.intent}</td>
								<td class="tabular px-3 py-2 text-steel">
									{Math.round(d.fromVolumeKm)} to {Math.round(d.toVolumeKm)}
								</td>
								<td class="tabular px-3 py-2 text-steel">{round(d.fitness)}</td>
								<td class="tabular px-3 py-2 text-steel">{round(d.fatigue)}</td>
								<td class="tabular px-3 py-2 text-steel">{round(d.form)}</td>
							</tr>
						{:else}
							<tr>
								<td colspan="8" class="px-3 py-4 text-sm text-steel">
									No shadow records yet. They appear once plans are generated or adapted with
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

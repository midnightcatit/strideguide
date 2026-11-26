<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type LoadReadPayload } from '$lib/api';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	/**
	 * A small read-out of the load model: the current fitness, fatigue and form,
	 * and what it would ease or hold in the weeks ahead. Descriptive only, shown
	 * when the runner has the model switched on, and silent otherwise.
	 */
	let data = $state<LoadReadPayload | null>(null);

	onMount(() => {
		void api
			.loadRead()
			.then((r) => {
				data = r;
			})
			.catch(() => {
				// The model is optional and best-effort; a failure shows nothing.
			});
	});

	const round = (v: number) => Math.round(v);
</script>

{#if data?.available && data.readout}
	<section aria-labelledby="load-h" class="mt-7">
		<SectionHeader id="load-h" eyebrow="Training load" meta="fitness, fatigue and form" />
		<Card>
			<div class="grid grid-cols-3 gap-3 text-center">
				<div>
					<p class="tabular text-xl font-semibold">{round(data.readout!.fitness)}</p>
					<p class="text-xs text-steel">Fitness</p>
				</div>
				<div>
					<p class="tabular text-xl font-semibold">{round(data.readout!.fatigue)}</p>
					<p class="text-xs text-steel">Fatigue</p>
				</div>
				<div>
					<p class="tabular text-xl font-semibold">{round(data.readout!.form)}</p>
					<p class="text-xs text-steel">Form</p>
				</div>
			</div>
			<p class="mt-3 text-sm text-ink">{data.readout!.status}</p>
			{#if data.weekIntents.length}
				<ul class="mt-3 space-y-1 text-sm text-steel">
					{#each data.weekIntents.slice(0, 3) as w (w.weekNumber)}
						<li>Week {w.weekNumber}: {w.reason}</li>
					{/each}
				</ul>
			{/if}
			<p class="mt-3 text-xs text-steel">
				A descriptive trend, not a prediction. The measured benefit of adaptive training over
				a fixed plan is small, so this is a read, not a promise.
			</p>
		</Card>
	</section>
{/if}

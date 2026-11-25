<script lang="ts">
	import { mediaForMove, type Drill } from '@strideguide/shared/plan';
	import ExerciseDetail from '$lib/components/ExerciseDetail.svelte';

	/**
	 * The expandable drill list for warm-ups and stretches: each drill opens to
	 * its two-pose demo (when the library has one), what it works, the cues and
	 * what to watch for. Used by the Preview sheet, so warm-ups and stretches
	 * read the same as strength moves.
	 */
	let { drills }: { drills: Drill[] } = $props();

	let open = $state<string | null>(null);
</script>

{#if drills.length}
	<ul class="space-y-1">
		{#each drills as d (d.name)}
			<li>
				<button
					type="button"
					onclick={() => (open = open === d.name ? null : d.name)}
					aria-expanded={open === d.name}
					class="flex w-full items-baseline justify-between gap-3 border-b border-hairline py-2.5 text-left text-sm hover:text-signal-ink"
				>
					<span class="font-medium">{d.name}</span>
					<span class="tabular shrink-0 text-xs text-steel">{open === d.name ? '−' : '+'}</span>
				</button>
				{#if open === d.name}
					<ExerciseDetail
						name={d.name}
						media={mediaForMove(d.name)}
						why={d.why}
						works={`${d.feel} Targets ${d.targets.join(', ')}.`}
						form={d.form}
						mistakes={d.mistakes}
					/>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

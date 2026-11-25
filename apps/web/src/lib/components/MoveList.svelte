<script lang="ts">
	import { mediaForMove, type MachineExercise } from '@strideguide/shared/plan';
	import ExerciseDetail from '$lib/components/ExerciseDetail.svelte';

	/**
	 * The expandable move list for a strength session: each move opens to its
	 * demo, what it works, the cues and what to avoid. Used by the Preview sheet,
	 * so a move reads the same there.
	 */
	let { machines }: { machines: MachineExercise[] } = $props();

	let open = $state<string | null>(null);

	/** Plain-language line for a move, built from the researched catalog. */
	function line(m: MachineExercise): string {
		return `Works your ${m.muscles.join(' and ')}. ${m.feel}`;
	}
</script>

<ul class="space-y-1">
	{#each machines as m (m.name)}
		<li>
			<button
				type="button"
				onclick={() => (open = open === m.name ? null : m.name)}
				aria-expanded={open === m.name}
				class="flex w-full items-baseline justify-between gap-3 border-b border-hairline py-2.5 text-left text-sm hover:text-signal-ink"
			>
				<span class="font-medium">{m.name}</span>
				<span class="tabular shrink-0 text-xs text-steel">{open === m.name ? '−' : '+'}</span>
			</button>
			{#if open === m.name}
				<ExerciseDetail
					name={m.name}
					media={mediaForMove(m.name)}
					why={m.why}
					works={line(m)}
					form={m.form}
					mistakes={m.mistakes}
					avoidLabel="Avoid"
				/>
			{/if}
		</li>
	{/each}
</ul>

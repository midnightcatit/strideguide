<script lang="ts">
	import { mediaForMove, type MachineExercise } from '@strideguide/shared/plan';
	import MoveDemo from '$lib/components/MoveDemo.svelte';

	/**
	 * The expandable move list for a strength session: each move opens to its
	 * demo, what it works, the cues and what to avoid. Shared by the drill-down
	 * page's move section and the Preview sheet, so both read the same.
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
				<div class="pb-3 pt-1">
					{#if mediaForMove(m.name)}
						<div class="mb-3"><MoveDemo media={mediaForMove(m.name)!} name={m.name} /></div>
					{/if}
					<p class="text-sm leading-relaxed">{m.why}</p>
					<p class="mt-2 text-sm leading-relaxed text-steel">{line(m)}</p>
					<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">Form</p>
					<ul class="mt-1 space-y-1 text-sm">
						{#each m.form as cue, ci (ci)}
							<li class="flex gap-2"><span class="text-steel">·</span><span>{cue}</span></li>
						{/each}
					</ul>
					<p class="mt-2 text-xs text-steel">Avoid: {m.mistakes.join('; ').toLowerCase()}.</p>
				</div>
			{/if}
		</li>
	{/each}
</ul>

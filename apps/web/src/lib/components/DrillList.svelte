<script lang="ts">
	import { mediaForMove, type Drill } from '@strideguide/shared/plan';
	import MoveDemo from '$lib/components/MoveDemo.svelte';

	/**
	 * The expandable drill list for warm-ups and stretches: each drill opens to
	 * its two-pose demo (when the library has one), what it works, the cues and
	 * what to watch for. Shared by the drill-down page and the Preview sheet, so
	 * warm-ups and stretches read the same as strength moves.
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
					<div class="pb-3 pt-1">
						{#if mediaForMove(d.name)}
							<div class="mb-3"><MoveDemo media={mediaForMove(d.name)!} name={d.name} /></div>
						{/if}
						<p class="text-sm leading-relaxed">{d.why}</p>
						<p class="mt-2 text-sm leading-relaxed text-steel">{d.feel} Targets {d.targets.join(', ')}.</p>
						<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">Form</p>
						<ul class="mt-1 space-y-1 text-sm">
							{#each d.form as f (f)}<li class="flex gap-2"><span class="text-steel">·</span><span>{f}</span></li>{/each}
						</ul>
						<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">Watch for</p>
						<ul class="mt-1 space-y-1 text-sm text-steel">
							{#each d.mistakes as m (m)}<li class="flex gap-2"><span aria-hidden="true">·</span><span>{m}</span></li>{/each}
						</ul>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<script lang="ts">
	import { setUnits } from '$lib/prefs.svelte';

	let { current }: { current: 'metric' | 'imperial' } = $props();
</script>

<div class="inline-flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Distance units">
	{#each [{ v: 'metric', label: 'KM' }, { v: 'imperial', label: 'MI' }] as opt (opt.v)}
		<button
			type="button"
			aria-pressed={current === opt.v}
			onclick={() => setUnits(opt.v as 'metric' | 'imperial')}
			class="tabular px-2 py-1 text-xs transition-colors {current === opt.v
				? 'bg-ink text-paper'
				: 'text-steel hover:text-ink'}"
		>
			{opt.label}
		</button>
	{/each}
</div>

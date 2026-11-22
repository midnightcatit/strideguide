<script lang="ts">
	import type { ClientPrescription } from '$lib/plan';

	let {
		intensity = 'easy',
		label = true,
	}: {
		intensity?: ClientPrescription['intensity'];
		label?: boolean;
	} = $props();

	const level = $derived(intensity === 'hard' ? 3 : intensity === 'steady' ? 2 : 1);
</script>

<span class="inline-flex items-center gap-1" title="Intensity: {intensity}">
	{#if label}
		<span class="tabular text-xs text-steel">{intensity}</span>
	{/if}
	<span class="inline-flex gap-0.5" aria-hidden="true">
		{#each [1, 2, 3] as i (i)}
			<span class="h-2 w-2 rounded-[1px] {i <= level ? 'bg-ink' : 'bg-ink/25'}"></span>
		{/each}
	</span>
	<span class="sr-only">Intensity {intensity}</span>
</span>

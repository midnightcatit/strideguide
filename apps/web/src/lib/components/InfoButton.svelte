<script lang="ts">
	let {
		term,
		definition,
	}: {
		term: string;
		definition: string;
	} = $props();

	let open = $state(false);
</script>

<span class="relative inline-flex">
	<button
		type="button"
		aria-label="What does {term} mean?"
		aria-expanded={open}
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
		class="pointer-events-auto relative z-20 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-hairline-strong text-[10px] font-medium leading-none text-steel hover:border-signal hover:text-signal-ink"
	>
		i
	</button>
	{#if open}
		<span
			role="tooltip"
			class="absolute left-0 top-6 z-30 block w-60 rounded-lg border border-hairline bg-paper p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg"
		>
			<strong class="font-semibold">{term}.</strong>
			{definition}
		</span>
	{/if}
</span>

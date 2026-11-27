<script lang="ts" generics="T extends string">
	/**
	 * One row of filter chips, the shared shape every filter row in the workout
	 * pickers uses: a category row, a body-part row, the composer's move filters.
	 * The selected chip is filled with the signal wash, an unselected one is a
	 * quiet outline, and every chip keeps a 44px tap target.
	 */
	let {
		options,
		value = $bindable(),
		label,
		class: className = '',
	}: {
		options: { key: T; label: string }[];
		value: T;
		/** The group's name for a screen reader. */
		label: string;
		class?: string;
	} = $props();
</script>

<div class="flex flex-wrap gap-1.5 {className}" role="group" aria-label={label}>
	{#each options as o (o.key)}
		<button
			type="button"
			aria-pressed={value === o.key}
			onclick={() => (value = o.key)}
			class="flex min-h-11 items-center rounded-full border px-3 text-xs {value === o.key
				? 'border-signal-ink bg-signal-wash font-medium text-signal-ink'
				: 'border-hairline text-steel hover:border-steel'}"
		>
			{o.label}
		</button>
	{/each}
</div>

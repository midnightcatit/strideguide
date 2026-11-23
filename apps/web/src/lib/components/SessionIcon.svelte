<script lang="ts">
	let { type, size = 'h-4 w-4' }: { type: string; size?: string } = $props();
</script>

<svg
	class={size}
	viewBox="0 0 20 20"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if type === 'easy' || type === 'steady' || type === 'progression'}
		<path d="M2.5 12q1.75-3.5 3.5 0t3.5 0t3.5 0t3.5 0" />
	{:else if type === 'long'}
		<path d="M3 15h14" />
		<path d="M6.5 15a3.5 3.5 0 0 1 7 0" />
	{:else if type === 'tempo'}
		<path d="M3 12h3l1.5-5 2.5 9 2-6 1.5 2H17" />
	{:else if type === 'threshold'}
		<path d="M3 6c3.5 0 4 7 7 7" />
		<path d="M3 13h3" />
		<path d="M8 13h3" />
		<path d="M13 13h4" />
	{:else if type === 'interval' || type === 'race-pace' || type === 'race'}
		<path d="M4 14V8" />
		<path d="M7.5 14V5" />
		<path d="M11 14V8" />
		<path d="M14.5 14V5" />
		<path d="M3 16h14" />
	{:else if type === 'hills'}
		<path d="M2.5 15l5-8 3.5 5 2-3 4.5 6z" />
	{:else if type === 'fartlek'}
		<path d="M3 12c1.5-4.5 2.5 3 4-1s2 3.5 3.5-2 2.5 2.5 3-1 1.5 1.5 3-1" />
	{:else if type === 'strides'}
		<path d="M4.5 14l2.5-3.5" />
		<path d="M8.5 14l3.5-5" />
		<path d="M12.5 14l4.5-6.5" />
	{:else if type === 'machine-circuit' || type === 'full-body-strength'}
		<path d="M4 8v4" />
		<path d="M6.5 6.5v7" />
		<path d="M13.5 6.5v7" />
		<path d="M16 8v4" />
		<path d="M6.5 10h7" />
	{:else if type === 'mobility'}
		<path d="M10 3.5v13" />
		<path d="M7.5 6 10 3.5 12.5 6" />
		<path d="M7.5 14 10 16.5 12.5 14" />
		<path d="M3.5 10h2.5" />
		<path d="M14 10h2.5" />
	{:else if type === 'recovery'}
		<path d="M5 15C5 8.5 10.5 4 16 4c0 5.5-4.5 11-11 11z" />
		<path d="M5 15c2.5-3.5 5.5-6.5 9-9" />
	{:else if type === 'cross-train'}
		<circle cx="5.5" cy="14" r="2.8" />
		<circle cx="14.5" cy="14" r="2.8" />
		<path d="M5.5 14 9.5 8h4" />
		<path d="M9.5 8 12 14" />
		<path d="M13 8h2" />
	{:else if type === 'walk' || type === 'walk-run'}
		<circle cx="11" cy="4" r="1.6" />
		<path d="M11 6.5v3.5l2.5 2.5" />
		<path d="M11 10 8.5 13" />
		<path d="M8.5 13l-1.5 4" />
		<path d="M13.5 12.5 14 16" />
	{:else}
		<circle cx="10" cy="10" r="6.5" />
	{/if}
</svg>

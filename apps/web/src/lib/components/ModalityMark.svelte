<script lang="ts">
	/**
	 * A tiny marker for a session's modality, sized for a calendar cell. Strength
	 * is a solid dumbbell and mobility a stretching figure, arms up and feet
	 * apart, so the two shapes read apart at a glance even at a small size. The
	 * marker is presentational; the cell's accessible name carries the meaning, so
	 * it is hidden from assistive tech. Drawn inline to match SessionIcon's
	 * hand-authored style.
	 */
	let { modality }: { modality: 'strength' | 'mobility' } = $props();
</script>

<svg class="h-2 w-2" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
	{#if modality === 'strength'}
		<rect x="0.9" y="3.7" width="1.9" height="4.6" rx="0.7" />
		<rect x="9.2" y="3.7" width="1.9" height="4.6" rx="0.7" />
		<rect x="2.7" y="5.1" width="6.6" height="1.8" rx="0.9" />
	{:else}
		<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="6" cy="2.6" r="1.15" fill="currentColor" stroke="none" />
			<path d="M6 4v4.2" />
			<path d="M6 5.1 3.5 3M6 5.1 8.5 3" />
			<path d="M6 8.2 4.4 11M6 8.2 7.6 11" />
		</g>
	{/if}
</svg>

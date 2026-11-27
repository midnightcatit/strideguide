<script lang="ts" generics="C extends string">
	import { BODY_PART_LABELS, type BodyPart } from '@strideguide/shared/plan';
	import FilterChips from '$lib/components/FilterChips.svelte';

	/**
	 * The workout filter control the add lists and the favourites picker share: a
	 * category row, and a body-part row that shows only when the category carries
	 * body parts (strength or mobility). The run list filters by category alone.
	 * The body part stays 'all' while the row is hidden, so a stale pick can never
	 * filter a list that does not offer it.
	 */
	let {
		categories,
		category = $bindable('all' as C),
		bodyParts = [],
		bodyPart = $bindable('all'),
		showBodyParts = false,
	}: {
		categories: { key: C; label: string }[];
		category?: C;
		/** The parts present in the list, in chip order. */
		bodyParts?: BodyPart[];
		bodyPart?: BodyPart | 'all';
		/** True when the picked category files its entries by body part. */
		showBodyParts?: boolean;
	} = $props();

	const partOptions = $derived<{ key: BodyPart | 'all'; label: string }[]>([
		{ key: 'all', label: 'All parts' },
		...bodyParts.map((part) => ({ key: part, label: BODY_PART_LABELS[part] })),
	]);
</script>

<div class="space-y-1.5">
	<FilterChips options={categories} bind:value={category} label="Filter by category" />
	{#if showBodyParts && bodyParts.length}
		<FilterChips options={partOptions} bind:value={bodyPart} label="Filter by body part" />
	{/if}
</div>

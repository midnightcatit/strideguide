<script lang="ts">
	/**
	 * The section's own vertical rhythm lives here, so a page never sets it:
	 * `mt-7` (space-7) is the gap above the section, from whatever block precedes
	 * it, and `mb-2` (space-2) is the gap below, to this section's content. A
	 * header used inside a card, where the card owns the space, sets `topGap` to
	 * false and lets the card's own layout set the rhythm.
	 */
	let {
		id,
		eyebrow,
		meta,
		topGap = true,
	}: {
		id: string;
		eyebrow: string;
		meta?: string;
		topGap?: boolean;
	} = $props();
</script>

<div class="{topGap ? 'mt-7' : ''} mb-2 flex items-baseline justify-between gap-3">
	<h2 id={id} class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</h2>
	{#if meta}<span class="tabular text-xs text-steel">{meta}</span>{/if}
</div>

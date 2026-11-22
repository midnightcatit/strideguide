<script lang="ts">
	let {
		id,
		eyebrow,
		meta,
	}: {
		id: string;
		eyebrow: string;
		meta?: string;
	} = $props();
</script>

<div class="mb-2 flex items-baseline justify-between gap-3">
	<h2 id={id} class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</h2>
	{#if meta}<span class="tabular text-xs text-steel">{meta}</span>{/if}
</div>

<script lang="ts">
	/**
	 * Header for a metric page. The app header breadcrumb already names the
	 * section, so the eyebrow is only drawn when a page has a reason to say more
	 * than the trail does; otherwise just the title shows. The way back is the
	 * breadcrumb, so this carries no back control of its own. `from` stays in the
	 * type for the call sites.
	 */
	let {
		eyebrow,
		title,
	}: {
		eyebrow?: string;
		title: string;
		from?: string;
	} = $props();
</script>

<header class="mb-7">
	{#if eyebrow}
		<p class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
	{/if}
	<h1 class="font-display {eyebrow ? 'mt-1' : ''} text-2xl font-bold">{title}</h1>
</header>

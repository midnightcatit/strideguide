<script lang="ts">
	/**
	 * Header for a metric page: the eyebrow and the title. The way back is the app
	 * header's breadcrumb now, so this carries no back control of its own. `from`
	 * stays in the type for the call sites.
	 */
	let {
		eyebrow,
		title,
	}: {
		eyebrow: string;
		title: string;
		from?: string;
	} = $props();
</script>

<header class="mb-7">
	<p class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
	<h1 class="font-display mt-1 text-2xl font-bold">{title}</h1>
</header>

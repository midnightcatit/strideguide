<script lang="ts">
	/**
	 * Header for a metric page: a back control to wherever the page was opened
	 * from, then the eyebrow and title. The origin is a path the parent passes, so
	 * the same page can be reached from the dashboard or the progress tab and
	 * always offers a way back to where the runner came from.
	 */
	let {
		eyebrow,
		title,
		from = '/progress',
	}: {
		eyebrow: string;
		title: string;
		from?: string;
	} = $props();

	const fromLabel = $derived(from.startsWith('/progress') ? 'Progress' : 'Dashboard');
</script>

<header class="mb-7">
	<a href={from} class="inline-flex items-center gap-1 text-xs text-steel hover:text-signal-ink">
		<span aria-hidden="true">‹</span> {fromLabel}
	</a>
	<p class="tabular mt-3 text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
	<h1 class="font-display mt-1 text-2xl font-bold">{title}</h1>
</header>

<script lang="ts">
	// A settings subpage keeps a back control so the runner can step back to the
	// settings list, or to a parent, without hunting for the tab. It sticks just
	// under the app header so it stays reachable while the page scrolls. The
	// settings list itself uses its own header and carries no back control.
	let {
		title,
		back = '/settings',
		backLabel = 'Settings',
	}: { title: string; back?: string; backLabel?: string } = $props();
</script>

<div
	class="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 mb-4 border-b border-hairline bg-paper/95 px-4 py-1.5 backdrop-blur"
>
	<a
		href={back}
		class="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-steel hover:text-ink"
	>
		<span aria-hidden="true">‹</span> {backLabel}
	</a>
</div>

<h1 class="font-display text-2xl font-bold">{title}</h1>

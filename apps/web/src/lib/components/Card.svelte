<script lang="ts">
	let {
		tone = 'paper',
		children,
	}: {
		tone?: 'paper' | 'sunken';
		children?: import('svelte').Snippet;
	} = $props();
</script>

<div
	class="rounded-xl border border-hairline {tone === 'sunken'
		? 'bg-sunken'
		: 'bg-paper'} p-4 sm:p-5"
>
	{@render children?.()}
</div>

<script lang="ts">
	let {
		tone = 'paper',
		frame = false,
		children,
	}: {
		tone?: 'paper' | 'sunken';
		frame?: boolean;
		children?: import('svelte').Snippet;
	} = $props();
</script>

<div
	class="rounded-xl border border-hairline {tone === 'sunken'
		? 'bg-sunken'
		: 'bg-paper'} p-4 sm:p-5 {frame ? 'stage-card justify-center' : ''}"
>
	{@render children?.()}
</div>

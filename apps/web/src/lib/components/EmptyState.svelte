<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		body,
		icon,
		primaryLabel,
		primaryHref,
		secondaryLabel,
		onSecondary,
	}: {
		eyebrow: string;
		title: string;
		body: string;
		icon?: Snippet;
		primaryLabel?: string;
		primaryHref?: string;
		secondaryLabel?: string;
		onSecondary?: () => void;
	} = $props();
</script>

<section class="mx-auto mt-8 max-w-sm text-center">
	{#if icon}
		<div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-signal-ink">
			{@render icon()}
		</div>
	{/if}
	<p class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
	<h1 class="font-display mt-2 text-2xl font-bold">{title}</h1>
	<p class="mt-3 text-sm leading-relaxed text-steel">{body}</p>
	{#if primaryLabel && primaryHref}
		<a
			href={primaryHref}
			class="mt-6 inline-block rounded-md bg-ink px-5 py-3 text-sm font-semibold text-paper hover:opacity-90"
		>
			{primaryLabel}
		</a>
	{/if}
	{#if secondaryLabel && onSecondary}
		<button type="button" onclick={onSecondary} class="mx-auto mt-3 block text-xs text-steel hover:text-signal-ink">
			{secondaryLabel}
		</button>
	{/if}
</section>

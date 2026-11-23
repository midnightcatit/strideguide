<script lang="ts">
	let {
		percent,
		size = 64,
		stroke = 7,
		showLabel = true,
	}: {
		percent: number;
		size?: number;
		stroke?: number;
		showLabel?: boolean;
	} = $props();

	const r = $derived((size - stroke) / 2);
	const c = $derived(2 * Math.PI * r);
	const clamped = $derived(Math.max(0, Math.min(100, Math.round(percent))));
	const dash = $derived((clamped / 100) * c);
</script>

<div
	class="relative inline-flex shrink-0 items-center justify-center"
	style="width: {size}px; height: {size}px"
	role="img"
	aria-label="{clamped} percent complete"
>
	<svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90" aria-hidden="true">
		<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" stroke-width={stroke} />
		<circle
			cx={size / 2}
			cy={size / 2}
			r={r}
			fill="none"
			stroke="var(--ok)"
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray="{dash} {c}"
		/>
	</svg>
	{#if showLabel}
		<span class="tabular absolute text-sm font-semibold">{clamped}%</span>
	{/if}
</div>

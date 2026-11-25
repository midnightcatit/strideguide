<script lang="ts">
	/**
	 * The goal race day. Shown in place of the normal workout card, so the day
	 * reads as the point the whole plan was built for.
	 */
	let {
		name,
		dateLabel,
		line = 'All that training comes down to today. Go and enjoy it.',
		logged = false,
		onLog,
	}: {
		name: string;
		dateLabel: string;
		line?: string;
		logged?: boolean;
		onLog?: () => void;
	} = $props();
</script>

<article class="stage-card lift relative overflow-hidden rounded-xl border border-signal-ink bg-signal-wash p-5 sm:p-6">
	<div class="absolute left-0 top-0 h-full w-1 bg-signal" aria-hidden="true"></div>

	<div class="relative">
		<div class="flex items-center gap-2">
			<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal-ink text-paper" aria-hidden="true">
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M5 3v14" />
					<path d="M5 4h9l-2 3 2 3H5" />
				</svg>
			</span>
			<p class="tabular text-xs uppercase tracking-widest text-signal-ink">Race day</p>
		</div>

		<h2 class="font-display mt-3 text-2xl font-bold leading-tight">{name}</h2>
		<p class="tabular mt-1 text-sm text-signal-ink">{dateLabel}</p>
		<p class="mt-3 text-sm leading-relaxed text-signal-ink">{line}</p>
	</div>

	{#if onLog && !logged}
		<button
			type="button"
			onclick={onLog}
			class="relative mt-4 w-full rounded-md bg-signal-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
		>
			Log result
		</button>
	{:else if logged}
		<p class="relative mt-4 flex items-center gap-2 text-sm font-medium text-signal-ink">
			<span class="flex h-5 w-5 items-center justify-center rounded-full bg-signal-ink text-paper" aria-hidden="true">
				<svg class="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 10.5l4 4 8-9" />
				</svg>
			</span>
			Result logged
		</p>
	{/if}
</article>

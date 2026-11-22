<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type ApiUser } from '$lib/api';

	let user = $state<ApiUser | null>(null);
	let loading = $state(true);
	let expanded = $state(false);

	const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
	const todayIndex = (new Date().getDay() + 6) % 7;

	onMount(async () => {
		user = await api.me().catch(() => null);
		loading = false;
	});
</script>

<section class="mb-5 flex items-center justify-between">
	<div>
		<p class="text-xs uppercase tracking-widest text-steel">Today</p>
		<h1 class="font-display text-2xl font-bold">Your session</h1>
	</div>
	{#if user}
		<span class="tabular text-xs text-steel">{user.email}</span>
	{:else if !loading}
		<button
			type="button"
			onclick={() => api.login()}
			class="rounded-md border border-hairline px-3 py-1.5 text-sm hover:border-signal hover:text-signal transition-colors"
		>
			Sign in with Google
		</button>
	{/if}
</section>

<div class="mb-5 flex justify-between gap-1">
	{#each week as day, i}
		<div
			class="flex-1 text-center text-xs py-1.5 rounded-md tabular {i === todayIndex
				? 'bg-ink text-paper font-bold'
				: 'text-steel'}"
		>
			{day}
		</div>
	{/each}
</div>

<!-- Signature: the session card (PLAN.md section 11.2) -->
<article class="relative overflow-hidden rounded-xl border border-hairline bg-paper">
	<div class="absolute right-0 top-0 h-full w-1.5 bg-signal" aria-hidden="true"></div>
	<div class="p-4">
		<div class="flex items-baseline justify-between">
			<span class="tabular text-xs uppercase tracking-widest text-steel">Marathon · W5</span>
			<span class="tabular text-xs uppercase tracking-widest text-signal">Tempo</span>
		</div>
		<hr class="my-3 border-hairline" />
		<div class="grid grid-cols-2 gap-3">
			<div>
				<p class="tabular text-2xl font-medium leading-none">6.0 km</p>
				<p class="text-xs text-steel mt-1">prescribed</p>
			</div>
			<div>
				<p class="tabular text-2xl font-medium leading-none">30:00</p>
				<p class="text-xs text-steel mt-1">target</p>
			</div>
		</div>
		<hr class="my-3 border-hairline" />
		<p class="tabular text-sm">4:55–5:05 /km <span class="text-steel">@ RPE 6–7</span></p>
		<p class="mt-3 text-sm text-steel">
			Builds lactate clearance so goal pace feels easier. You should feel "comfortably hard."
		</p>
		<button
			type="button"
			onclick={() => (expanded = !expanded)}
			class="mt-3 text-sm text-signal hover:underline"
		>
			Read more {expanded ? '▴' : '▾'}
		</button>
		{#if expanded}
			<div class="mt-3 text-sm text-steel border-t border-hairline pt-3">
				<p>
					Sustained work near lactate threshold raises the pace at which lactate accumulates, letting
					you hold goal pace at a lower relative effort. (Sources arrive with the M3 research layer.)
				</p>
			</div>
		{/if}
	</div>
</article>

<div class="mt-5 grid gap-2">
	<a href="/" class="flex items-center justify-between rounded-lg border border-hairline px-4 py-3 hover:border-signal transition-colors">
		<span>Log it</span><span class="text-steel">▸</span>
	</a>
	<a href="/" class="flex items-center justify-between rounded-lg border border-hairline px-4 py-3 hover:border-signal transition-colors">
		<span>Why this?</span><span class="text-steel">▸</span>
	</a>
	<a href="/" class="flex items-center justify-between rounded-lg border border-hairline px-4 py-3 hover:border-signal transition-colors">
		<span>Week so far</span><span class="text-steel">▸</span>
	</a>
</div>

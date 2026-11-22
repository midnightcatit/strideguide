<script lang="ts">
	import { api } from '$lib/api';
	import type { ClientSession } from '$lib/plan';
	import Card from '$lib/components/Card.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';

	let { session }: { session: ClientSession } = $props();

	let expanded = $state(false);
	let why = $state<Awaited<ReturnType<typeof api.explanation>> | null>(null);
	let loading = $state(false);
	let failed = $state(false);

	async function toggle() {
		expanded = !expanded;
		if (expanded && !why && !loading) {
			loading = true;
			try {
				why = await api.explanation(session.type);
			} catch {
				failed = true;
			} finally {
				loading = false;
			}
		}
	}

	const claims = $derived(why?.claims ?? []);
	const headline = $derived(claims[0]?.claim ?? why?.summary ?? '');

	function markersFor(source?: string): number[] {
		if (!source || !why) return [];
		const idx = why.sources.findIndex((s) => source.startsWith(s.title));
		return idx >= 0 ? [idx + 1] : [];
	}
</script>

<section aria-labelledby="why-heading" class="mt-7">
	<SectionHeader id="why-heading" eyebrow="Why this session" />
	<Card>
		{#if session.purpose}
			<p class="text-sm text-steel">{session.purpose}</p>
		{/if}

		{#if loading}
			<p class="mt-2 text-xs text-steel">Loading the research…</p>
		{:else if failed}
			<p class="mt-2 text-xs text-steel">The sourced explanation isn't available right now.</p>
		{:else if why}
			{#if headline}
				<p class="mt-2 text-sm">
					{headline}{#if markersFor(claims[0]?.source).length}<sup class="tabular ml-0.5 text-[10px] text-steel"
							>{markersFor(claims[0]?.source).map((n) => `[${n}]`).join('')}</sup
						>{/if}
				</p>
			{/if}
			<button
				type="button"
				onclick={toggle}
				aria-expanded={expanded}
				aria-controls="why-body"
				class="mt-2 text-sm text-signal-ink hover:underline"
			>
				{expanded ? 'Details ▴' : 'Details ▾'}
			</button>

			{#if expanded}
				<div id="why-body" class="mt-3">
					<hr class="border-hairline" />
					<ul class="mt-3 space-y-2">
						{#each claims.slice(0, 10) as cl, i (i)}
							<li class="flex justify-between gap-3 text-sm">
								<span class="flex-1 text-steel">
									<span class="text-ink">{cl.topic}.</span>
									{cl.claim}
								</span>
								{#if markersFor(cl.source).length}
									<span class="tabular shrink-0 text-[10px] text-steel"
										>{markersFor(cl.source).map((n) => `[${n}]`).join('')}</span
									>
								{/if}
							</li>
						{/each}
					</ul>
					{#if why.sources.length}
						<hr class="mt-3 border-hairline" />
						<p class="mt-3 text-xs uppercase tracking-widest text-steel">Sources</p>
						<ol class="mt-1 space-y-1 text-xs text-steel">
							{#each why.sources.slice(0, 12) as s, i (i)}
								<li class="flex justify-between gap-3">
									<span class="flex-1">
										<span class="tabular text-steel">{i + 1}</span>
										{#if s.doiUrl}<a href={s.doiUrl} target="_blank" rel="noopener" class="hover:text-signal-ink">{s.title}</a>{:else}{s.title}{/if}{#if s.year}<span class="tabular"> ({s.year})</span>{/if}
									</span>
									{#if s.doiUrl}<span class="text-steel" aria-hidden="true">↗</span>{/if}
								</li>
							{/each}
						</ol>
					{/if}
					<p class="mt-3 text-xs text-steel">
						{#if why.kbVersion}Knowledge base {why.kbVersion}. {/if}Guidance, not medical advice.
					</p>
				</div>
			{/if}
		{/if}
	</Card>
</section>

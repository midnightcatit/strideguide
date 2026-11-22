<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import type { ClientLog, ClientSession } from '$lib/plan';
	import { fmtDistance, fmtPaceBand, sessionLabel } from '$lib/prefs.svelte';
	import IntensityLadder from '$lib/components/IntensityLadder.svelte';
	import { modal } from '$lib/actions';

	let {
		session,
		eyebrow = '',
		logged = null,
		onClose,
		onLog,
		onStart,
	}: {
		session: ClientSession;
		eyebrow?: string;
		logged?: ClientLog | null;
		onClose: () => void;
		onLog?: () => void;
		onStart?: () => void;
	} = $props();

	const p = $derived(session.prescription ?? {});
	const machines = $derived(p.blocks ?? []);
	const band = $derived(fmtPaceBand(p.targetPaceSecPerKm));

	let why = $state<Awaited<ReturnType<typeof api.explanation>> | null>(null);
	let loading = $state(true);
	let failed = $state(false);

	onMount(async () => {
		try {
			why = await api.explanation(session.type);
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	});

	const claims = $derived(why?.claims ?? []);
	const headline = $derived(claims[0]?.claim ?? why?.summary ?? session.purpose ?? '');
	let showAllSources = $state(false);
	let showAllClaims = $state(false);
	const visibleClaims = $derived(showAllClaims ? claims.slice(0, 16) : claims.slice(0, 4));

	function markersFor(source?: string): number[] {
		if (!source || !why) return [];
		const idx = why.sources.findIndex((s) => source.startsWith(s.title));
		return idx >= 0 ? [idx + 1] : [];
	}

	/** Turn a bare DOI ("10.1016/…") or URL into a real link. */
	function sourceHref(s: { doiUrl?: string }): string | undefined {
		const v = s.doiUrl?.trim();
		if (!v) return undefined;
		if (/^https?:\/\//i.test(v)) return v;
		if (/^10\.\d{4,}/.test(v)) return `https://doi.org/${v}`;
		return undefined;
	}
</script>

<div
	class="fixed inset-0 z-40 flex flex-col bg-paper"
	role="dialog"
	aria-modal="true"
	aria-label={sessionLabel(session)}
	use:modal={onClose}
>
	<header class="border-b border-hairline px-4 py-3">
		<div class="mx-auto max-w-2xl">
			<div class="flex items-center justify-between">
				<a href="/" class="text-sm text-steel hover:text-signal-ink">‹ Stride Guide</a>
				<button type="button" onclick={onClose} class="flex h-11 w-11 items-center justify-center text-steel hover:text-ink" aria-label="Close">✕</button>
			</div>
			<h1 class="font-display mt-1 truncate text-xl font-bold">{sessionLabel(session)}</h1>
			<p class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
		</div>
	</header>

	<div class="flex-1 overflow-y-auto overscroll-contain min-h-0">
	<div class="mx-auto max-w-2xl px-4 py-5 reveal">
		<div class="flex items-center justify-between">
				<span class="flex items-center gap-2">
					<span class="tabular text-xs uppercase tracking-widest text-steel">{session.modality}</span>
					<IntensityLadder intensity={p.intensity} />
				</span>
				<span class="tabular text-xs uppercase tracking-widest text-steel">{session.type}</span>
			</div>

			{#if session.purpose}<p class="mt-3 text-sm text-steel">{session.purpose}</p>{/if}

			<hr class="my-4 border-hairline" />

			<div class="grid grid-cols-2 gap-3">
				<div>
					<p class="tabular text-2xl font-medium leading-none">
						{#if p.targetDistanceKm}{fmtDistance(p.targetDistanceKm)}{:else}{machines.length || '–'} {p.targetDistanceKm ? '' : 'machines'}{/if}
					</p>
					<p class="mt-1 text-xs text-steel">prescribed</p>
				</div>
				<div>
					<p class="tabular text-2xl font-medium leading-none">
						{#if band}{band}{:else}{session.durationMin ?? '–'} min{/if}
					</p>
					<p class="mt-1 text-xs text-steel">{band ? 'target pace' : 'target time'}</p>
				</div>
			</div>

			{#if machines.length}
				<hr class="my-4 border-hairline" />
				<p class="tabular text-xs uppercase tracking-widest text-steel">Circuit</p>
				<ul class="mt-2 divide-y divide-hairline">
					{#each machines as block (block.machine)}
						<li class="flex justify-between py-2 text-sm">
							<span>{block.machine}</span>
							<span class="tabular text-steel">{block.sets?.[0]?.reps ?? 10} reps × {block.sets?.length ?? 3} sets</span>
						</li>
					{/each}
				</ul>
			{/if}

			<hr class="my-4 border-hairline" />

			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Why this session</h2>
			{#if loading}
				<p class="mt-2 text-sm text-steel">Loading the research…</p>
			{:else if failed}
				<p class="mt-2 text-sm text-steel">The sourced explanation isn't available right now.</p>
			{:else if why}
				{#if headline}<p class="mt-2 text-sm">{headline}</p>{/if}
				{#if claims.length}
					<ul class="mt-3 space-y-3">
						{#each visibleClaims as cl, i (i)}
							<li class="flex justify-between gap-3 text-sm">
								<span class="flex-1 text-steel">
									<span class="text-ink">{cl.topic}.</span>
									{cl.claim}
								</span>
								{#if markersFor(cl.source).length}
									<span class="tabular shrink-0 text-[10px] text-steel">{markersFor(cl.source).map((n) => `[${n}]`).join('')}</span>
								{/if}
							</li>
						{/each}
					</ul>
					{#if claims.length > 4}
						<button
							type="button"
							onclick={() => (showAllClaims = !showAllClaims)}
							aria-expanded={showAllClaims}
							class="mt-3 text-sm text-signal-ink hover:underline"
						>
							{showAllClaims ? 'Show less' : `Read more (${claims.length - 4} more)`}
						</button>
					{/if}
				{/if}
				{#if why.sources.length}
					<p class="mt-5 tabular text-xs uppercase tracking-widest text-steel">Sources</p>
					<ol class="mt-2 space-y-1 text-xs text-steel">
						{#each (showAllSources ? why.sources.slice(0, 16) : why.sources.slice(0, 3)) as s, i (i)}
							<li class="flex justify-between gap-3">
								<span class="flex-1">
									<span class="tabular text-steel">{i + 1}</span>
									{#if sourceHref(s)}<a href={sourceHref(s)} target="_blank" rel="noopener" class="hover:text-signal-ink">{s.title}</a>{:else}{s.title}{/if}{#if s.year}<span class="tabular"> ({s.year})</span>{/if}
								</span>
								{#if sourceHref(s)}<span class="text-steel" aria-hidden="true">↗</span>{/if}
							</li>
						{/each}
					</ol>
					{#if why.sources.length > 3}
						<button
							type="button"
							onclick={() => (showAllSources = !showAllSources)}
							aria-expanded={showAllSources}
							class="mt-2 text-xs text-signal-ink hover:underline"
						>
							{showAllSources ? 'Show fewer sources' : `View all ${why.sources.length} sources`}
						</button>
					{/if}
				{/if}
				<p class="mt-5 text-xs text-steel">
					{#if why.kbVersion}Knowledge base {why.kbVersion}. {/if}Guidance, not medical advice.
				</p>
			{/if}
		</div>
	</div>

	<footer class="border-t border-hairline px-4 py-3" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))">
		<div class="mx-auto flex max-w-2xl gap-2">
			{#if onStart && session.prescription?.workout}
				<button type="button" onclick={onStart} class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90">Start</button>
			{/if}
			{#if onLog}
				<button type="button" onclick={onLog} class="flex-1 rounded-md border border-hairline px-4 py-3 text-sm hover:border-signal hover:text-signal-ink">
					{logged ? 'Log again' : 'Log it'}
				</button>
			{/if}
		</div>
	</footer>
</div>

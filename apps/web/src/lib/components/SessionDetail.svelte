<script lang="ts">
	import { onMount } from 'svelte';
	import { formatClock } from '@strideguide/shared/units';
	import { SHORT_WHY, findDrill, findMove, type Drill, type MachineExercise } from '@strideguide/shared/plan';
	import { api } from '$lib/api';
	import type { ClientBlock, ClientLog, ClientSession, ClientStep } from '$lib/plan';
	import { fmtDistance, fmtPaceBand, fmtStepDistance, sessionLabel } from '$lib/prefs.svelte';
	import IntensityLadder from '$lib/components/IntensityLadder.svelte';
	import { modal } from '$lib/actions';

	let {
		session,
		eyebrow = '',
		logged,
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
	const workout = $derived(p.workout);
	const band = $derived(fmtPaceBand(p.targetPaceSecPerKm));
	const dist = $derived(p.targetDistanceKm ?? workout?.totalDistanceKm);
	const minutes = $derived(session.durationMin ?? workout?.estimatedDurationMin);

	let why = $state<Awaited<ReturnType<typeof api.explanation>> | null>(null);
	let loading = $state(true);
	let failed = $state(false);
	let showAllSources = $state(false);
	let showAllRows = $state(false);
	let openMachine = $state<string | null>(null);
	let openDrill = $state<string | null>(null);

	onMount(async () => {
		try {
			why = await api.explanation(session.type);
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	});

	const lead = $derived(SHORT_WHY[session.type as keyof typeof SHORT_WHY] ?? session.purpose ?? '');

	/** One row per stage, so a repeated set reads once. */
	interface Row {
		label: string;
		target: string;
		repeat?: number;
		sub?: { label: string; target: string }[];
	}

	const rows = $derived.by<Row[]>(() => {
		const out: Row[] = [];
		for (const block of (workout?.blocks ?? []) as ClientBlock[]) {
			const drill = block.steps.every((s) => s.kind === 'warmup' || s.kind === 'cooldown');
			if (drill && block.steps.length > 1) {
				out.push({
					label: block.label ?? 'Drills',
					target: `${block.steps.length} drills`,
					sub: block.steps.map((s) => ({ label: s.label, target: stepTarget(s) })),
				});
			} else if ((block.repeat ?? 1) > 1) {
				out.push({
					label: block.label ?? 'Set',
					target: `× ${block.repeat}`,
					repeat: block.repeat,
					sub: block.steps.map((s) => ({ label: s.label, target: stepTarget(s) })),
				});
			} else if (block.steps.length > 1) {
				out.push({
					label: block.label ?? 'Block',
					target: `${block.steps.length} steps`,
					sub: block.steps.map((s) => ({ label: s.label, target: stepTarget(s) })),
				});
			} else {
				const s = block.steps[0];
				if (s) out.push({ label: s.label, target: stepTarget(s) });
			}
		}
		return out;
	});

	const visibleRows = $derived(showAllRows ? rows : rows.slice(0, 5));

	/** Machines in the order they appear in the workout. */
	const machines = $derived.by<MachineExercise[]>(() => {
		const names: string[] = [];
		for (const block of workout?.blocks ?? []) {
			for (const s of block.steps) {
				if (s.machine && !names.includes(s.machine)) names.push(s.machine);
			}
		}
		return names.map((n) => findMove(n)).filter((m): m is MachineExercise => !!m);
	});

	/** Stretches and drills in the order they appear, for a mobility session. */
	const drills = $derived.by<Drill[]>(() => {
		const names: string[] = [];
		for (const block of workout?.blocks ?? []) {
			for (const s of block.steps) {
				if (s.label && !names.includes(s.label) && findDrill(s.label)) names.push(s.label);
			}
		}
		return names.map((n) => findDrill(n)).filter((d): d is Drill => !!d);
	});

	function sourceHref(doiUrl?: string): string | undefined {
		if (!doiUrl) return undefined;
		if (/^https?:\/\//.test(doiUrl)) return doiUrl;
		return `https://doi.org/${doiUrl}`;
	}

	function stepTarget(step: ClientStep): string {
		if (step.durationSec != null) return formatClock(step.durationSec);
		if (step.sets && step.reps) return `${step.sets} × ${step.reps}`;
		if (step.distanceM != null) {
			const d = fmtStepDistance(step.distanceM);
			const pace = fmtPaceBand(step.targetPaceSecPerKm);
			return pace ? `${d} @ ${pace}` : d;
		}
		return '';
	}

	/** Plain-language line for a machine, built from the researched catalog. */
	function machineLine(m: MachineExercise): string {
		const muscles = m.muscles.join(' and ');
		return `Works your ${muscles}. ${m.feel}`;
	}
</script>

<div
	class="overlay-fade fixed inset-0 z-50 flex flex-col bg-paper"
	role="dialog"
	aria-modal="true"
	aria-label={sessionLabel(session)}
	use:modal={onClose}
>
	<!-- Coloured header band, tinted by the session's demand -->
	<div class="relative overflow-hidden bg-ink text-paper">
		<div
			class="pointer-events-none absolute inset-0 opacity-25 {session.modality === 'running' && p.intensity === 'hard'
				? 'bg-signal'
				: 'bg-steel'}"
			aria-hidden="true"
		></div>
		<header class="relative mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 pt-3">
			<button type="button" onclick={onClose} class="-ml-2 px-2 py-2 text-sm text-paper/90 hover:text-paper">
				‹ Back
			</button>
			<button type="button" onclick={onClose} aria-label="Close" class="px-2 py-2 text-paper/90 hover:text-paper">
				✕
			</button>
		</header>
		<div class="relative mx-auto max-w-2xl px-4 pb-5 pt-1">
			{#if eyebrow}<p class="tabular text-xs uppercase tracking-widest text-paper/70">{eyebrow}</p>{/if}
			<h1 class="mt-1 font-display text-2xl font-semibold tracking-tight">{sessionLabel(session)}</h1>
			<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-paper/85">
				{#if dist}<span class="tabular">{fmtDistance(dist)}</span>{/if}
				{#if band}<span class="tabular">{band}</span>{/if}
				{#if minutes}<span class="tabular">{minutes} min</span>{/if}
			</div>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
		<div class="mx-auto max-w-2xl px-4 py-5 pb-8 reveal">
			<IntensityLadder intensity={p.intensity} />
			{#if p.summary}<p class="mt-2 text-sm text-steel">{p.summary}</p>{/if}

			<!-- Why this workout: one summed-up narrative -->
			<section class="mt-6" aria-labelledby="why">
				<h2 id="why" class="tabular text-xs uppercase tracking-widest text-steel">Why this workout</h2>
				{#if lead}<p class="mt-2 text-[15px] leading-relaxed">{lead}</p>{/if}
				{#if loading}
					<p class="mt-3 text-sm text-steel">Loading the reasoning…</p>
				{:else if failed}
					<p class="mt-3 text-sm text-steel">The sourced explanation is unavailable right now.</p>
				{:else if why?.summary}
					<p class="mt-3 text-[15px] leading-relaxed text-steel">{why.summary}</p>
				{/if}
			</section>

			<!-- What's to come -->
			{#if rows.length}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="to-come">
					<h2 id="to-come" class="tabular text-xs uppercase tracking-widest text-steel">What's to come</h2>
					<ol class="mt-2 divide-y divide-hairline">
						{#each visibleRows as row, i (i)}
							<li class="py-2.5">
								<div class="flex items-baseline justify-between gap-3 text-sm">
									<span class="min-w-0 truncate">{row.label}</span>
									<span class="tabular shrink-0 text-steel">{row.target}</span>
								</div>
								{#if row.sub}
									<ul class="mt-1 space-y-0.5 pl-3 text-xs text-steel">
										{#each row.sub as s, si (si)}
											<li class="flex items-baseline justify-between gap-3">
												<span class="min-w-0 truncate">{s.label}</span>
												<span class="tabular shrink-0">{s.target}</span>
											</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ol>
					{#if rows.length > 5}
						<button
							type="button"
							onclick={() => (showAllRows = !showAllRows)}
							aria-expanded={showAllRows}
							class="mt-2 text-sm text-signal-ink hover:underline"
						>
							{showAllRows ? 'Show less' : `View more (${rows.length - 5} more)`}
						</button>
					{/if}
				</section>
			{/if}

			<!-- Stretches in a mobility session -->
			{#if session.type === 'mobility' && drills.length}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="stretches">
					<h2 id="stretches" class="tabular text-xs uppercase tracking-widest text-steel">The stretches</h2>
					<ul class="mt-2 space-y-1">
						{#each drills as d (d.name)}
							<li>
								<button
									type="button"
									onclick={() => (openDrill = openDrill === d.name ? null : d.name)}
									aria-expanded={openDrill === d.name}
									class="flex w-full items-baseline justify-between gap-3 border-b border-hairline py-2.5 text-left text-sm hover:text-signal-ink"
								>
									<span class="font-medium">{d.name}</span>
									<span class="tabular shrink-0 text-xs text-steel">{openDrill === d.name ? '−' : '+'}</span>
								</button>
								{#if openDrill === d.name}
									<div class="pb-3 pt-1">
										<p class="text-sm leading-relaxed">{d.why}</p>
										<p class="mt-2 text-sm leading-relaxed text-steel">{d.feel} Targets {d.targets.join(', ')}.</p>
										<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">Form</p>
										<ul class="mt-1 space-y-1 text-sm text-steel">
											{#each d.form as f (f)}<li>{f}</li>{/each}
										</ul>
										<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">Watch for</p>
										<ul class="mt-1 space-y-1 text-sm text-steel">
											{#each d.mistakes as m (m)}<li>{m}</li>{/each}
										</ul>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<!-- Machines in this session -->
			{#if machines.length}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="machines">
					<h2 id="machines" class="tabular text-xs uppercase tracking-widest text-steel">The {session.type === 'machine-circuit' ? 'machines' : 'moves'}</h2>
					<ul class="mt-2 space-y-1">
						{#each machines as m (m.name)}
							<li>
								<button
									type="button"
									onclick={() => (openMachine = openMachine === m.name ? null : m.name)}
									aria-expanded={openMachine === m.name}
									class="flex w-full items-baseline justify-between gap-3 border-b border-hairline py-2.5 text-left text-sm hover:text-signal-ink"
								>
									<span class="font-medium">{m.name}</span>
									<span class="tabular shrink-0 text-xs text-steel">{openMachine === m.name ? '−' : '+'}</span>
								</button>
								{#if openMachine === m.name}
									<div class="pb-3 pt-1">
										<p class="text-sm leading-relaxed">{m.why}</p>
										<p class="mt-2 text-sm leading-relaxed text-steel">{machineLine(m)}</p>
										<p class="mt-2 tabular text-xs uppercase tracking-widest text-steel">Form</p>
										<ul class="mt-1 space-y-1 text-sm">
											{#each m.form as cue, ci (ci)}
												<li class="flex gap-2"><span class="text-steel">·</span><span>{cue}</span></li>
											{/each}
										</ul>
										<p class="mt-2 text-xs text-steel">Avoid: {m.mistakes.join('; ').toLowerCase()}.</p>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<!-- Sources -->
			{#if why?.sources?.length}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="sources">
					<h2 id="sources" class="tabular text-xs uppercase tracking-widest text-steel">Sources</h2>
					<ol class="mt-2 space-y-1 text-xs text-steel">
						{#each (showAllSources ? why.sources : why.sources.slice(0, 3)) as s, i (i)}
							<li class="flex gap-2">
								<span class="tabular shrink-0">[{i + 1}]</span>
								<span class="min-w-0">
									{#if sourceHref(s.doiUrl)}
										<a href={sourceHref(s.doiUrl)} target="_blank" rel="noopener" class="break-words hover:text-signal-ink">{s.title}</a>
									{:else}
										{s.title}
									{/if}
									{#if s.year}<span class="tabular"> ({s.year})</span>{/if}
								</span>
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
					{#if why.kbVersion}<p class="mt-3 text-[11px] text-steel">Knowledge base {why.kbVersion}.</p>{/if}
				</section>
			{/if}
		</div>
	</div>

	<footer class="border-t border-hairline px-4 py-3" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))">
		<div class="mx-auto flex max-w-2xl gap-2">
			{#if onStart && workout}
				<button type="button" onclick={onStart} class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90">
					Start
				</button>
			{/if}
			{#if onLog}
				<button type="button" onclick={onLog} class="flex-1 rounded-md border border-hairline px-4 py-3 text-sm hover:border-signal hover:text-signal-ink">
					{logged ? 'Log again' : 'Log it'}
				</button>
			{/if}
		</div>
	</footer>
</div>

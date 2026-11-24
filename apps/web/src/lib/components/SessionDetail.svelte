<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { formatClock } from '@strideguide/shared/units';
	import { SHORT_WHY, findDrill, findMove, type MachineExercise } from '@strideguide/shared/plan';
	import { api } from '$lib/api';
	import type { ClientBlock, ClientLog, ClientSession, ClientStep } from '$lib/plan';
	import { sessionDrills } from '$lib/plan';
	import { fmtDistance, fmtPaceBand, fmtStepDistance, sessionLabel } from '$lib/prefs.svelte';
	import IntensityLadder from '$lib/components/IntensityLadder.svelte';
	import InfoButton from '$lib/components/InfoButton.svelte';
	import MoveList from '$lib/components/MoveList.svelte';
	import DrillList from '$lib/components/DrillList.svelte';
	import PreviewSheet from '$lib/components/PreviewSheet.svelte';
	import NotesSheet from '$lib/components/NotesSheet.svelte';
	import { isStarted } from '$lib/started.svelte';
	import { store } from '$lib/planStore.svelte';
	import { prefs } from '$lib/prefs.svelte';
	import { modal } from '$lib/actions';

	let {
		session,
		eyebrow = '',
		logged,
		skipped = false,
		onClose,
		onLog,
		onStart,
		onSkip,
		onUnskip,
	}: {
		session: ClientSession;
		eyebrow?: string;
		logged?: ClientLog | null;
		skipped?: boolean;
		onClose: () => void;
		onLog?: () => void;
		onStart?: () => void;
		onSkip?: () => void;
		onUnskip?: () => void;
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
	let showWhyDetail = $state(false);
	let showPreview = $state(false);
	let showNotes = $state(false);
	/** The note shown on the card, seeded from the plan and updated after a save. */
	let savedNote = $state(untrack(() => session.notes ?? ''));
	const statusLabel = $derived(
		skipped ? 'Skipped' : logged ? 'Done' : isStarted(session.id) ? 'In progress' : 'Not started',
	);

	/** Close the whole card, but leave it open while a sheet is on top of it. */
	function closeFromBackdrop() {
		if (!showPreview && !showNotes) onClose();
	}

	/** A line that ties the session to what the runner told us at setup. */
	const personal = $derived.by(() => {
		const b = (store.plan?.goal?.baseline ?? {}) as Record<string, unknown>;
		const acts = [
			...(Array.isArray(b.crossTraining) ? (b.crossTraining as string[]) : []),
			...(typeof b.customActivity === 'string' && b.customActivity ? [b.customActivity] : []),
		];
		const event = (typeof b.eventName === 'string' && b.eventName) || prefs.eventName || '';
		if (event && acts.length)
			return `You are training for ${event} and you also do ${acts.join(', ')}. We built this around both, and the reasoning below is where it comes from.`;
		if (event)
			return `You are training for ${event}. We built this session with that in mind, and the reasoning below is where it comes from.`;
		if (acts.length)
			return `Because you also do ${acts.join(', ')}, we keep this session in balance with those.`;
		return '';
	});

	/** Plain-English meaning of each step, so "What's to come" is not just labels. */
	const STEP_INFO: Record<string, string> = {
		'Warm-up jog': 'An easy jog to raise your heart rate and warm the muscles before the hard work.',
		'Dynamic warm-up': 'Moving drills like leg swings and skips that wake up the joints before you run. No long holds here.',
		'Cool-down jog': 'An easy jog to bring your heart rate down after the session.',
		'Cool-down stretches': 'Gentle holds of about 30 to 45 seconds each, to settle the muscles you used.',
		'Recovery jog': 'An easy jog between hard efforts, to bring your breathing back down before the next one.',
		Set: 'One round of the work below, repeated as many times as the block says.',
		Circuit: 'A round of the moves listed, done one after another, then repeated.',
		Tempo: 'A steady run at a comfortably hard pace, between easy running and a race effort. Breathing is strong and you can speak a few words.',
		Threshold: 'The pace just below where your legs start to burn. Training here lifts the pace you can hold.',
		Interval: 'Short, hard repeats with recovery between them, run faster than race pace. They raise your aerobic ceiling.',
		'Goal pace': 'Reps at the pace you want on race day, to rehearse how it should feel.',
		'Hill rep': 'A hard climb of about a minute, then walk or jog down to recover. Builds power and strength-endurance.',
		Stride: 'A short, relaxed burst of speed, about 20 seconds, building to near your top speed. It is not a sprint.',
		'Easy run': 'A relaxed run at a conversational pace. You can speak in full sentences the whole way.',
		'Long run': 'The longest run of the week, kept easy and even. It builds the endurance everything else rests on.',
		'Steady run': 'A run a little quicker than easy, but still controlled, to teach you to hold a pace.',
		'Recovery run': 'A very slow jog to help you bounce back between harder days.',
		Recovery: 'An easy jog between hard efforts, to bring your breathing back down before the next one.',
		'Loosen up': 'A few moving drills to wake up the joints before the stretches.',
		'Mobility stretches': 'Gentle holds of about 30 to 45 seconds each, to keep or build your range.',
		'Cross-train': 'Low-impact aerobic work, easy and continuous, that builds fitness without the running impact.',
	};

	/** A plain description for any step row, so every row can explain itself. */
	function rowInfo(label: string): string {
		if (STEP_INFO[label]) return STEP_INFO[label]!;
		const move = findMove(label);
		if (move) return `${move.why} Feel it in the ${move.muscles.join(', ')}.`;
		const drill = findDrill(label);
		if (drill) return drill.why;
		return 'Part of this session. Follow the cue and keep the movement controlled.';
	}
	let openRow = $state<string | null>(null);

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
	const sd = $derived(sessionDrills(workout));

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
</script>

<div
	class="overlay-fade fixed inset-0 z-50 flex flex-col bg-paper"
	role="dialog"
	aria-modal="true"
	aria-label={sessionLabel(session)}
	use:modal={closeFromBackdrop}
>
	<!-- Coloured header band, tinted by the session's demand -->
	<div class="relative overflow-hidden bg-ink text-paper">
		<div
			class="pointer-events-none absolute inset-0 opacity-25 {session.modality === 'running' &&
			p.intensity === 'hard'
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
				<span class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide {skipped
					? 'bg-paper/10 text-paper/70'
					: logged
						? 'bg-paper/25 text-paper'
						: 'bg-paper/15 text-paper/80'}">{statusLabel}</span>
				{#if dist}<span class="tabular">{fmtDistance(dist)}</span>{/if}
				{#if band}<span class="tabular">{band}</span>{/if}
				{#if minutes}<span class="tabular">{minutes} min</span>{/if}
			</div>

			<!-- Controls -->
			<div class="mt-4 flex gap-2">
				<button type="button" aria-pressed={showPreview} onclick={() => (showPreview = true)} class="flex flex-1 flex-col items-center gap-1 rounded-xl border border-paper/15 px-1 py-2 text-paper/85 hover:border-paper hover:text-paper">
					<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M2.5 10S5 5.5 10 5.5 17.5 10 17.5 10 15 14.5 10 14.5 2.5 10 2.5 10z" />
						<circle cx="10" cy="10" r="2.2" />
					</svg>
					<span class="text-[10px] uppercase tracking-wide">Preview</span>
				</button>
				<button type="button" aria-pressed={showNotes} onclick={() => (showNotes = true)} class="flex flex-1 flex-col items-center gap-1 rounded-xl border border-paper/15 px-1 py-2 text-paper/85 hover:border-paper hover:text-paper">
					<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M5 3.5h7l3 3v10H5z" />
						<path d="M8 9h4" />
						<path d="M8 12h4" />
					</svg>
					<span class="text-[10px] uppercase tracking-wide">Notes</span>
				</button>
				{#if skipped && onUnskip}
					<button type="button" onclick={onUnskip} class="flex flex-1 flex-col items-center gap-1 rounded-xl border border-paper/15 px-1 py-2 text-paper/85 hover:border-paper hover:text-paper">
						<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M4 10a6 6 0 1 0 2-4.5" />
							<path d="M4 4v3h3" />
						</svg>
						<span class="text-[10px] uppercase tracking-wide">Un-skip</span>
					</button>
				{:else if onSkip}
					<button type="button" onclick={onSkip} class="flex flex-1 flex-col items-center gap-1 rounded-xl border border-paper/15 px-1 py-2 text-paper/85 hover:border-paper hover:text-paper">
						<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M5 5l6 5-6 5z" />
							<path d="M13 5v10" />
						</svg>
						<span class="text-[10px] uppercase tracking-wide">Skip</span>
					</button>
				{/if}
			</div>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
		<div class="mx-auto max-w-2xl px-4 py-5 pb-8 reveal">
			{#if skipped}
				<p class="mb-3 rounded-lg bg-sunken p-3 text-sm text-steel">
					You skipped this one. It stays on your plan, marked as skipped. Un-skip it any time to bring it back.
				</p>
			{/if}
			<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-steel">
				<IntensityLadder intensity={p.intensity} />
				{#if p.targetZone}
					<span class="flex items-center gap-1">
						{p.targetZone}
						<InfoButton
							term="Training zone"
							definition="Z1 to Z2 is an easy effort you can hold while talking in full sentences. Z3 to Z4 is comfortably hard, where you can speak only a few words at a time."
						/>
					</span>
				{/if}
				{#if p.targetRpe}
					<span class="flex items-center gap-1">
						RPE {p.targetRpe[0]} to {p.targetRpe[1]}
						<InfoButton
							term="RPE"
							definition="How hard the session should feel, on a scale of 1 to 10. One is a walk, ten is everything you have."
						/>
					</span>
				{/if}
			</div>
			{#if p.summary}<p class="mt-3 text-sm text-steel">{p.summary}</p>{/if}
			{#if p.why}
				<p class="mt-3 rounded-lg bg-signal-wash p-3 text-sm leading-relaxed text-signal-ink">{p.why}</p>
			{/if}

			<!-- Why this workout: one summed-up narrative -->
			<section class="mt-6" aria-labelledby="why">
				<h2 id="why" class="tabular text-xs uppercase tracking-widest text-steel">Why this workout</h2>
				{#if personal}<p class="mt-2 text-[15px] leading-relaxed text-signal-ink">{personal}</p>{/if}
				{#if lead}<p class="mt-2 text-[15px] leading-relaxed">{lead}</p>{/if}
				{#if loading}
					<p class="mt-3 text-sm text-steel">Loading the reasoning…</p>
				{:else if failed}
					<p class="mt-3 text-sm text-steel">The sourced explanation is unavailable right now.</p>
				{:else if why?.summary}
					{#if showWhyDetail}
						<p class="mt-3 text-[15px] leading-relaxed text-steel">{why.summary}</p>
						<button type="button" onclick={() => (showWhyDetail = false)} class="mt-2 text-sm text-signal-ink hover:underline">
							Show less
						</button>
					{:else}
						<button type="button" onclick={() => (showWhyDetail = true)} class="mt-2 text-sm text-signal-ink hover:underline">
							Why, in detail
						</button>
					{/if}
				{/if}
			</section>

			<!-- The runner's own note for this session, if they saved one -->
			{#if savedNote}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="your-notes">
					<h2 id="your-notes" class="tabular text-xs uppercase tracking-widest text-steel">Your notes</h2>
					<p class="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{savedNote}</p>
					<button type="button" onclick={() => (showNotes = true)} class="mt-2 text-sm text-signal-ink hover:underline">
						Edit note
					</button>
				</section>
			{/if}

			<!-- What's to come -->
			{#if rows.length}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="to-come">
					<h2 id="to-come" class="tabular text-xs uppercase tracking-widest text-steel">What's to come</h2>
					<ol class="mt-2 divide-y divide-hairline">
						{#each visibleRows as row, i (i)}
							{@const info = rowInfo(row.label)}
							<li class="py-2.5">
								<div class="flex items-baseline justify-between gap-3 text-sm">
									<button
										type="button"
										onclick={() => (openRow = openRow === `r${i}` ? null : `r${i}`)}
										aria-expanded={openRow === `r${i}`}
										class="flex min-w-0 items-center gap-1.5 text-left hover:text-signal-ink"
									>
										<span class="truncate">{row.label}</span>
										<span class="shrink-0 text-steel" aria-hidden="true">{openRow === `r${i}` ? '−' : '+'}</span>
									</button>
									<span class="tabular shrink-0 text-steel">{row.target}</span>
								</div>
								{#if openRow === `r${i}`}
									<p class="sg-enter-up mt-1 text-xs leading-relaxed text-steel">{info}</p>
								{/if}
								{#if row.sub}
									<ul class="mt-1 space-y-0.5 pl-3 text-xs text-steel">
										{#each row.sub as s, si (si)}
											{@const sinfo = rowInfo(s.label)}
											<li>
												<div class="flex items-baseline justify-between gap-3">
													<button
														type="button"
														onclick={() => (openRow = openRow === `s${i}-${si}` ? null : `s${i}-${si}`)}
														aria-expanded={openRow === `s${i}-${si}`}
														class="flex min-w-0 items-center gap-1.5 text-left hover:text-signal-ink"
													>
														<span class="truncate">{s.label}</span>
														<span class="shrink-0" aria-hidden="true">{openRow === `s${i}-${si}` ? '−' : '+'}</span>
													</button>
													<span class="tabular shrink-0">{s.target}</span>
												</div>
												{#if openRow === `s${i}-${si}`}
													<p class="sg-enter-up mt-1 leading-relaxed">{sinfo}</p>
												{/if}
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

			<!-- Warm-up drills and stretches, each with a demo where we have one -->
			{#if sd.warmups.length}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="warmup">
					<h2 id="warmup" class="tabular text-xs uppercase tracking-widest text-steel">{session.type === 'mobility'
						? 'Loosen up'
						: 'The warm-up'}</h2>
					<div class="mt-2"><DrillList drills={sd.warmups} /></div>
				</section>
			{/if}

			{#if sd.stretches.length}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="stretches">
					<h2 id="stretches" class="tabular text-xs uppercase tracking-widest text-steel">The stretches</h2>
					<div class="mt-2"><DrillList drills={sd.stretches} /></div>
				</section>
			{/if}

			<!-- Machines in this session -->
			{#if machines.length}
				<hr class="my-6 border-hairline" />
				<section aria-labelledby="machines">
					<h2 id="machines" class="tabular text-xs uppercase tracking-widest text-steel">The {session.type === 'machine-circuit' ? 'machines' : 'moves'}</h2>
					<div class="mt-2"><MoveList {machines} /></div>
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
					{isStarted(session.id) && !logged ? 'Resume workout' : 'Start'}
				</button>
			{/if}
			{#if onLog}
				<button type="button" onclick={onLog} class="flex-1 rounded-md border border-hairline px-4 py-3 text-sm hover:border-signal hover:text-signal-ink">
					{logged ? 'Log again' : 'Log it'}
				</button>
			{/if}
		</div>
	</footer>

	<PreviewSheet
		open={showPreview}
		session={session}
		{machines}
		onClose={() => (showPreview = false)}
	/>

	<NotesSheet
		open={showNotes}
		session={session}
		onSaved={(notes) => (savedNote = notes)}
		onClose={() => (showNotes = false)}
	/>
</div>

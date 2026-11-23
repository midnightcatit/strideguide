<script lang="ts">
	import { formatClock } from '@strideguide/shared/units';
	import { goto } from '$app/navigation';
	import { findMove } from '@strideguide/shared/plan';
	import type { ClientSession, ClientStep } from '$lib/plan';
	import { fmtDistance, fmtPaceBand, fmtStepDistance, sessionLabel } from '$lib/prefs.svelte';
	import { modal } from '$lib/actions';

	let {
		session,
		eyebrow = '',
		onClose,
		onFinish,
	}: {
		session: ClientSession;
		eyebrow?: string;
		onClose: () => void;
		onFinish: () => void;
	} = $props();

	interface Instance {
		blockLabel?: string;
		rep?: number;
		totalReps?: number;
		setNo?: number;
		totalSets?: number;
		step: ClientStep;
	}

	interface StepRow {
		key: string;
		label: string;
		target: string;
		index: number;
		blockLabel?: string;
		repeat?: number;
		sets?: number;
	}

	const workout = $derived(session.prescription?.workout);
	// Expanded instances drive the guided flow; rows are the consolidated stage list.
	const expanded = $derived.by(() => {
		const instances: Instance[] = [];
		const rows: StepRow[] = [];
		(workout?.blocks ?? []).forEach((b, bi) => {
			const reps = Math.max(1, b.repeat ?? 1);
			for (let r = 0; r < reps; r++) {
				b.steps.forEach((s, si) => {
					const sets = s.kind === 'work' && (s.sets ?? 0) > 1 ? (s.sets as number) : 1;
					const firstIndex = instances.length;
					for (let k = 0; k < sets; k++) {
						instances.push({
							blockLabel: b.label,
							rep: reps > 1 ? r + 1 : undefined,
							totalReps: reps > 1 ? reps : undefined,
							setNo: sets > 1 ? k + 1 : undefined,
							totalSets: sets > 1 ? sets : undefined,
							step: s,
						});
					}
					if (r === 0) {
						rows.push({
							key: `${bi}-${si}`,
							label: s.label,
							target: stepTarget(s),
							index: firstIndex,
							blockLabel: reps > 1 ? b.label : undefined,
							repeat: reps > 1 ? reps : undefined,
							sets,
						});
					}
				});
			}
		});
		return { instances, rows };
	});
	const instances = $derived(expanded.instances);
	const stepRows = $derived(expanded.rows);

	let idx = $state(0);
	let running = $state(false);
	let elapsed = $state(0);
	let finished = $state(false);
	let restLeft = $state(0);
	let restThenAdvance = $state(false);
	let showForm = $state(true);

	const current = $derived(instances[idx]);
	const machine = $derived(findMove(current?.step.machine));
	const timed = $derived(current?.step.durationSec != null);
	const repBased = $derived(!timed && (current?.step.reps ?? 0) > 0);
	const remaining = $derived(timed ? Math.max(0, (current!.step.durationSec as number) - elapsed) : null);
	const resting = $derived(restLeft > 0);

	/** Move to the next step, or finish. */
	function advance() {
		restLeft = 0;
		restThenAdvance = false;
		elapsed = 0;
		if (idx >= instances.length - 1) {
			finished = true;
			running = false;
			return;
		}
		idx += 1;
		// Timed steps flow automatically; rep-based steps wait for the user.
		running = instances[idx]?.step.durationSec != null;
	}

	/** A step is done (timer hit zero, or the user finished the set). */
	function complete() {
		const rest = current?.step.restSec ?? 0;
		if (rest > 0 && idx < instances.length - 1) {
			running = false;
			restLeft = rest;
			restThenAdvance = true;
		} else {
			advance();
		}
	}

	function jump(i: number) {
		idx = i;
		elapsed = 0;
		restLeft = 0;
		restThenAdvance = false;
		finished = false;
		running = instances[i]?.step.durationSec != null;
	}

	// Timed step countdown -> auto-complete.
	$effect(() => {
		if (!running || resting || !timed) return;
		const step = instances[idx]?.step;
		if (step?.durationSec == null) return;
		const t = setInterval(() => {
			elapsed += 1;
			if (elapsed >= (step.durationSec as number)) complete();
		}, 1000);
		return () => clearInterval(t);
	});

	// Rest countdown -> auto-advance when it ends.
	$effect(() => {
		if (restLeft > 0) {
			const t = setInterval(() => {
				restLeft = Math.max(0, restLeft - 1);
			}, 1000);
			return () => clearInterval(t);
		}
		if (restThenAdvance) {
			restThenAdvance = false;
			advance();
		}
		return;
	});

	function stepDistance(m?: number): string | null {
		if (m == null) return null;
		return fmtStepDistance(m);
	}

	function stepTarget(step: ClientStep): string {
		const dist = stepDistance(step.distanceM);
		const pace = fmtPaceBand(step.targetPaceSecPerKm);
		if (dist && pace) return `${dist} @ ${pace}`;
		if (dist) return dist;
		if (step.sets && step.reps) return `${step.sets} × ${step.reps} reps`;
		if (step.durationSec) return formatClock(step.durationSec);
		return step.label;
	}

	const clock = $derived(remaining != null ? formatClock(remaining) : formatClock(elapsed));

	function goHome() {
		onClose();
		void goto('/');
	}
	const progress = $derived(`${Math.min(idx + 1, instances.length)} / ${instances.length}`);
</script>

<div
	class="overlay-fade fixed inset-0 z-30 overflow-y-auto bg-paper"
	role="dialog"
	aria-modal="true"
	aria-label={sessionLabel(session)}
	use:modal={onClose}
>
	<div class="mx-auto max-w-2xl px-4 py-5 pb-24">
		<div class="flex items-center justify-between">
			<button type="button" onclick={onClose} class="-ml-2 px-2 py-2 text-sm text-steel hover:text-ink">‹ Back</button>
			<div class="flex items-center gap-1">
				<button type="button" onclick={goHome} class="px-2 py-2 text-sm text-steel hover:text-ink">Stride Guide</button>
				<button type="button" onclick={onClose} class="px-2 py-2 text-steel hover:text-ink" aria-label="Close">✕</button>
			</div>
		</div>
		<h1 class="font-display mt-1 text-xl font-bold">{sessionLabel(session)}</h1>
		<p class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</p>

		{#if finished}
			<div class="mt-6 rounded-xl border border-hairline p-6 text-center">
				<p class="font-display text-lg font-medium">Workout complete</p>
				<p class="mt-1 text-sm text-steel">Log how it went.</p>
				<button type="button" onclick={onFinish} class="mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Log it</button>
			</div>
		{:else if resting}
			<!-- Automatic rest -->
			<div class="mt-6 rounded-xl border border-hairline bg-sunken p-6 text-center">
				<p class="text-xs uppercase tracking-widest text-steel">Rest, next up</p>
				<p class="tabular mt-1 text-4xl font-medium">{formatClock(restLeft)}</p>
				{#if instances[idx + 1]}
					<p class="mt-2 text-sm text-steel">
						Next: {instances[idx + 1]!.step.label}{instances[idx + 1]!.setNo ? ` (set ${instances[idx + 1]!.setNo}/${instances[idx + 1]!.totalSets})` : ''}
					</p>
				{/if}
				<div class="mt-4 flex justify-center gap-2">
					<button type="button" onclick={() => (restLeft = restLeft + 30)} class="rounded-md border border-hairline px-4 py-2 text-sm">+30s</button>
					<button type="button" onclick={advance} class="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper">Skip rest</button>
				</div>
			</div>
		{:else if current}
			<div class="relative mt-6 overflow-hidden rounded-xl border border-hairline bg-paper p-4">
				<div class="absolute right-0 top-0 h-full w-1.5 bg-signal" aria-hidden="true"></div>
				<div class="flex items-baseline justify-between">
					<span class="tabular text-xs uppercase tracking-widest text-steel">
						{current.blockLabel ?? ''}{current.setNo ? ` · set ${current.setNo}/${current.totalSets}` : ''}{current.rep ? ` · rep ${current.rep}/${current.totalReps}` : ''}
					</span>
					<span class="tabular text-xs uppercase tracking-widest text-signal-ink">{current.step.kind}</span>
				</div>
				<h2 class="font-display mt-1 text-lg font-medium">{current.step.label}</h2>
				<p class="tabular mt-2 text-4xl font-medium leading-none">
					{repBased ? (current.step.reps ? `${current.step.reps} reps` : formatClock(elapsed)) : clock}
				</p>
				<p class="tabular mt-2 text-sm">{stepTarget(current.step)}</p>
				{#if current.step.note}<p class="mt-2 text-sm text-steel">{current.step.note}</p>{/if}

				<div class="mt-4 flex gap-2">
					{#if repBased}
						<button type="button" onclick={complete} class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90">Done set</button>
					{:else}
						<button type="button" onclick={() => (running = !running)} class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90">
							{running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
						</button>
					{/if}
					<button type="button" onclick={() => jump(Math.max(0, idx - 1))} disabled={idx === 0} class="rounded-md border border-hairline px-4 py-3 text-sm disabled:opacity-40">‹</button>
					<button type="button" onclick={advance} class="rounded-md border border-hairline px-4 py-3 text-sm">Next ›</button>
				</div>
				<div class="mt-2 flex gap-2">
					<button type="button" onclick={() => { restLeft = current?.step.restSec ?? 90; restThenAdvance = true; running = false; }} class="flex-1 rounded-md border border-hairline px-4 py-2 text-sm text-steel hover:text-ink">Rest now</button>
					{#if machine}
						<button type="button" onclick={() => (showForm = !showForm)} aria-expanded={showForm} class="flex-1 rounded-md border border-hairline px-4 py-2 text-sm text-steel hover:text-ink">
							{showForm ? 'Hide form' : 'Form & muscles'}
						</button>
					{/if}
				</div>

				{#if machine && showForm}
					<div class="mt-3 border-t border-hairline pt-3 text-sm">
						<p class="text-steel"><span class="text-ink">Muscles:</span> {machine.muscles.join(', ')}</p>
						<p class="mt-1 text-steel"><span class="text-ink">Feel it:</span> {machine.feel}</p>
						<ul class="mt-2 space-y-1">
							{#each machine.form as cue (cue)}<li class="text-steel">• {cue}</li>{/each}
						</ul>
						<p class="mt-2 text-xs text-steel">Avoid: {machine.mistakes.join('; ')}.</p>
					</div>
				{/if}
			</div>
		{/if}

		<details class="mt-4">
			<summary class="flex cursor-pointer list-none items-center justify-between">
				<span class="tabular text-xs uppercase tracking-widest text-steel">Workout stages</span>
				<span class="tabular text-xs text-steel">{progress}</span>
			</summary>
			<ul class="mt-2 divide-y divide-hairline border-y border-hairline">
				{#each stepRows as row (row.key)}
					<li>
						<button type="button" onclick={() => jump(row.index)} class="flex w-full items-center justify-between gap-3 py-2.5 text-left {row.index === idx ? 'text-signal-ink' : 'text-ink'} hover:text-signal-ink">
							<span class="min-w-0 truncate text-sm">
								{row.blockLabel ? `${row.blockLabel} × ${row.repeat}: ` : ''}{row.label}{row.sets && row.sets > 1 ? ` (${row.sets} sets)` : ''}
							</span>
							<span class="tabular max-w-[45%] shrink-0 truncate text-xs text-steel">{row.target}</span>
						</button>
					</li>
				{/each}
			</ul>
		</details>
		<p class="mt-4 text-xs text-steel">
			Timed steps count down on their own, and strength sets rest and move on by themselves. Form cues are guidance, not medical advice.
		</p>
	</div>
</div>

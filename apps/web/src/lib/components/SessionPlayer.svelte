<script lang="ts">
	import { formatClock } from '@strideguide/shared/units';
	import { goto } from '$app/navigation';
	import { findDrill, findMove, mediaForMove } from '@strideguide/shared/plan';
	import { onMount, onDestroy } from 'svelte';
	import type { ClientSession, ClientStep } from '$lib/plan';
	import { fmtPaceBand, fmtStepDistance, prefs, sessionLabel, setAutoAdvance } from '$lib/prefs.svelte';
	import { modal } from '$lib/actions';
	import FormSheet from '$lib/components/FormSheet.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import { markStarted } from '$lib/started.svelte';
	import { getProgress, setProgress } from '$lib/sessionProgress.svelte';

	let {
		session,
		eyebrow = '',
		asPage = false,
		onClose: onCloseProp,
		onFinish,
	}: {
		session: ClientSession;
		eyebrow?: string;
		/** True when this is a route, so it renders in flow instead of as an overlay. */
		asPage?: boolean;
		onClose: () => void;
		onFinish: () => void;
	} = $props();

	const titleId = `player-title-${crypto.randomUUID()}`;

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

	const countdownFrom = () => prefs.countdownSec ?? 5;

	const workout = $derived(session.prescription?.workout);
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
	// No countdown on first entry: the Start or Resume button waits. Steps that
	// follow get the countdown.
	let countdown = $state(0);
	let awaitingNext = $state(false);
	let finished = $state(false);
	let restLeft = $state(0);
	let restThenAdvance = $state(false);
	let showForm = $state(false);
	let autoNext = $state(prefs.autoAdvance ?? true);
	let hold = $state(0);
	let holdTimer: ReturnType<typeof setInterval> | undefined;
	let confirmFinish = $state(false);

	const current = $derived(instances[idx]);
	const machine = $derived(findMove(current?.step.machine ?? current?.step.label));
	const drill = $derived(findDrill(current?.step.label));
	const timed = $derived(current?.step.durationSec != null);
	const repBased = $derived(!timed && (current?.step.reps ?? 0) > 0);
	const remaining = $derived(timed ? Math.max(0, (current!.step.durationSec as number) - elapsed) : null);
	const resting = $derived(restLeft > 0);

	function save() {
		if (instances.length) setProgress(session.id, { idx, elapsed });
	}

	/** Go to a step and run its countdown before it starts. */
	function armStep(i: number) {
		idx = Math.max(0, Math.min(instances.length - 1, i));
		elapsed = 0;
		restLeft = 0;
		restThenAdvance = false;
		awaitingNext = false;
		finished = false;
		running = false;
		countdown = countdownFrom();
		save();
	}

	function startStep() {
		running = current?.step.durationSec != null;
	}

	/** The current step is done: rest if there is any, otherwise move on. */
	function complete() {
		running = false;
		const rest = current?.step.restSec ?? 0;
		if (rest > 0 && idx < instances.length - 1) {
			restLeft = rest;
			restThenAdvance = true;
			return;
		}
		afterStep();
	}

	/** After a step (and any rest): auto-advance, or wait for the user. */
	function afterStep() {
		if (idx >= instances.length - 1) {
			finished = true;
			running = false;
			save();
			return;
		}
		if (autoNext) armStep(idx + 1);
		else awaitingNext = true;
	}

	/** Skip the rest and move on now. */
	function skipRest() {
		restLeft = 0;
		restThenAdvance = false;
		afterStep();
	}

	function toggleAuto() {
		autoNext = !autoNext;
		void setAutoAdvance(autoNext);
	}

	function jump(i: number) {
		armStep(i);
	}

	function close() {
		save();
		onCloseProp();
	}

	// Countdown before each step starts.
	$effect(() => {
		if (countdown <= 0 || finished || awaitingNext) return;
		const t = setInterval(() => {
			countdown = Math.max(0, countdown - 1);
			if (countdown === 0) startStep();
		}, 1000);
		return () => clearInterval(t);
	});

	// Timed step countdown -> auto-complete.
	$effect(() => {
		if (!running || resting || !timed || countdown > 0) return;
		const step = instances[idx]?.step;
		if (step?.durationSec == null) return;
		const t = setInterval(() => {
			elapsed += 1;
			if (elapsed >= (step.durationSec as number)) complete();
		}, 1000);
		return () => clearInterval(t);
	});

	// Rest countdown -> move on when it ends.
	$effect(() => {
		if (restLeft > 0) {
			const t = setInterval(() => {
				restLeft = Math.max(0, restLeft - 1);
			}, 1000);
			return () => clearInterval(t);
		}
		if (restThenAdvance) {
			restThenAdvance = false;
			afterStep();
		}
		return;
	});

	// Hold to finish (3 seconds). Shown while not running. Works from a pointer
	// and from the keyboard (hold Space or Enter), and there is a plain tap path
	// ("Tap to finish") that opens a confirm for anyone who cannot hold.
	function startHold() {
		if (holdTimer || finished) return;
		holdTimer = setInterval(() => {
			hold = Math.min(100, hold + 100 / 30);
			if (hold >= 100) {
				if (holdTimer) clearInterval(holdTimer);
				holdTimer = undefined;
				onFinish();
			}
		}, 100);
	}
	function cancelHold() {
		if (holdTimer) {
			clearInterval(holdTimer);
			holdTimer = undefined;
		}
		if (hold < 100) hold = 0;
	}
	/** Keyboard path for the hold: Space or Enter holds while pressed. */
	function holdKeyDown(e: KeyboardEvent) {
		if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
			e.preventDefault();
			startHold();
		}
	}
	function holdKeyUp(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') cancelHold();
	}
	onDestroy(() => cancelHold());

	onMount(() => {
		markStarted(session.id);
		const saved = getProgress(session.id);
		if (saved && saved.idx > 0 && saved.idx < (instances.length || 1)) {
			idx = saved.idx;
			elapsed = saved.elapsed ?? 0;
		}
		countdown = 0;
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
	const progress = $derived(`${Math.min(idx + 1, instances.length)} / ${instances.length}`);

	function goHome() {
		close();
		void goto('/');
	}
</script>

<div
	class={asPage
		? 'overflow-y-auto bg-paper outline-none'
		: 'overlay-fade fixed inset-0 z-50 overflow-y-auto bg-paper outline-none'}
	role={asPage ? undefined : 'dialog'}
	aria-modal={asPage ? undefined : 'true'}
	aria-labelledby={asPage ? undefined : titleId}
	data-modal-panel
	tabindex="-1"
	use:modal={{ onClose: close, enabled: !asPage }}
>
	<div class="mx-auto max-w-2xl px-4 pb-24">
		<div class="sticky {asPage ? 'top-16' : 'top-0'} z-10 -mx-4 border-b border-hairline bg-paper px-4 pb-3 pt-5">
		<div class="flex items-center justify-between">
			<button type="button" onclick={close} class="-ml-2 flex h-11 items-center px-2 text-sm text-steel hover:text-ink">‹ Back</button>
			<div class="flex items-center gap-1">
				<button type="button" onclick={goHome} class="flex h-11 items-center px-2 text-sm text-steel hover:text-ink">Stride Guide</button>
				<button type="button" onclick={close} class="tap-target rounded-md text-steel hover:text-ink" aria-label="Close">✕</button>
			</div>
		</div>
		<h1 id={titleId} class="font-display mt-1 text-xl font-bold">{sessionLabel(session)}</h1>
		<div class="mt-1 flex items-center justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
			<button
				type="button"
				role="switch"
				aria-checked={autoNext}
				onclick={toggleAuto}
				class="flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-[11px] text-steel hover:border-steel hover:text-ink"
			>
				<span class="h-2 w-2 rounded-full {autoNext ? 'bg-ok' : 'bg-hairline'}" aria-hidden="true"></span>
				Auto next {autoNext ? 'on' : 'off'}
			</button>
		</div>
		</div>

		{#if finished}
			<div class="mt-6 rounded-xl border border-hairline p-6 text-center">
				<p class="font-display text-lg font-medium">Workout complete</p>
				<p class="mt-1 text-sm text-steel">Log how it went, or hold the button below.</p>
				<button type="button" onclick={onFinish} class="mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Log it</button>
			</div>
		{:else if resting}
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
					<button type="button" onclick={skipRest} class="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper">Skip rest</button>
				</div>
			</div>
		{:else if awaitingNext}
			<div class="mt-6 rounded-xl border border-hairline bg-sunken p-6 text-center">
				<p class="text-xs uppercase tracking-widest text-ok-ink">Step complete</p>
				{#if instances[idx + 1]}
					<p class="font-display mt-1 text-lg font-medium">Next: {instances[idx + 1]!.step.label}</p>
					<p class="tabular mt-1 text-sm text-steel">{stepTarget(instances[idx + 1]!.step)}</p>
					<button type="button" onclick={() => armStep(idx + 1)} class="mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">
						Go to next
					</button>
				{:else}
					<button type="button" onclick={() => (finished = true)} class="mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">
						Finish
					</button>
				{/if}
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
				{#if countdown > 0}
					<p class="tabular mt-2 text-4xl font-medium leading-none">{countdown}</p>
					<div class="mt-1 flex items-center gap-3">
						<span class="text-xs uppercase tracking-widest text-signal-ink">Starting in</span>
						<button type="button" onclick={() => { countdown = 0; startStep(); }} class="btn-outline rounded-md border border-hairline px-3 py-1 text-xs text-steel hover:border-signal hover:text-signal-ink">
							Skip countdown
						</button>
					</div>
				{:else}
					<p class="tabular mt-2 text-4xl font-medium leading-none">
						{repBased ? (current.step.reps ? `${current.step.reps} reps` : formatClock(elapsed)) : clock}
					</p>
				{/if}
				<p class="tabular mt-2 text-sm">{stepTarget(current.step)}</p>
				{#if current.step.note}<p class="mt-2 text-sm text-steel">{current.step.note}</p>{/if}

				<div class="mt-4 flex gap-2">
					{#if repBased}
						<button type="button" onclick={complete} class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90">Done set</button>
					{:else}
						<button
							type="button"
							onclick={() => {
								running = !running;
								if (!running) save();
							}}
							disabled={countdown > 0}
							class="flex flex-1 items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
						>
							{#if running}
								<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="3" height="10" rx="1" /><rect x="11" y="5" width="3" height="10" rx="1" /></svg>
								Pause
							{:else}
								<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7 5.5v9l8-4.5z" /></svg>
								{elapsed > 0 ? 'Resume' : 'Start'}
							{/if}
						</button>
					{/if}
					<button type="button" onclick={() => jump(Math.max(0, idx - 1))} disabled={idx === 0} class="rounded-md border border-hairline px-4 py-3 text-sm disabled:opacity-40" aria-label="Previous step">‹</button>
					{#if idx >= instances.length - 1}
						<button type="button" onclick={() => { finished = true; running = false; save(); }} class="rounded-md border border-hairline px-4 py-3 text-sm font-medium">Finish</button>
					{:else}
						<button type="button" onclick={() => armStep(idx + 1)} class="rounded-md border border-hairline px-4 py-3 text-sm">Next ›</button>
					{/if}
				</div>
				<div class="mt-2 flex gap-2">
					{#if running}
						<button type="button" onclick={() => { restLeft = current?.step.restSec ?? 90; restThenAdvance = true; running = false; }} class="flex-1 rounded-md border border-hairline px-4 py-2 text-sm text-steel hover:text-ink">Rest now</button>
					{:else}
						<button
							type="button"
							onpointerdown={startHold}
							onpointerup={cancelHold}
							onpointerleave={cancelHold}
							onpointercancel={cancelHold}
							onkeydown={holdKeyDown}
							onkeyup={holdKeyUp}
							class="relative flex-1 overflow-hidden rounded-md border border-hairline-strong px-4 py-2 text-sm text-steel hover:border-ok hover:text-ok-ink"
						>
							<span class="absolute inset-y-0 left-0 bg-ok/25 transition-[width] duration-100 ease-linear" style="width: {hold}%" aria-hidden="true"></span>
							<span class="relative">{hold > 0 ? 'Keep holding…' : 'Hold to finish and log'}</span>
						</button>
						<button
							type="button"
							onclick={() => (confirmFinish = true)}
							class="shrink-0 rounded-md border border-hairline px-4 py-2 text-sm text-signal-ink hover:border-signal"
						>
							Tap to finish
						</button>
					{/if}
					{#if machine || drill}
						{@const fname = machine?.name ?? drill?.name ?? ''}
						{@const mm = mediaForMove(fname)}
						<button
							type="button"
							onclick={() => (showForm = true)}
							aria-haspopup="dialog"
							class="flex flex-1 items-center justify-center gap-2 rounded-md border border-hairline px-3 py-2 text-sm text-steel hover:border-steel hover:text-ink"
						>
							{#if mm}
								<img src={mm.start} alt="" class="h-6 w-6 rounded object-contain" />
							{/if}
							Form
							<span aria-hidden="true">▾</span>
						</button>
					{/if}
				</div>

				<FormSheet
					open={showForm && !!(machine || drill)}
					move={machine}
					{drill}
					media={mediaForMove(machine?.name ?? drill?.name ?? '')}
					onClose={() => (showForm = false)}
				/>
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
			Each step starts after a short countdown. With auto next on, steps move on by themselves; with it off, you tap Go to next. Your place is saved, so you can leave and come back. Form cues are guidance, not medical advice.
		</p>
	</div>

	<ConfirmSheet
		open={confirmFinish}
		title="Finish and log this workout?"
		body="This marks the session done and takes you to the log."
		confirmLabel="Finish and log"
		onConfirm={() => {
			confirmFinish = false;
			onFinish();
		}}
		onClose={() => (confirmFinish = false)}
	/>
</div>

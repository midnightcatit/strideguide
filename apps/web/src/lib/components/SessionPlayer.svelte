<script lang="ts">
	import { formatClock } from '@strideguide/shared/units';
	import type { ClientSession, ClientStep } from '$lib/plan';
	import { fmtDistance, fmtPaceBand } from '$lib/prefs.svelte';

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
		step: ClientStep;
	}

	const workout = $derived(session.prescription?.workout);
	const instances = $derived.by<Instance[]>(() => {
		const out: Instance[] = [];
		for (const b of workout?.blocks ?? []) {
			const reps = Math.max(1, b.repeat ?? 1);
			for (let r = 0; r < reps; r++) {
				for (const s of b.steps) {
					out.push({ blockLabel: b.label, rep: reps > 1 ? r + 1 : undefined, totalReps: reps > 1 ? reps : undefined, step: s });
				}
			}
		}
		return out;
	});

	let idx = $state(0);
	let running = $state(false);
	let elapsed = $state(0);
	let finished = $state(false);

	const current = $derived(instances[idx]);
	const remaining = $derived(
		current?.step.durationSec != null ? Math.max(0, current.step.durationSec - elapsed) : null,
	);

	function next() {
		if (idx >= instances.length - 1) {
			running = false;
			finished = true;
			return;
		}
		idx += 1;
		elapsed = 0;
	}
	function prev() {
		if (idx > 0) {
			idx -= 1;
			elapsed = 0;
		}
	}

	$effect(() => {
		if (!running) return;
		const t = setInterval(() => {
			elapsed += 1;
			const step = instances[idx]?.step;
			if (step?.durationSec != null && elapsed >= step.durationSec) next();
		}, 1000);
		return () => clearInterval(t);
	});

	function stepDistance(m?: number): string | null {
		if (m == null) return null;
		return m < 1000 ? `${m} m` : fmtDistance(m / 1000);
	}

	function stepTarget(step: ClientStep): string {
		if (step.durationSec != null) return formatClock(step.durationSec);
		const dist = stepDistance(step.distanceM);
		const pace = fmtPaceBand(step.targetPaceSecPerKm);
		if (dist && pace) return `${dist} @ ${pace}`;
		if (dist) return dist;
		if (step.sets && step.reps) return `${step.sets} × ${step.reps} reps`;
		return step.label;
	}

	const done = $derived(idx >= instances.length);
	const clock = $derived(remaining != null ? formatClock(remaining) : formatClock(elapsed));
</script>

<div class="fixed inset-0 z-30 overflow-y-auto bg-paper">
	<div class="mx-auto max-w-2xl px-4 py-5">
		<div class="flex items-start justify-between gap-3">
			<div>
				<p class="text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
				<h1 class="font-display text-xl font-bold">{session.title ?? 'Workout'}</h1>
			</div>
			<button type="button" onclick={onClose} class="px-2 py-1 text-steel hover:text-ink" aria-label="Close">
				✕
			</button>
		</div>

		{#if workout?.totalDistanceKm || workout?.estimatedDurationMin}
			<p class="tabular mt-1 text-xs text-steel">
				{#if workout.totalDistanceKm}≈ {fmtDistance(workout.totalDistanceKm)}{/if}
				{#if workout.estimatedDurationMin}· ~{workout.estimatedDurationMin} min{/if}
			</p>
		{/if}

		<hr class="my-4 border-hairline" />

		<!-- current step (hero when running) -->
		{#if current && !finished}
			<div class="relative overflow-hidden rounded-xl border border-hairline bg-paper p-4">
				<div class="absolute right-0 top-0 h-full w-1.5 bg-signal" aria-hidden="true"></div>
				<div class="flex items-baseline justify-between">
					<span class="tabular text-xs uppercase tracking-widest text-steel">
						{current.blockLabel ?? ''}{current.rep ? ` · rep ${current.rep}/${current.totalReps}` : ''}
					</span>
					<span class="tabular text-xs uppercase tracking-widest text-signal-ink">{current.step.kind}</span>
				</div>
				<h2 class="font-display mt-1 text-lg font-medium">{current.step.label}</h2>
				<p class="tabular mt-2 text-3xl font-medium leading-none">{clock}</p>
				<p class="tabular mt-2 text-sm">{stepTarget(current.step)}</p>
				{#if current.step.note}<p class="mt-2 text-sm text-steel">{current.step.note}</p>{/if}
				<div class="mt-4 flex gap-2">
					<button
						type="button"
						onclick={() => (running = !running)}
						class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90"
					>
						{running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
					</button>
					<button
						type="button"
						onclick={prev}
						disabled={idx === 0}
						class="rounded-md border border-hairline px-4 py-3 text-sm disabled:opacity-40"
					>
						‹
					</button>
					<button
						type="button"
						onclick={next}
						class="rounded-md border border-hairline px-4 py-3 text-sm"
					>
						Next ›
					</button>
				</div>
			</div>
		{:else if finished}
			<div class="rounded-xl border border-hairline p-6 text-center">
				<p class="font-display text-lg font-medium">Workout complete</p>
				<p class="mt-1 text-sm text-steel">Nice work. Log how it went.</p>
				<button
					type="button"
					onclick={onFinish}
					class="mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
				>
					Log it
				</button>
			</div>
		{/if}

		<!-- full stage list -->
		<h2 class="mt-6 text-xs uppercase tracking-widest text-steel">Workout stages</h2>
		<ul class="mt-2 divide-y divide-hairline border-y border-hairline">
			{#each instances as inst, i (i)}
				<li>
					<button
						type="button"
						onclick={() => {
							idx = i;
							elapsed = 0;
							finished = false;
						}}
						class="flex w-full items-start justify-between gap-3 py-2.5 text-left {i === idx
							? 'text-signal-ink'
							: 'text-ink'} hover:text-signal-ink"
					>
						<span class="flex-1">
							<span class="text-sm"
								>{inst.blockLabel ? `${inst.blockLabel}: ` : ''}{inst.step.label}{inst.rep
									? ` (${inst.rep}/${inst.totalReps})`
									: ''}</span
							>
							{#if inst.step.note}
								<span class="mt-0.5 block text-xs text-steel">{inst.step.note}</span>
							{/if}
						</span>
						<span class="tabular shrink-0 text-xs text-steel">{stepTarget(inst.step)}</span>
					</button>
				</li>
			{/each}
		</ul>
		<p class="mt-4 text-xs text-steel">
			Guided by time/target — advance manually with Next at track or on hills.
		</p>
	</div>
</div>

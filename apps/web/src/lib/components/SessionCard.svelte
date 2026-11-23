<script lang="ts">
	import type { ClientLog, ClientSession } from '$lib/plan';
	import { formatDuration, sessionTypeLabel } from '$lib/plan';
	import { fmtDistance, fmtPace, sessionLabel } from '$lib/prefs.svelte';
	import IntensityLadder from '$lib/components/IntensityLadder.svelte';
	import { isStarted } from '$lib/started.svelte';
	import { isSkipped } from '$lib/skipped.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';

	let {
		session,
		eyebrow = '',
		active = false,
		logged = null,
		onLog,
		onStart,
		onOpen,
		onRemove,
		onUnskip,
		onCancelProgress,
	}: {
		session: ClientSession;
		eyebrow?: string;
		active?: boolean;
		logged?: ClientLog | null;
		onLog?: () => void;
		onStart?: () => void;
		onOpen?: () => void;
		onRemove?: () => void;
		onUnskip?: () => void;
		onCancelProgress?: () => void;
	} = $props();

	// Hold to reset an in-progress session.
	let cancelHold = $state(0);
	let cancelTimer: ReturnType<typeof setInterval> | undefined;
	function startCancel() {
		if (cancelTimer || !onCancelProgress) return;
		cancelTimer = setInterval(() => {
			cancelHold = Math.min(100, cancelHold + 100 / 20);
			if (cancelHold >= 100) {
				if (cancelTimer) clearInterval(cancelTimer);
				cancelTimer = undefined;
				onCancelProgress?.();
				cancelHold = 0;
			}
		}, 100);
	}
	function stopCancel() {
		if (cancelTimer) {
			clearInterval(cancelTimer);
			cancelTimer = undefined;
		}
		if (cancelHold < 100) cancelHold = 0;
	}

	const p = $derived(session.prescription ?? {});
	const status = $derived<'done' | 'skipped' | 'in-progress' | 'not-started'>(
		logged
			? 'done'
			: isSkipped(session.id)
				? 'skipped'
				: isStarted(session.id)
					? 'in-progress'
					: 'not-started',
	);
	const statusLabel = $derived(
		status === 'done'
			? 'Done'
			: status === 'skipped'
				? 'Skipped'
				: status === 'in-progress'
					? 'In progress'
					: 'Not started',
	);
	const statusClass = $derived(
		status === 'done'
			? 'bg-ok-wash text-ok'
			: status === 'skipped'
				? 'bg-ink/10 text-ink'
				: status === 'in-progress'
					? 'bg-signal-wash text-signal-ink'
					: 'bg-sunken text-steel',
	);
	const isRun = $derived(session.modality === 'running');
	const isStrength = $derived(session.modality === 'strength');
	const machines = $derived(p.blocks ?? []);
	const reps = $derived(machines[0]?.sets?.[0]?.reps ?? 0);
	// Facts that fit, as pills, so the card reads at a glance.
	const pills = $derived.by(() => {
		const out: { text: string; band?: boolean }[] = [];
		if (isStrength) {
			if (machines.length) out.push({ text: `${machines.length} moves` });
			if (reps) out.push({ text: `3 × ${reps}` });
			out.push({ text: 'Strength' });
			return out;
		}
		if (p.targetDistanceKm != null) out.push({ text: fmtDistance(p.targetDistanceKm) });
		const dur = formatDuration(session.durationMin);
		if (dur) out.push({ text: dur });
		if (p.intensity) {
			out.push({
				text: p.intensity === 'easy' ? 'Easy' : p.intensity === 'steady' ? 'Steady' : 'Hard',
				band: true,
			});
		}
		if (p.targetPaceSecPerKm) {
			const mid = Math.round((p.targetPaceSecPerKm[0] + p.targetPaceSecPerKm[1]) / 2);
			out.push({ text: `≈ ${fmtPace(mid)}` });
		}
		return out;
	});
	// One line for every card, so run and strength cards stay the same height.
	const metaLine = $derived.by(() => {
		if (logged) {
			const sync = logged.pending ? ' · syncing' : '';
			if (isStrength && logged.strengthSets?.length) return `Logged · ${logged.strengthSets.length} moves${sync}`;
			if (logged.runStats?.distanceKm) {
				const pace = logged.runStats.avgPaceSecPerKm ? ` · ${fmtPace(logged.runStats.avgPaceSecPerKm)}` : '';
				return `Logged · ${fmtDistance(logged.runStats.distanceKm)}${pace}${sync}`;
			}
			return `Logged${sync}`;
		}
		if (isStrength && machines.length) return machines.map((m) => m.machine).join(' · ');
		return '';
	});
</script>

<article
	class="stage-card lift relative overflow-hidden rounded-xl border p-4 sm:p-5 {logged
		? 'bg-ok-wash'
		: active
			? 'bg-signal-wash'
			: 'bg-paper'} {active ? 'border-signal-ink' : 'border-hairline'} {onOpen
		? 'shadow-[0_1px_3px_rgba(25,28,34,0.06)]'
		: ''}"
>
	<div
		class="absolute left-0 top-0 h-full w-0.5 {logged
			? 'bg-ok'
			: isStrength
				? 'bg-steel'
				: 'bg-signal-ink'} {active && !logged ? 'breathe' : ''}"
		aria-hidden="true"
	></div>

	{#if onOpen}
		<button
			type="button"
			class="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-ink"
			aria-label="Open {sessionLabel(session)} details"
			onclick={onOpen}
		></button>
	{/if}

	<div class="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col">
		<div class="flex items-baseline justify-between gap-3">
			<span class="flex min-w-0 items-center gap-2">
				<span class="tabular truncate text-xs uppercase tracking-widest text-steel">{eyebrow}</span>
				<IntensityLadder intensity={p.intensity} label={false} />
			</span>
			<span class="flex shrink-0 items-center gap-1 tabular text-xs uppercase tracking-widest {isStrength ? 'text-steel' : 'text-signal-ink'}"
				><SessionIcon type={session.type} size="h-3.5 w-3.5" />{sessionTypeLabel(session.type)}{#if logged}
					<span class="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ok text-paper" aria-label="Completed">
						<svg class="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M4 10.5l4 4 8-9" />
						</svg>
					</span>
				{/if}</span
			>
		</div>

		<h2 class="font-display mt-1.5 truncate text-xl font-semibold leading-tight">{sessionLabel(session)}</h2>

		<hr class="my-3 border-hairline" />

		<div class="flex flex-wrap gap-1.5">
			{#each pills as pill (pill.text)}
				<span class="rounded-full border border-hairline px-2.5 py-1 text-xs {pill.band ? 'text-signal-ink' : 'text-ink'}">{pill.text}</span>
			{/each}
		</div>

		<hr class="my-3 border-hairline" />

		<div class="mt-auto flex items-center gap-2 pt-3">
			<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide {statusClass}">{statusLabel}</span>
			{#if metaLine}<p class="tabular min-w-0 truncate text-sm {logged ? 'text-ink' : 'text-steel'}">{metaLine}</p>{/if}
		</div>
	</div>

	<div class="relative z-20 mt-4 flex shrink-0 items-center gap-2">
		{#if status === 'done'}
			{#if onLog}
				<button
					type="button"
					onclick={onLog}
					class="flex-1 rounded-md border border-hairline-strong px-4 py-3 text-sm text-steel hover:border-signal hover:text-signal-ink"
				>
					Log again
				</button>
			{/if}
		{:else if status === 'skipped'}
			{#if onUnskip}
				<button
					type="button"
					onclick={onUnskip}
					class="flex-1 rounded-md border border-hairline-strong px-4 py-3 text-sm text-steel hover:border-signal hover:text-signal-ink"
				>
					Un-skip
				</button>
			{/if}
			{#if onLog}
				<button
					type="button"
					onclick={onLog}
					class="flex-1 rounded-md border border-hairline-strong px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
				>
					Log it
				</button>
			{/if}
		{:else}
			{#if onStart && session.prescription?.workout}
				<button
					type="button"
					onclick={onStart}
					class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90"
				>
					{status === 'in-progress' ? 'Resume' : 'Start'}
				</button>
			{/if}
			{#if onLog}
				<button
					type="button"
					onclick={onLog}
					class="flex-1 rounded-md border border-hairline-strong px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
				>
					Log it
				</button>
			{/if}
		{/if}
		{#if onRemove}
			<button
				type="button"
				onclick={onRemove}
				aria-label="Remove this workout"
				class="shrink-0 rounded-md border border-hairline-strong px-3 py-3 text-sm text-steel hover:border-danger hover:text-danger"
			>
				✕
			</button>
		{/if}
	</div>

	{#if status === 'in-progress' && onCancelProgress}
		<button
			type="button"
			onpointerdown={startCancel}
			onpointerup={stopCancel}
			onpointerleave={stopCancel}
			onpointercancel={stopCancel}
			class="relative z-20 mt-2 w-full overflow-hidden rounded-md border border-hairline px-4 py-2 text-xs text-steel hover:border-danger hover:text-danger"
		>
			<span class="absolute inset-y-0 left-0 bg-danger/15 transition-[width] duration-100 ease-linear" style="width: {cancelHold}%" aria-hidden="true"></span>
			<span class="relative">{cancelHold > 0 ? 'Keep holding to reset…' : 'Hold to reset this workout'}</span>
		</button>
	{/if}
</article>

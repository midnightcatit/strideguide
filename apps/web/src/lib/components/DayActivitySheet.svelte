<script lang="ts">
	import { store } from '$lib/planStore.svelte';
	import {
		type ClientLog,
		type ClientSession,
		addDaysIso,
		formatIsoDay,
		localIso,
	} from '$lib/plan';
	import { fmtDistance, fmtPace, sessionLabel } from '$lib/prefs.svelte';
	import { logMs } from '$lib/metrics';
	import { isSkipped } from '$lib/skipped.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';
	import { modal } from '$lib/actions';
	import { sheetOverlay, sheetPanel } from '$lib/motion';

	/**
	 * The day sheet: what a runner did on one day, opened by tapping a square on
	 * the activity heatmap. It reads the shared plan store, so a day shows the
	 * sessions that were planned for it and the log that answered each, plus any
	 * activity logged that day with no matching session (an import or a workout
	 * added straight to the log). A day with nothing carries a plain empty line
	 * rather than a blank panel.
	 */
	let {
		open,
		iso,
		onClose,
	}: {
		open: boolean;
		iso: string | null;
		onClose: () => void;
	} = $props();

	const todayIso = localIso();
	const titleId = `day-title-${crypto.randomUUID()}`;

	const heading = $derived(
		iso ? formatIsoDay(iso, { weekday: 'long', month: 'long', day: 'numeric' }) : '',
	);
	const isFuture = $derived(!!iso && iso > todayIso);

	type Row = { session: ClientSession | null; log: ClientLog | null; skipped: boolean };

	const rows = $derived.by<Row[]>(() => {
		if (!iso) return [];
		const out: Row[] = [];
		const scheduledIds = new Set<string>();
		for (const w of store.plan?.weeks ?? []) {
			if (!w.startDate) continue;
			for (const s of w.sessions) {
				if (addDaysIso(w.startDate, s.day) !== iso) continue;
				scheduledIds.add(s.id);
				const log = store.logs.find((l) => l.sessionId === s.id) ?? null;
				out.push({ session: s, log, skipped: !log && isSkipped(s.id) });
			}
		}
		// Logs on this day with no matching session: an import or a free log.
		for (const l of store.logs) {
			const ms = logMs(l.createdAt);
			if (!ms) continue;
			if (localIso(new Date(ms)) !== iso) continue;
			if (l.sessionId && scheduledIds.has(l.sessionId)) continue;
			out.push({ session: null, log: l, skipped: false });
		}
		return out;
	});

	const doneCount = $derived(rows.filter((r) => !!r.log).length);
	const totalKm = $derived(rows.reduce((sum, r) => sum + (r.log?.runStats?.distanceKm ?? 0), 0));

	function rowLabel(r: Row): string {
		return r.session ? sessionLabel(r.session) : 'Logged activity';
	}
	function rowStatus(r: Row): string {
		if (r.log) return 'Done';
		return r.skipped ? 'Skipped' : 'Not logged';
	}
</script>

{#if open && iso}
	<div
		class="sg-sheet fixed inset-0 flex items-end justify-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby={titleId}
		use:modal={onClose}
	>
		<button
			type="button"
			aria-label="Close"
			data-modal-backdrop
			onclick={onClose}
			class="absolute inset-0 bg-ink/40"
			transition:sheetOverlay
		></button>
		<div
			data-modal-panel
			tabindex="-1"
			class="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl border-t border-hairline bg-paper px-4 pb-8 pt-3 outline-none"
			transition:sheetPanel
		>
			<div class="mx-auto mb-2 h-1 w-10 rounded-full bg-hairline" aria-hidden="true"></div>
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="tabular text-xs uppercase tracking-widest text-steel">
						{iso === todayIso ? 'Today' : 'Activity'}
					</p>
					<h2 id={titleId} class="mt-0.5 font-display text-lg font-medium">{heading}</h2>
					{#if !isFuture && doneCount > 0}
						<p class="tabular mt-0.5 text-sm text-steel">
							{doneCount} logged{#if totalKm > 0} · {fmtDistance(totalKm)}{/if}
						</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={onClose}
					aria-label="Close"
					class="tap-target -mr-1 rounded-full text-steel hover:text-ink"
				>
					✕
				</button>
			</div>

			{#if isFuture}
				<p class="mt-4 text-sm text-steel">This day is still ahead. Nothing to show yet.</p>
			{:else if rows.length === 0}
				<p class="mt-4 text-sm text-steel">Nothing logged on this day. A rest day stays open on purpose.</p>
			{:else}
				<ul class="mt-3 divide-y divide-hairline">
					{#each rows as r, i (r.session?.id ?? r.log?.id ?? `row-${i}`)}
						{@const done = !!r.log}
						<li class="flex items-start gap-3 py-3.5 first:pt-0 last:pb-1">
							<span
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {done
									? 'bg-ok-wash text-ok-ink'
									: r.skipped
										? 'bg-sunken text-steel ring-1 ring-hairline-strong'
										: 'bg-sunken text-steel'}"
							>
								<SessionIcon type={r.session?.type ?? 'easy'} size="h-4 w-4" />
							</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-baseline justify-between gap-2">
									<p class="min-w-0 break-words text-sm font-medium">{rowLabel(r)}</p>
									<span class="shrink-0 text-[11px] {done ? 'text-ok-ink' : 'text-steel'}">{rowStatus(r)}</span>
								</div>
								{#if r.log}
									<div class="tabular mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-steel">
										{#if r.log.runStats?.distanceKm}<span>{fmtDistance(r.log.runStats.distanceKm)}</span>{/if}
										{#if r.log.runStats?.durationSec}<span>{Math.round(r.log.runStats.durationSec / 60)} min</span>{/if}
										{#if r.log.runStats?.avgPaceSecPerKm}<span>{fmtPace(r.log.runStats.avgPaceSecPerKm)}</span>{/if}
										{#if r.log.rpe}<span>RPE {r.log.rpe}</span>{/if}
										{#if r.log.strengthSets?.length}<span>{r.log.strengthSets.length} exercise{r.log.strengthSets.length === 1 ? '' : 's'}</span>{/if}
									</div>
									{#if r.log.notes}
										<p class="mt-1 text-xs text-steel">{r.log.notes}</p>
									{/if}
								{:else if r.session?.prescription?.summary}
									<p class="mt-1 text-xs text-steel">{r.session.prescription.summary}</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

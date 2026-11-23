<script lang="ts">
	import { type ClientLog, type ClientSession, formatDuration, sessionTypeLabel } from '$lib/plan';
	import { fmtDistance, sessionLabel } from '$lib/prefs.svelte';
	import SessionIcon from '$lib/components/SessionIcon.svelte';
	import { isStarted } from '$lib/started.svelte';
	import { isSkipped } from '$lib/skipped.svelte';

	let {
		session,
		logged = null,
		onOpen,
	}: {
		session: ClientSession;
		logged?: ClientLog | null;
		onOpen?: () => void;
	} = $props();

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
	const p = $derived(session.prescription ?? {});
	const detail = $derived(
		session.modality === 'running' && p.targetDistanceKm != null
			? fmtDistance(p.targetDistanceKm)
			: (formatDuration(session.durationMin) ?? ''),
	);
</script>

<button
	type="button"
	onclick={onOpen}
	class="lift flex w-44 shrink-0 snap-start flex-col rounded-xl border border-hairline p-3 text-left shadow-[0_1px_3px_rgba(25,28,34,0.06)] {logged
		? 'bg-ok-wash'
		: 'bg-paper'}"
>
	<span class="flex items-center gap-1.5 text-signal-ink">
		<SessionIcon type={session.type} size="h-3.5 w-3.5" />
		<span class="tabular truncate text-[10px] uppercase tracking-wide">{sessionTypeLabel(session.type)}</span>
	</span>
	<span class="font-display mt-1 truncate text-sm font-semibold">{sessionLabel(session)}</span>
	<span class="mt-1.5 flex items-center justify-between gap-2">
		<span class="tabular truncate text-xs text-steel">{detail}</span>
		<span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide {statusClass}">{statusLabel}</span>
	</span>
</button>

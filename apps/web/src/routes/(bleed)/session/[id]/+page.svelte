<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		store,
		weekForSession,
		planProfileName,
	} from '$lib/planStore.svelte';
	import { isSkipped, skipSession, unskipSession } from '$lib/skipped.svelte';
	import { markStarted } from '$lib/started.svelte';
	import { addDaysIso, localIso } from '$lib/plan';
	import { goBack, logHref, notesHref, playHref } from '$lib/sessionNav';
	import SessionGate from '$lib/components/SessionGate.svelte';
	import SessionDetail from '$lib/components/SessionDetail.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';

	const id = $derived(page.params.id ?? '');
	const from = $derived(page.url.searchParams.get('from') || '/today');

	let confirm = $state<{
		title: string;
		body: string;
		confirmLabel: string;
		action: () => void;
	} | null>(null);
</script>

<SessionGate {id}>
	{#snippet children(session)}
		{@const week = weekForSession(session)}
		{@const eyebrow = `${planProfileName()}${week ? ` · Week ${week.weekNumber}` : ''}`}
		{@const logged = store.logs.find((l) => l.sessionId === session.id) ?? null}
		{@const sessionIso = week?.startDate ? addDaysIso(week.startDate, session.day) : null}
		{@const editable = !!sessionIso && sessionIso >= addDaysIso(localIso(), -30)}
		<SessionDetail
			{session}
			{eyebrow}
			{logged}
			skipped={isSkipped(session.id)}
			readOnly={!editable}
			asPage
			onClose={() => goBack(from)}
			onStart={() => {
				markStarted(session.id);
				void goto(playHref(session.id, from));
			}}
			onLog={() => goto(logHref(session.id, from))}
			onNotes={() => goto(notesHref(session.id, from))}
			onSkip={() =>
				(confirm = {
					title: 'Skip this workout?',
					body: 'It stays on your calendar, marked as skipped. You can un-skip it any time.',
					confirmLabel: 'Skip it',
					action: () => {
						skipSession(session.id);
						goBack(from);
					},
				})}
			onUnskip={() =>
				(confirm = {
					title: 'Un-skip this workout?',
					body: 'It goes back to your normal plan for the day.',
					confirmLabel: 'Un-skip',
					action: () => unskipSession(session.id),
				})}
		/>
	{/snippet}
</SessionGate>

<ConfirmSheet
	open={confirm !== null}
	title={confirm?.title ?? ''}
	body={confirm?.body ?? ''}
	confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
	onConfirm={() => confirm?.action()}
	onClose={() => (confirm = null)}
/>

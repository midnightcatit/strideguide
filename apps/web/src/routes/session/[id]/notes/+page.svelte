<script lang="ts">
	import { page } from '$app/state';
	import { applySessionNotes } from '$lib/planStore.svelte';
	import { goBack } from '$lib/sessionNav';
	import SessionGate from '$lib/components/SessionGate.svelte';
	import NotesSheet from '$lib/components/NotesSheet.svelte';

	const id = $derived(page.params.id ?? '');
	const from = $derived(page.url.searchParams.get('from') || '/today');
</script>

<SessionGate {id}>
	{#snippet children(session)}
		<NotesSheet
			open
			{session}
			asPage
			onSaved={(notes) => applySessionNotes(session.id, notes)}
			onClose={() => goBack(from)}
		/>
	{/snippet}
</SessionGate>

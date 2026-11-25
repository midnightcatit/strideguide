<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { upsertLog, weekForSession, planProfileName } from '$lib/planStore.svelte';
	import { goBack } from '$lib/sessionNav';
	import SessionGate from '$lib/components/SessionGate.svelte';
	import LogSheet from '$lib/components/LogSheet.svelte';

	const id = $derived(page.params.id ?? '');
	const from = $derived(page.url.searchParams.get('from') || '/today');
</script>

<SessionGate {id}>
	{#snippet children(session)}
		{@const week = weekForSession(session)}
		{@const eyebrow = `${planProfileName()}${week ? ` · Week ${week.weekNumber}` : ''}`}
		<LogSheet
			{session}
			{eyebrow}
			asPage
			onClose={() => goBack(from)}
			onSaved={(log) => {
				upsertLog(log);
				void goto(from, { replaceState: true });
			}}
		/>
	{/snippet}
</SessionGate>

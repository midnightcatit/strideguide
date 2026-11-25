<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { weekForSession, planProfileName } from '$lib/planStore.svelte';
	import { goBack, logHref } from '$lib/sessionNav';
	import SessionGate from '$lib/components/SessionGate.svelte';
	import SessionPlayer from '$lib/components/SessionPlayer.svelte';

	const id = $derived(page.params.id ?? '');
	const from = $derived(page.url.searchParams.get('from') || '/today');
</script>

<SessionGate {id}>
	{#snippet children(session)}
		{#if session.prescription?.workout}
			{@const week = weekForSession(session)}
			{@const eyebrow = `${planProfileName()}${week ? ` · Week ${week.weekNumber}` : ''}`}
			<SessionPlayer
				{session}
				{eyebrow}
				asPage
				onClose={() => goBack(from)}
				onFinish={() => goto(logHref(session.id, from), { replaceState: true })}
			/>
		{:else}
			<p class="mt-6 text-sm text-steel">
				This session has no guided workout.
				<a href={`/session/${session.id}?from=${encodeURIComponent(from)}`} class="ml-1 font-medium text-signal-ink hover:underline">See the session</a>
			</p>
		{/if}
	{/snippet}
</SessionGate>

<script lang="ts">
	import { reloadPlan } from '$lib/planStore.svelte';
	import Card from '$lib/components/Card.svelte';

	/**
	 * The shared plan-load failure state. A failed load is not cached as the empty
	 * plan, so a page shows this with a retry instead of "no plan yet".
	 */
	let { message = 'Could not load your plan.' }: { message?: string } = $props();

	let retrying = $state(false);

	async function retry() {
		retrying = true;
		await reloadPlan().catch(() => {});
		retrying = false;
	}
</script>

<Card class="mt-6">
	<p class="text-sm text-steel">{message}</p>
	<button
		type="button"
		onclick={retry}
		disabled={retrying}
		class="mt-3 rounded-md border border-hairline-strong px-4 py-2 text-sm hover:border-signal hover:text-signal-ink disabled:opacity-60"
	>
		{retrying ? 'Retrying…' : 'Retry'}
	</button>
</Card>

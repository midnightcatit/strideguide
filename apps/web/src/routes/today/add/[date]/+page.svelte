<script lang="ts">
	import { page } from '$app/state';
	import WorkoutAdd from '$lib/components/WorkoutAdd.svelte';

	const date = $derived(page.params.date ?? '');
</script>

<WorkoutAdd {date} back={`/today?date=${date}`} />

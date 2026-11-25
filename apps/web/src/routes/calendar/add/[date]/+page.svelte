<script lang="ts">
	import { page } from '$app/state';
	import WorkoutAdd from '$lib/components/WorkoutAdd.svelte';

	const date = $derived(page.params.date ?? '');
	// The list view opens the picker with `back=/calendar`, so a workout added
	// there returns to the list. Otherwise it returns to the day it came from.
	const back = $derived(page.url.searchParams.get('back') || `/calendar/day/${date}`);
</script>

<WorkoutAdd {date} {back} />

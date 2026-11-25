<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api, type CustomWorkoutInput } from '$lib/api';
	import { ensurePlan, reloadPlan } from '$lib/planStore.svelte';
	import { goBack } from '$lib/sessionNav';
	import WorkoutPicker from '$lib/components/WorkoutPicker.svelte';
	import type { LibraryWorkout } from '@strideguide/shared/plan';

	/**
	 * The add-a-workout route body. Picks a library workout or a custom one for a
	 * date, then returns to the list it came from with the new session revealed.
	 */
	let { date, back }: { date: string; back: string } = $props();

	let error = $state<string | null>(null);

	onMount(() => {
		void ensurePlan();
	});

	function returnHref(sessionId: string): string {
		const sep = back.includes('?') ? '&' : '?';
		return `${back}${sep}reveal=${encodeURIComponent(sessionId)}`;
	}

	async function add(w: LibraryWorkout) {
		error = null;
		try {
			const res = await api.addWorkout(date, w.id);
			await reloadPlan();
			void goto(returnHref(res.session.id), { replaceState: true });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not add that workout.';
		}
	}

	async function addCustom(c: CustomWorkoutInput) {
		error = null;
		try {
			const res = await api.addCustomWorkout(date, c);
			await reloadPlan();
			void goto(returnHref(res.session.id), { replaceState: true });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not add that workout.';
		}
	}
</script>

{#if error}
	<p class="mx-auto mb-3 max-w-2xl text-sm text-signal-ink">{error}</p>
{/if}
<WorkoutPicker {date} asPage onPick={add} onCustom={addCustom} onClose={() => goBack(back)} />

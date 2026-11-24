<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import SettingsSaveBar from '$lib/components/SettingsSaveBar.svelte';
	import SettingsDraftGuard from '$lib/components/SettingsDraftGuard.svelte';
	import FavoritePicker from '$lib/components/FavoritePicker.svelte';
	import { prefs, setFavoriteMachines, setFavoriteWorkouts } from '$lib/prefs.svelte';

	let draftMachines = $state<string[]>([...(prefs.favoriteMachines ?? [])]);
	let draftWorkouts = $state<string[]>([...(prefs.favoriteWorkouts ?? [])]);
	let savedMachines = $state<string[]>([...(prefs.favoriteMachines ?? [])]);
	let savedWorkouts = $state<string[]>([...(prefs.favoriteWorkouts ?? [])]);

	const dirty = $derived(
		JSON.stringify(draftMachines) !== JSON.stringify(savedMachines) ||
			JSON.stringify(draftWorkouts) !== JSON.stringify(savedWorkouts),
	);

	function discard() {
		draftMachines = [...savedMachines];
		draftWorkouts = [...savedWorkouts];
	}

	async function save() {
		await setFavoriteMachines(draftMachines);
		await setFavoriteWorkouts(draftWorkouts);
		savedMachines = [...draftMachines];
		savedWorkouts = [...draftWorkouts];
	}
</script>

<SettingsHeader title="Favorites" />

<p class="mb-5 text-sm leading-relaxed text-steel">
	Pick the machines and workouts you like most. The plan leans toward them when they fit the day,
	and falls back to its own picks when they do not. The change applies the next time we build or
	adjust your plan.
</p>

<FavoritePicker bind:favoriteMachines={draftMachines} bind:favoriteWorkouts={draftWorkouts} />

<SettingsSaveBar {dirty} onSave={save} onDiscard={discard} />

<SettingsDraftGuard {dirty} onDiscard={discard} />

<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ALL_MOVES,
		MUSCLE_GROUPS,
		groupByMuscleGroup,
		moveCategory,
		muscleGroupFor,
		type MachineExercise,
	} from '@strideguide/shared/plan';
	import type { CustomWorkout, CustomWorkoutCategory } from '@strideguide/shared';
	import { api } from '$lib/api';
	import {
		FAVORITE_CATEGORIES,
		FAVORITE_CATEGORY_LABELS,
		customRef,
		filterFavoriteRefs,
		matchesFavorite,
		recipeRefs,
		resolveFavoriteRefs,
		starterCustomWorkoutDraft,
		type FavoriteCategory,
	} from '$lib/favorite-picker';

	let {
		favoriteMachines = $bindable<string[]>([]),
		favoriteWorkouts = $bindable<string[]>([]),
		class: className = '',
	}: {
		favoriteMachines?: string[];
		favoriteWorkouts?: string[];
		class?: string;
	} = $props();

	/** The category choices the temporary custom form offers, in the custom vocabulary. */
	const CUSTOM_CATEGORIES: { value: CustomWorkoutCategory; label: string }[] = [
		{ value: 'running', label: 'Run' },
		{ value: 'strength', label: 'Strength' },
		{ value: 'mobility', label: 'Mobility' },
		{ value: 'recovery', label: 'Recovery' },
	];

	let machineQ = $state('');
	let workoutQ = $state('');
	let machineFilter = $state('all');
	let workoutFilter = $state<FavoriteCategory | 'all'>('all');

	// --- the runner's own workouts, from the #301 API ---
	let customWorkouts = $state<CustomWorkout[]>([]);
	let customLoading = $state(true);
	/** A load failure, shown in place of the list with a retry. */
	let customError = $state<string | null>(null);
	/** A create, edit or delete failure, shown above the list so the list stays usable. */
	let mutationError = $state<string | null>(null);
	let pendingDeleteId = $state<string | null>(null);

	// --- the temporary create and edit form (name and category only) ---
	let formOpen = $state(false);
	let formEditingId = $state<string | null>(null);
	let formName = $state('');
	let formCategory = $state<CustomWorkoutCategory>('running');
	let formSaving = $state(false);
	let formError = $state<string | null>(null);
	/**
	 * Bumped every time a form session starts, so a slow save from an earlier
	 * session cannot close or change a form opened afterwards.
	 */
	let formSession = $state(0);

	onMount(() => {
		void loadCustomWorkouts();
	});

	async function loadCustomWorkouts() {
		customLoading = true;
		try {
			customWorkouts = (await api.listCustomWorkouts()).workouts;
			customError = null;
		} catch (e) {
			customError = e instanceof Error ? e.message : 'Could not load your workouts.';
		} finally {
			customLoading = false;
		}
	}

	/** Every catalog move that belongs to the machines category, once each. */
	const machineOptions = $derived.by(() => {
		const seen = new Set<string>();
		const out: MachineExercise[] = [];
		for (const m of ALL_MOVES) {
			if (moveCategory(m) !== 'machines') continue;
			if (seen.has(m.name)) continue;
			seen.add(m.name);
			out.push(m);
		}
		return out;
	});

	/**
	 * The muscle groups that actually hold a machine, in the shared catalog
	 * order. Other only shows when a machine has no mapped muscle, so the chip
	 * row never carries an empty group.
	 */
	const machineGroups = $derived.by(() => {
		const present = new Set(machineOptions.map((m) => muscleGroupFor(m)));
		return MUSCLE_GROUPS.filter((g) => present.has(g));
	});

	const machineFilters = $derived([
		{ key: 'all', label: 'All' },
		...machineGroups.map((g) => ({ key: g as string, label: g })),
	]);

	const machineTokens = $derived(tokens(machineQ));
	const workoutTokens = $derived(tokens(workoutQ));

	const shownMachines = $derived(
		machineOptions.filter((m) => {
			if (machineFilter !== 'all' && muscleGroupFor(m) !== machineFilter) return false;
			return machineTokens.every((t) => m.name.toLowerCase().includes(t));
		}),
	);

	const shownMachineGroups = $derived(groupByMuscleGroup(shownMachines));

	/** The curated recipes, filtered by the category chip and the search. */
	const shownRecipes = $derived(filterFavoriteRefs(recipeRefs(), workoutFilter, workoutTokens));

	/** The runner's own workouts, filtered the same way. */
	const shownCustom = $derived(
		customWorkouts.filter((w) => matchesFavorite(customRef(w), workoutFilter, workoutTokens)),
	);

	/** The saved picks, resolved to labels in the order they were saved. */
	const pickedRefs = $derived(resolveFavoriteRefs(favoriteWorkouts, customWorkouts));

	const pickedMachines = $derived(machineOptions.filter((m) => favoriteMachines.includes(m.name)));

	function tokens(text: string): string[] {
		return text
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 0);
	}

	/** Flip a value in a list, returning a new list so the bound prop updates. */
	function toggle(list: string[], value: string): string[] {
		return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	}

	function toggleMachine(name: string) {
		favoriteMachines = toggle(favoriteMachines, name);
	}

	function toggleWorkout(id: string) {
		favoriteWorkouts = toggle(favoriteWorkouts, id);
	}

	function openCreate() {
		formSession += 1;
		formEditingId = null;
		formName = '';
		formCategory = 'running';
		formError = null;
		formSaving = false;
		formOpen = true;
	}

	function openEdit(workout: CustomWorkout) {
		formSession += 1;
		formEditingId = workout.id;
		formName = workout.name;
		formCategory = workout.category;
		formError = null;
		formSaving = false;
		formOpen = true;
	}

	function closeForm() {
		formOpen = false;
		formSaving = false;
		formError = null;
	}

	/**
	 * Save the minimal form. The composer is not built yet, so a new workout and
	 * a category change both write a valid starter draft; an edit that keeps the
	 * category keeps the workout's own sections.
	 */
	async function saveForm() {
		const name = formName.trim();
		if (!name) {
			formError = 'Give the workout a name.';
			return;
		}
		// The session this save belongs to, so a slow reply cannot close or
		// change a form the runner opened after starting this one.
		const session = formSession;
		formSaving = true;
		formError = null;
		mutationError = null;
		try {
			if (formEditingId) {
				const existing = customWorkouts.find((w) => w.id === formEditingId);
				const draft =
					existing && existing.category === formCategory
						? { name, category: formCategory, sections: existing.sections }
						: starterCustomWorkoutDraft(name, formCategory);
				const { workout } = await api.updateCustomWorkout(formEditingId, draft);
				customWorkouts = customWorkouts.map((w) => (w.id === workout.id ? workout : w));
			} else {
				const { workout } = await api.createCustomWorkout(
					starterCustomWorkoutDraft(name, formCategory),
				);
				customWorkouts = [...customWorkouts, workout];
			}
			if (formSession === session) closeForm();
		} catch (e) {
			if (formSession === session) {
				formError = e instanceof Error ? e.message : 'Could not save the workout. Try again.';
			}
		} finally {
			if (formSession === session) formSaving = false;
		}
	}

	async function confirmDelete(id: string) {
		pendingDeleteId = null;
		mutationError = null;
		try {
			await api.deleteCustomWorkout(id);
			customWorkouts = customWorkouts.filter((w) => w.id !== id);
			if (favoriteWorkouts.includes(id)) {
				favoriteWorkouts = favoriteWorkouts.filter((f) => f !== id);
			}
		} catch (e) {
			mutationError = e instanceof Error ? e.message : 'Could not delete the workout. Try again.';
		}
	}
</script>

<div class="space-y-6 {className}">
	<section class="rounded-2xl border border-hairline bg-paper p-4">
		<div class="flex items-baseline justify-between gap-3">
			<div>
				<h3 class="font-display text-base font-bold">Favorite machines</h3>
				<p class="mt-0.5 text-xs text-steel">
					Pick the machines you enjoy. Strength sessions reach for these first when they fit.
				</p>
			</div>
			<span class="tabular shrink-0 text-xs text-steel">{favoriteMachines.length} selected</span>
		</div>

		<div class="relative mt-3">
			<input
				type="search"
				bind:value={machineQ}
				enterkeyhint="search"
				aria-label="Search machines"
				placeholder="Search machines"
				class="w-full rounded-xl border border-hairline bg-paper py-2 pl-3 pr-9 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
			/>
			{#if machineQ}
				<button
					type="button"
					onclick={() => (machineQ = '')}
					aria-label="Clear machine search"
					class="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-steel hover:bg-sunken hover:text-ink"
				>
					×
				</button>
			{/if}
		</div>

		<div class="mt-3 flex flex-wrap gap-1.5">
			{#each machineFilters as g (g.key)}
				<button
					type="button"
					aria-pressed={machineFilter === g.key}
					onclick={() => (machineFilter = g.key)}
					class="flex min-h-11 items-center rounded-full border px-3 text-xs {machineFilter === g.key
						? 'border-signal-ink bg-signal-wash font-medium text-signal-ink'
						: 'border-hairline text-steel hover:border-steel'}"
				>
					{g.label}
				</button>
			{/each}
		</div>

		{#if pickedMachines.length}
			<!-- A fixed-height strip: the picks grow sideways and scroll, so the
			     section never grows taller as you add more. `relative` keeps the
			     absolutely positioned screen-reader label inside the strip, so it
			     cannot spill past the viewport and widen the page. -->
			<div
				class="scroll-modern relative mt-3 flex h-16 items-center gap-2 overflow-x-auto overflow-y-hidden"
			>
				{#each pickedMachines as m (m.name)}
					<button
						type="button"
						onclick={() => toggleMachine(m.name)}
						class="no-press flex shrink-0 items-center gap-1.5 rounded-full border border-signal-ink bg-signal-wash px-3 py-1.5 text-xs font-medium text-signal-ink"
					>
						{m.name}
						<span aria-hidden="true">×</span>
						<span class="sr-only">Remove {m.name}</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if shownMachines.length === 0}
			<p class="mt-3 text-xs text-steel">No machines match that search.</p>
		{:else}
			<!-- Grouped by muscle, so a machine always shows under the body part a
			     runner would look for. Every machine appears under All. On a phone
			     the list runs with the page instead of scrolling inside its own box,
			     so a row is never trapped behind the sticky save bar; a wider screen
			     keeps the capped, self-scrolling list. -->
			<div class="scroll-modern mt-3 space-y-3 overflow-y-auto overflow-x-hidden sm:max-h-64">
				{#each shownMachineGroups as group (group.group)}
					<div>
						<h4 class="px-1 text-xs font-medium text-steel">{group.group}</h4>
						<ul class="mt-1 grid grid-cols-1 gap-1">
							{#each group.moves as m (m.name)}
								{@const picked = favoriteMachines.includes(m.name)}
								<li>
									<button
										type="button"
										aria-pressed={picked}
										onclick={() => toggleMachine(m.name)}
										class="no-press flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm {picked
											? 'border-signal-ink bg-signal-wash'
											: 'border-hairline hover:border-signal-ink'}"
									>
										<span class="min-w-0">
											<span class="block truncate">{m.name}</span>
											<span class="mt-0.5 line-clamp-2 text-xs text-steel sm:line-clamp-1">{m.muscles.join(', ')}</span>
										</span>
										{#if picked}
											<span class="shrink-0 text-signal-ink" aria-hidden="true">✓</span>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="rounded-2xl border border-hairline bg-paper p-4">
		<div class="flex items-baseline justify-between gap-3">
			<div>
				<h3 class="font-display text-base font-bold">Favorite workouts</h3>
				<p class="mt-0.5 text-xs text-steel">
					Pick the sessions you like. The plan names one of these when it fits the day.
				</p>
			</div>
			<span class="tabular shrink-0 text-xs text-steel">{pickedRefs.length} selected</span>
		</div>

		<div class="relative mt-3">
			<input
				type="search"
				bind:value={workoutQ}
				enterkeyhint="search"
				aria-label="Search workouts"
				placeholder="Search workouts"
				class="w-full rounded-xl border border-hairline bg-paper py-2 pl-3 pr-9 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
			/>
			{#if workoutQ}
				<button
					type="button"
					onclick={() => (workoutQ = '')}
					aria-label="Clear workout search"
					class="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-steel hover:bg-sunken hover:text-ink"
				>
					×
				</button>
			{/if}
		</div>

		<div class="mt-3 flex flex-wrap gap-1.5">
			<button
				type="button"
				aria-pressed={workoutFilter === 'all'}
				onclick={() => (workoutFilter = 'all')}
				class="flex min-h-11 items-center rounded-full border px-3 text-xs {workoutFilter === 'all'
					? 'border-signal-ink bg-signal-wash font-medium text-signal-ink'
					: 'border-hairline text-steel hover:border-steel'}"
			>
				All
			</button>
			{#each FAVORITE_CATEGORIES as g (g.key)}
				<button
					type="button"
					aria-pressed={workoutFilter === g.key}
					onclick={() => (workoutFilter = g.key)}
					class="flex min-h-11 items-center rounded-full border px-3 text-xs {workoutFilter === g.key
						? 'border-signal-ink bg-signal-wash font-medium text-signal-ink'
						: 'border-hairline text-steel hover:border-steel'}"
				>
					{g.label}
				</button>
			{/each}
		</div>

		{#if pickedRefs.length}
			<div
				class="scroll-modern relative mt-3 flex h-16 items-center gap-2 overflow-x-auto overflow-y-hidden"
			>
				{#each pickedRefs as ref (ref.id)}
					<button
						type="button"
						onclick={() => toggleWorkout(ref.id)}
						class="no-press flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-signal-ink bg-signal-wash px-3 text-xs font-medium text-signal-ink"
					>
						{ref.title}
						<span aria-hidden="true">×</span>
						<span class="sr-only">Remove {ref.title}</span>
					</button>
				{/each}
			</div>
		{/if}

		<!-- The runner's own workouts. These come from the #301 API and carry a
		     create, edit and delete flow. -->
		<div class="mt-4 flex items-center justify-between gap-2">
			<h4 class="text-xs font-medium uppercase tracking-widest text-steel">Your workouts</h4>
			<button
				type="button"
				onclick={openCreate}
				disabled={customLoading}
				class="flex min-h-11 items-center gap-1 rounded-lg border border-dashed border-hairline-strong px-3 text-xs font-medium text-signal-ink hover:border-signal disabled:opacity-60"
			>
				＋ New workout
			</button>
		</div>

		{#if formOpen}
			<div class="mt-2 rounded-xl border border-hairline bg-sunken p-3">
				<p class="text-xs font-medium text-ink">
					{formEditingId ? 'Edit workout' : 'New workout'}
				</p>
				<label class="mt-2 block text-xs text-steel">
					Name
					<input
						bind:value={formName}
						maxlength="80"
						placeholder="Morning hills"
						class="mt-1 w-full rounded-md border border-hairline-strong bg-paper px-3 py-2 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
					/>
				</label>
				<label class="mt-2 block text-xs text-steel">
					Category
					<select
						bind:value={formCategory}
						class="mt-1 w-full rounded-md border border-hairline-strong bg-paper px-3 py-2 text-base text-ink focus:border-signal-ink focus:outline-none sm:text-sm"
					>
						{#each CUSTOM_CATEGORIES as c (c.value)}
							<option value={c.value}>{c.label}</option>
						{/each}
					</select>
				</label>
				{#if formError}
					<p role="alert" class="mt-2 text-sm text-danger">{formError}</p>
				{/if}
				<div class="mt-3 flex gap-2">
					<button
						type="button"
						onclick={saveForm}
						disabled={formSaving}
						class="min-h-11 flex-1 rounded-lg bg-ink px-4 text-sm font-medium text-paper disabled:opacity-60"
					>
						{formSaving ? 'Saving...' : formEditingId ? 'Save' : 'Create'}
					</button>
					<button
						type="button"
						onclick={closeForm}
						class="min-h-11 rounded-lg border border-hairline px-4 text-sm text-steel hover:border-steel"
					>
						Cancel
					</button>
				</div>
				<p class="mt-2 text-xs text-steel">
					The full composer is coming. For now this saves the name and category.
				</p>
			</div>
		{/if}

		{#if mutationError}
			<p role="alert" class="mt-2 text-xs text-danger">{mutationError}</p>
		{/if}

		{#if customLoading}
			<p class="mt-2 text-xs text-steel">Loading your workouts...</p>
		{:else if customError}
			<div class="mt-2 flex items-center gap-2">
				<p class="text-xs text-danger">{customError}</p>
				<button
					type="button"
					onclick={() => void loadCustomWorkouts()}
					class="min-h-11 shrink-0 rounded-lg border border-hairline px-3 text-xs text-steel hover:border-steel"
				>
					Try again
				</button>
			</div>
		{:else if shownCustom.length === 0}
			<p class="mt-2 text-xs text-steel">
				{workoutQ || workoutFilter !== 'all'
					? 'No workouts of yours match.'
					: 'You have no workouts of your own yet.'}
			</p>
		{:else}
			<ul class="mt-2 grid gap-1">
				{#each shownCustom as w (w.id)}
					{@const ref = customRef(w)}
					{@const picked = favoriteWorkouts.includes(w.id)}
					<li
						class="flex items-stretch gap-2 rounded-xl border p-2 {picked
							? 'border-signal-ink bg-signal-wash'
							: 'border-hairline'}"
					>
						<button
							type="button"
							aria-pressed={picked}
							onclick={() => toggleWorkout(w.id)}
							class="no-press flex min-h-11 flex-1 items-center gap-3 rounded-lg px-1 text-left"
						>
							{#if ref.imagePath}
								<img
									src={ref.imagePath}
									alt=""
									loading="lazy"
									class="h-12 w-12 shrink-0 rounded-lg border border-hairline object-cover"
								/>
							{/if}
							<span class="min-w-0">
								<span class="block truncate font-display font-medium">{w.name}</span>
								<span class="mt-0.5 block text-xs text-steel">{FAVORITE_CATEGORY_LABELS[ref.category]}</span>
							</span>
							{#if picked}
								<span class="ml-auto shrink-0 text-signal-ink" aria-hidden="true">✓</span>
							{/if}
						</button>
						{#if pendingDeleteId === w.id}
							<button
								type="button"
								onclick={() => confirmDelete(w.id)}
								class="min-h-11 shrink-0 rounded-lg bg-danger px-3 text-xs font-medium text-paper"
							>
								Delete
							</button>
							<button
								type="button"
								onclick={() => (pendingDeleteId = null)}
								class="min-h-11 shrink-0 rounded-lg border border-hairline px-3 text-xs text-steel hover:border-steel"
							>
								Keep
							</button>
						{:else}
							<button
								type="button"
								onclick={() => openEdit(w)}
								aria-label="Edit {w.name}"
								class="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-hairline text-xs text-steel hover:border-steel"
							>
								Edit
							</button>
							<button
								type="button"
								onclick={() => (pendingDeleteId = w.id)}
								aria-label="Delete {w.name}"
								class="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-hairline text-steel hover:border-danger hover:text-danger"
							>
								×
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<p class="mt-2 text-xs text-steel">
			Saved to your account. The plan does not use them yet.
		</p>

		<!-- The curated recipes: the sessions a runner asks for by name. -->
		<h4 class="mt-5 text-xs font-medium uppercase tracking-widest text-steel">Library</h4>
		{#if shownRecipes.length === 0}
			<p class="mt-2 text-xs text-steel">No library workouts match that search.</p>
		{:else}
			<ul class="scroll-modern mt-2 grid gap-2 overflow-y-auto overflow-x-hidden sm:max-h-80">
				{#each shownRecipes as ref (ref.id)}
					{@const picked = favoriteWorkouts.includes(ref.id)}
					<li>
						<button
							type="button"
							aria-pressed={picked}
							onclick={() => toggleWorkout(ref.id)}
							class="no-press flex w-full items-center gap-3 rounded-xl border p-3 text-left {picked
								? 'border-signal-ink bg-signal-wash'
								: 'border-hairline hover:border-signal-ink'}"
						>
							{#if ref.imagePath}
								<img
									src={ref.imagePath}
									alt=""
									loading="lazy"
									class="h-12 w-12 shrink-0 rounded-lg border border-hairline object-cover"
								/>
							{/if}
							<span class="min-w-0 flex-1">
								<span class="flex items-baseline justify-between gap-2">
									<span class="min-w-0 font-display font-medium">{ref.title}</span>
									{#if ref.durationMin}
										<span class="tabular shrink-0 text-xs text-steel">{ref.durationMin} min</span>
									{/if}
								</span>
								{#if ref.summary}
									<span class="mt-1 block text-xs leading-relaxed text-steel">{ref.summary}</span>
								{/if}
							</span>
							{#if picked}
								<span class="shrink-0 text-signal-ink" aria-hidden="true">✓</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

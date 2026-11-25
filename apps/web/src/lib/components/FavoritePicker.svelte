<script lang="ts">
	import {
		ALL_MOVES,
		WORKOUT_LIBRARY,
		MUSCLE_GROUPS,
		groupByMuscleGroup,
		moveCategory,
		muscleGroupFor,
		type LibraryWorkout,
		type MachineExercise,
	} from '@strideguide/shared/plan';

	let {
		favoriteMachines = $bindable<string[]>([]),
		favoriteWorkouts = $bindable<string[]>([]),
		class: className = '',
	}: {
		favoriteMachines?: string[];
		favoriteWorkouts?: string[];
		class?: string;
	} = $props();

	const WORKOUT_FILTERS: { key: string; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'running', label: 'Run' },
		{ key: 'walking', label: 'Walk' },
		{ key: 'strength', label: 'Strength' },
		{ key: 'mobility', label: 'Mobility' },
		{ key: 'recovery', label: 'Recovery' },
	];

	let machineQ = $state('');
	let workoutQ = $state('');
	let machineFilter = $state('all');
	let workoutFilter = $state('all');

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

	const byWorkoutFilter = $derived(
		workoutFilter === 'all'
			? WORKOUT_LIBRARY
			: WORKOUT_LIBRARY.filter((w) => w.modality === workoutFilter),
	);
	const shownWorkouts = $derived(
		byWorkoutFilter.filter((w) => {
			if (workoutTokens.length === 0) return true;
			const hay = [w.title, w.summary, w.purpose, w.type, w.modality, ...w.tags]
				.join(' ')
				.toLowerCase();
			return workoutTokens.every((t) => hay.includes(t));
		}),
	);

	const pickedMachines = $derived(machineOptions.filter((m) => favoriteMachines.includes(m.name)));
	const pickedWorkouts = $derived(
		favoriteWorkouts
			.map((id) => WORKOUT_LIBRARY.find((w) => w.id === id))
			.filter((w): w is LibraryWorkout => !!w),
	);

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
					class="rounded-full border px-3 py-1.5 text-xs {machineFilter === g.key
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
			     runner would look for. Every machine appears under All. -->
			<div class="scroll-modern mt-3 max-h-64 space-y-3 overflow-y-auto overflow-x-hidden">
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
											<span class="mt-0.5 block truncate text-xs text-steel">{m.muscles.join(', ')}</span>
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
			<span class="tabular shrink-0 text-xs text-steel">{favoriteWorkouts.length} selected</span>
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
			{#each WORKOUT_FILTERS as g (g.key)}
				<button
					type="button"
					aria-pressed={workoutFilter === g.key}
					onclick={() => (workoutFilter = g.key)}
					class="rounded-full border px-3 py-1.5 text-xs {workoutFilter === g.key
						? 'border-signal-ink bg-signal-wash font-medium text-signal-ink'
						: 'border-hairline text-steel hover:border-steel'}"
				>
					{g.label}
				</button>
			{/each}
		</div>

		{#if pickedWorkouts.length}
			<div
				class="scroll-modern relative mt-3 flex h-16 items-center gap-2 overflow-x-auto overflow-y-hidden"
			>
				{#each pickedWorkouts as w (w.id)}
					<button
						type="button"
						onclick={() => toggleWorkout(w.id)}
						class="no-press flex shrink-0 items-center gap-1.5 rounded-full border border-signal-ink bg-signal-wash px-3 py-1.5 text-xs font-medium text-signal-ink"
					>
						{w.title}
						<span aria-hidden="true">×</span>
						<span class="sr-only">Remove {w.title}</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if shownWorkouts.length === 0}
			<p class="mt-3 text-xs text-steel">No workouts match that search.</p>
		{:else}
			<ul class="scroll-modern mt-3 grid max-h-80 gap-2 overflow-y-auto overflow-x-hidden">
				{#each shownWorkouts as w (w.id)}
					{@const picked = favoriteWorkouts.includes(w.id)}
					<li>
						<button
							type="button"
							aria-pressed={picked}
							onclick={() => toggleWorkout(w.id)}
							class="no-press flex w-full flex-col rounded-xl border p-3 text-left {picked
								? 'border-signal-ink bg-signal-wash'
								: 'border-hairline hover:border-signal-ink'}"
						>
							<span class="flex items-baseline justify-between gap-2">
								<span class="min-w-0 font-display font-medium">{w.title}</span>
								<span class="shrink-0 text-xs text-steel">
									{picked ? '✓ ' : ''}{w.durationMin} min
								</span>
							</span>
							<span class="mt-1 text-xs leading-relaxed text-steel">{w.summary}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

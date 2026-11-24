<script lang="ts">
	import {
		ALL_MOVES,
		WORKOUT_LIBRARY,
		moveCategory,
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

	const FILTERS: { key: string; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'running', label: 'Run' },
		{ key: 'walking', label: 'Walk' },
		{ key: 'strength', label: 'Strength' },
		{ key: 'mobility', label: 'Mobility' },
		{ key: 'recovery', label: 'Recovery' },
	];

	let machineQ = $state('');
	let workoutQ = $state('');
	let filter = $state('all');

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

	const machineTokens = $derived(tokens(machineQ));
	const workoutTokens = $derived(tokens(workoutQ));

	const shownMachines = $derived(
		machineOptions.filter((m) => machineTokens.every((t) => m.name.toLowerCase().includes(t))),
	);

	const byFilter = $derived(
		filter === 'all' ? WORKOUT_LIBRARY : WORKOUT_LIBRARY.filter((w) => w.modality === filter),
	);
	const shownWorkouts = $derived(
		byFilter.filter((w) => {
			if (workoutTokens.length === 0) return true;
			const hay = [w.title, w.summary, w.purpose, w.type, w.modality, ...w.tags]
				.join(' ')
				.toLowerCase();
			return workoutTokens.every((t) => hay.includes(t));
		}),
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

		<input
			type="search"
			bind:value={machineQ}
			enterkeyhint="search"
			aria-label="Search machines"
			placeholder="Search machines"
			class="mt-3 w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
		/>

		{#if favoriteMachines.length}
			<ul class="mt-3 flex flex-wrap gap-2">
				{#each favoriteMachines as name (name)}
					<li>
						<button
							type="button"
							onclick={() => toggleMachine(name)}
							class="flex items-center gap-1.5 rounded-full border border-signal-ink bg-signal-wash px-3 py-1.5 text-xs font-medium text-signal-ink"
						>
							{name}
							<span aria-hidden="true">×</span>
							<span class="sr-only">Remove {name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		{#if shownMachines.length === 0}
			<p class="mt-3 text-xs text-steel">No machines match that search.</p>
		{:else}
			<ul class="scroll-modern mt-3 grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
				{#each shownMachines as m (m.name)}
					{@const picked = favoriteMachines.includes(m.name)}
					<li>
						<button
							type="button"
							aria-pressed={picked}
							onclick={() => toggleMachine(m.name)}
							class="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors {picked
								? 'border-signal-ink bg-signal-wash'
								: 'border-hairline hover:border-signal-ink'}"
						>
							<span class="min-w-0">
								<span class="block truncate">{m.name}</span>
								<span class="mt-0.5 block truncate text-xs text-steel">{m.muscles.join(', ')}</span>
							</span>
							<span class="shrink-0 text-xs {picked ? 'text-signal-ink' : 'text-steel'}">
								{picked ? 'Favorited' : 'Add'}
							</span>
						</button>
					</li>
				{/each}
			</ul>
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

		<input
			type="search"
			bind:value={workoutQ}
			enterkeyhint="search"
			aria-label="Search workouts"
			placeholder="Search workouts"
			class="mt-3 w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
		/>

		<div class="scroll-modern mt-3 flex gap-2 overflow-x-auto pb-1">
			{#each FILTERS as g (g.key)}
				<button
					type="button"
					aria-pressed={filter === g.key}
					onclick={() => (filter = g.key)}
					class="shrink-0 rounded-full border px-3 py-1.5 text-xs {filter === g.key
						? 'border-signal-ink bg-signal-wash font-medium text-signal-ink'
						: 'border-hairline text-steel hover:border-steel'}"
				>
					{g.label}
				</button>
			{/each}
		</div>

		{#if favoriteWorkouts.length}
			<ul class="mt-3 flex flex-wrap gap-2">
				{#each favoriteWorkouts as id (id)}
					{@const workout = WORKOUT_LIBRARY.find((w) => w.id === id)}
					{#if workout}
						<li>
							<button
								type="button"
								onclick={() => toggleWorkout(id)}
								class="flex items-center gap-1.5 rounded-full border border-signal-ink bg-signal-wash px-3 py-1.5 text-xs font-medium text-signal-ink"
							>
								{workout.title}
								<span aria-hidden="true">×</span>
								<span class="sr-only">Remove {workout.title}</span>
							</button>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}

		{#if shownWorkouts.length === 0}
			<p class="mt-3 text-xs text-steel">No workouts match that search.</p>
		{:else}
			<ul class="scroll-modern mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
				{#each shownWorkouts as w (w.id)}
					{@const picked = favoriteWorkouts.includes(w.id)}
					<li>
						<button
							type="button"
							aria-pressed={picked}
							onclick={() => toggleWorkout(w.id)}
							class="flex h-full w-full flex-col rounded-xl border p-3 text-left transition-colors {picked
								? 'border-signal-ink bg-signal-wash'
								: 'border-hairline hover:border-signal-ink'}"
						>
							<span class="flex items-baseline justify-between gap-2">
								<span class="font-display font-medium">{w.title}</span>
								<span class="tabular shrink-0 text-xs text-steel">{w.durationMin} min</span>
							</span>
							<span class="mt-1 text-xs leading-relaxed text-steel">{w.summary}</span>
							<span class="mt-2 text-xs {picked ? 'text-signal-ink' : 'text-steel'}">
								{picked ? 'Favorited' : 'Add to favorites'}
							</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

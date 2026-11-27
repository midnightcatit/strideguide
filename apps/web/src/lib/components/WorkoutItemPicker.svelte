<script lang="ts">
	import {
		CUSTOM_WORKOUT_SECTION_LABELS,
		EQUIPMENT_FILTERS,
		catalogForSection,
		defaultItemFor,
		filterCatalog,
		muscleGroupFilters,
		type CatalogOption,
		type CustomWorkoutCategory,
		type CustomWorkoutItem,
		type CustomWorkoutSectionId,
		type EquipmentItem,
	} from '@strideguide/shared';
	import type { MuscleGroup } from '@strideguide/shared/plan';
	import FilterChips from '$lib/components/FilterChips.svelte';

	/**
	 * The item picker: draws on the catalog for the section being edited, with a
	 * search box and, for strength moves, filters by muscle group, equipment and
	 * level. It shows the exercise still when the manifest has one and hands the
	 * chosen item back through onAdd. Rendered inline in the composer, never as a
	 * second sheet, so it does not stack a modal on a modal. Its filter rows use
	 * the same chips as the workout filter control, so the two read the same way.
	 */
	let {
		category,
		section,
		onAdd,
		onClose,
	}: {
		category: CustomWorkoutCategory;
		section: CustomWorkoutSectionId;
		onAdd: (item: CustomWorkoutItem) => void;
		onClose: () => void;
	} = $props();

	type LevelFilter = 'beginner' | 'intermediate' | 'advanced' | 'all';

	let q = $state('');
	let muscleGroup = $state<MuscleGroup | 'all'>('all');
	let equipment = $state<EquipmentItem | 'bodyweight' | 'all'>('all');
	let level = $state<LevelFilter>('all');

	let searchEl: HTMLInputElement | undefined;
	// Move focus into the picker when it opens, so a keyboard user lands on the
	// search box instead of the top of the page.
	$effect(() => {
		searchEl?.focus();
	});

	const sectionLabel = $derived(CUSTOM_WORKOUT_SECTION_LABELS[section]);
	const options = $derived(catalogForSection(category, section));
	const hasStrength = $derived(options.some((o) => o.kind === 'strength'));
	const shown = $derived(
		filterCatalog(options, { query: q, muscleGroup, equipment, level }).slice(0, 60),
	);

	const groupOptions = $derived<{ key: MuscleGroup | 'all'; label: string }[]>([
		{ key: 'all', label: 'All groups' },
		...muscleGroupFilters().map((g) => ({ key: g, label: g })),
	]);
	const equipmentOptions = $derived<{ key: EquipmentItem | 'bodyweight' | 'all'; label: string }[]>([
		{ key: 'all', label: 'Any kit' },
		...EQUIPMENT_FILTERS.map((e) => ({ key: e.value, label: e.label })),
	]);
	const levelOptions: { key: LevelFilter; label: string }[] = [
		{ key: 'all', label: 'Any level' },
		{ key: 'beginner', label: 'Beginner' },
		{ key: 'intermediate', label: 'Intermediate' },
		{ key: 'advanced', label: 'Advanced' },
	];

	/** The line under an option's name: what it works or needs. */
	function subtitle(o: CatalogOption): string {
		if (o.kind === 'strength') {
			const eq = EQUIPMENT_FILTERS.find((e) => e.value === o.equipment)?.label ?? o.equipment;
			return `${o.muscleGroup} · ${eq}`;
		}
		if (o.kind === 'mobility') return o.targets.join(', ');
		return 'Run step';
	}
</script>

<div class="rounded-xl border border-hairline bg-sunken/60 p-3">
	<div class="flex items-center justify-between gap-2">
		<p class="font-display text-sm font-medium">Add to {sectionLabel.toLowerCase()}</p>
		<button
			type="button"
			onclick={onClose}
			aria-label="Close the picker"
			class="tap-target -mr-1 rounded-full text-steel hover:text-ink"
		>
			✕
		</button>
	</div>

	<input
		type="search"
		bind:this={searchEl}
		bind:value={q}
		enterkeyhint="search"
		aria-label="Search the catalog"
		placeholder="Search by name"
		class="mt-2 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
	/>

	{#if hasStrength}
		<div class="mt-2 space-y-1.5">
			<FilterChips options={groupOptions} bind:value={muscleGroup} label="Filter by muscle group" />
			<FilterChips options={equipmentOptions} bind:value={equipment} label="Filter by equipment" />
			<FilterChips options={levelOptions} bind:value={level} label="Filter by level" />
		</div>
	{/if}

	{#if shown.length === 0}
		<p class="mt-3 px-1 py-4 text-center text-sm text-steel">
			Nothing here matches that. Try another word, or clear the filters.
		</p>
	{:else}
		<ul class="scroll-modern mt-3 max-h-72 space-y-1 overflow-y-auto">
			{#each shown as o (o.kind + ':' + o.ref)}
				<li>
					<button
						type="button"
						onclick={() => onAdd(defaultItemFor(o))}
						class="flex min-h-11 w-full items-center gap-3 rounded-lg border border-hairline bg-paper px-3 py-2 text-left hover:border-signal-ink"
					>
						{#if o.kind !== 'run' && o.image}
							<img
								src={o.image}
								alt=""
								loading="lazy"
								decoding="async"
								class="h-11 w-11 shrink-0 rounded-md border border-hairline object-cover"
							/>
						{:else}
							<span
								aria-hidden="true"
								class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-hairline bg-sunken text-xs text-steel"
							>
								{o.kind === 'run' ? '→' : '·'}
							</span>
						{/if}
						<span class="min-w-0 flex-1">
							<span class="block break-words text-sm">{o.label}</span>
							<span class="block break-words text-xs text-steel">{subtitle(o)}</span>
						</span>
						<span class="ml-auto shrink-0 self-start text-xs text-signal-ink">Add</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

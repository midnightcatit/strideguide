<script lang="ts">
	import { untrack } from 'svelte';
	import {
		CUSTOM_WORKOUT_CATEGORIES,
		CUSTOM_WORKOUT_LIMITS,
		CUSTOM_WORKOUT_SECTION_IDS,
		CUSTOM_WORKOUT_SECTION_LABELS,
		RUN_ARCHETYPE_LABELS,
		addItem,
		cleanDraft,
		presetDraft,
		removeItem,
		shiftItem,
		validateCustomWorkout,
		type ComposerContext,
		type CustomWorkout,
		type CustomWorkoutCategory,
		type CustomWorkoutDraft,
		type CustomWorkoutItem,
		type CustomWorkoutSectionId,
	} from '@strideguide/shared';
	import { fmtDistance } from '$lib/prefs.svelte';
	import { api } from '$lib/api';
	import { modal } from '$lib/actions';
	import { sheetOverlay, sheetPanel } from '$lib/motion';
	import WorkoutItemPicker from '$lib/components/WorkoutItemPicker.svelte';

	/**
	 * The workout composer: one way to build a workout anywhere in the app. A
	 * workout has a name, a category and three sections (warm-up, main work,
	 * cool-down); every section can add, remove and reorder items drawn from the
	 * catalog. It opens from a sensible preset for the category, sized to the
	 * runner's context, and saves through the custom workout API so the plan can
	 * run it. It assumes nothing about the screen it is dropped into: pass a
	 * context, get a saved workout back.
	 */
	let {
		open,
		workout = null,
		category = 'strength',
		context = {},
		asPage = false,
		onSaved,
		onClose,
	}: {
		open: boolean;
		/** An existing workout to edit; omit to build a new one from a preset. */
		workout?: CustomWorkout | null;
		/** The category a new workout starts in. Ignored when editing. */
		category?: CustomWorkoutCategory;
		/** The runner's context, so the starting preset fits their session and kit. */
		context?: ComposerContext;
		/** True when this is a route, so it renders in flow instead of as a sheet. */
		asPage?: boolean;
		onSaved: (workout: CustomWorkout) => void;
		onClose: () => void;
	} = $props();

	const CATEGORY_LABELS: Record<CustomWorkoutCategory, string> = {
		running: 'Run',
		strength: 'Strength',
		mobility: 'Mobility',
		recovery: 'Recovery',
	};

	let draft = $state<CustomWorkoutDraft>(presetDraft('strength'));
	let pickerSection = $state<CustomWorkoutSectionId | null>(null);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let wasOpen = false;

	// The draft seeds when the sheet opens, so opening it again for another
	// workout does not keep the last one's edits.
	$effect(() => {
		if (open && !wasOpen) {
			draft = workout
				? structuredClone({
						name: workout.name,
						category: workout.category,
						sections: workout.sections,
					})
				: presetDraft(category, untrack(() => context));
			pickerSection = null;
			error = null;
			saving = false;
		}
		wasOpen = open;
	});

	const problems = $derived(validateCustomWorkout(draft));
	const canSave = $derived(problems.length === 0 && !saving);
	const titleId = `composer-title-${crypto.randomUUID()}`;

	/** The two lines a saved item shows: its name and its dose. */
	function summary(item: CustomWorkoutItem): { label: string; detail: string } {
		if (item.kind === 'strength') {
			const parts = [`${item.sets ?? 1} ${item.sets === 1 ? 'set' : 'sets'}`];
			if (item.reps) parts.push(`${item.reps} reps`);
			if (item.durationSec) parts.push(`${item.durationSec}s`);
			return { label: item.ref, detail: parts.join(' · ') };
		}
		if (item.kind === 'mobility') {
			const parts: string[] = [];
			if (item.sets && item.sets > 1) parts.push(`${item.sets} rounds`);
			if (item.durationSec) parts.push(`${item.durationSec}s`);
			return { label: item.ref, detail: parts.join(' · ') || 'Hold' };
		}
		const parts: string[] = [];
		if (item.distanceKm) parts.push(fmtDistance(item.distanceKm));
		if (item.durationSec) parts.push(`${Math.round(item.durationSec / 60)} min`);
		return { label: RUN_ARCHETYPE_LABELS[item.ref as keyof typeof RUN_ARCHETYPE_LABELS] ?? item.ref, detail: parts.join(' · ') || 'Run step' };
	}

	function changeCategory(next: CustomWorkoutCategory) {
		if (next === draft.category) return;
		const preset = presetDraft(next, context);
		draft = { ...preset, name: draft.name.trim() ? draft.name : preset.name };
		pickerSection = null;
	}

	function setItem(section: CustomWorkoutSectionId, index: number, delta: number) {
		draft = shiftItem(draft, section, index, delta);
	}

	async function save() {
		if (saving) return;
		const cleaned = cleanDraft(draft);
		const found = validateCustomWorkout(cleaned);
		if (found.length) {
			error = found[0]!;
			return;
		}
		saving = true;
		error = null;
		try {
			const res = workout?.id
				? await api.updateCustomWorkout(workout.id, cleaned)
				: await api.createCustomWorkout(cleaned);
			onSaved(res.workout);
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save the workout. Try again.';
		} finally {
			saving = false;
		}
	}
</script>

{#if open}
	<div
		class={asPage ? 'w-full' : 'sg-sheet fixed inset-0 flex items-end justify-center'}
		role={asPage ? undefined : 'dialog'}
		aria-modal={asPage ? undefined : 'true'}
		aria-labelledby={asPage ? undefined : titleId}
		use:modal={{ onClose, enabled: !asPage }}
	>
		{#if !asPage}
			<button
				type="button"
				aria-label="Close"
				data-modal-backdrop
				onclick={onClose}
				class="absolute inset-0 bg-ink/40"
				transition:sheetOverlay
			></button>
		{/if}
		<div
			data-modal-panel
			tabindex="-1"
			class={asPage
				? 'relative mx-auto flex w-full max-w-2xl flex-col rounded-2xl border border-hairline bg-paper'
				: 'relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border-t border-hairline bg-paper outline-none'}
			transition:sheetPanel
		>
			<div class="shrink-0 border-b border-hairline px-4 pb-3 pt-3">
				<div class="mx-auto mb-2 h-1 w-10 rounded-full bg-hairline" aria-hidden="true"></div>
				<div class="flex items-start justify-between gap-3">
					<h2 id={titleId} class="font-display text-lg font-medium">
						{workout ? 'Edit workout' : 'Build a workout'}
					</h2>
					<button
						type="button"
						onclick={onClose}
						aria-label="Close"
						class="tap-target -mr-1 rounded-full text-steel hover:text-ink"
					>
						✕
					</button>
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
				<label class="block text-xs text-steel">
					Name
					<input
						bind:value={draft.name}
						maxlength={CUSTOM_WORKOUT_LIMITS.maxNameLen}
						placeholder="Machine circuit"
						class="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
					/>
				</label>

				<p class="mt-4 text-xs text-steel">Category</p>
				<div class="mt-1 inline-flex rounded-lg border border-hairline p-0.5" role="group" aria-label="Workout category">
					{#each CUSTOM_WORKOUT_CATEGORIES as c (c)}
						<button
							type="button"
							aria-pressed={draft.category === c}
							onclick={() => changeCategory(c)}
							class="min-h-11 rounded-md px-3 text-sm {draft.category === c
								? 'bg-ink font-medium text-paper'
								: 'text-steel hover:text-ink'}"
						>
							{CATEGORY_LABELS[c]}
						</button>
					{/each}
				</div>
				<p class="mt-1 text-xs text-steel">Switching category starts that category's preset; you can change anything after.</p>

				{#each CUSTOM_WORKOUT_SECTION_IDS as section (section)}
					<section class="mt-5">
						<h3 class="font-display text-sm font-medium">{CUSTOM_WORKOUT_SECTION_LABELS[section]}</h3>

						{#if pickerSection === section}
							<div class="mt-2">
								<WorkoutItemPicker
									category={draft.category}
									{section}
									onAdd={(item) => {
										draft = addItem(draft, section, item);
										pickerSection = null;
									}}
									onClose={() => (pickerSection = null)}
								/>
							</div>
						{:else}
							{#if draft.sections[section].items.length === 0}
								<p class="mt-2 rounded-lg bg-sunken p-3 text-sm text-steel">
									No items yet. Add at least one.
								</p>
							{:else}
								<ul class="mt-2 space-y-1.5">
									{#each draft.sections[section].items as item, i (i)}
										{@const s = summary(item)}
										<li class="flex items-center gap-2 rounded-lg border border-hairline bg-paper px-3 py-2">
											<span class="min-w-0 flex-1">
												<span class="block truncate text-sm">{s.label}</span>
												<span class="tabular block truncate text-xs text-steel">{s.detail}</span>
											</span>
											<button
												type="button"
												onclick={() => setItem(section, i, -1)}
												disabled={i === 0}
												aria-label="Move {s.label} up"
												class="tap-target shrink-0 rounded-md text-steel hover:text-ink disabled:opacity-30"
											>
												↑
											</button>
											<button
												type="button"
												onclick={() => setItem(section, i, 1)}
												disabled={i === draft.sections[section].items.length - 1}
												aria-label="Move {s.label} down"
												class="tap-target shrink-0 rounded-md text-steel hover:text-ink disabled:opacity-30"
											>
												↓
											</button>
											<button
												type="button"
												onclick={() => (draft = removeItem(draft, section, i))}
												aria-label="Remove {s.label}"
												class="tap-target shrink-0 rounded-md text-steel hover:text-danger"
											>
												✕
											</button>
										</li>
									{/each}
								</ul>
							{/if}

							<button
								type="button"
								onclick={() => (pickerSection = section)}
								class="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-hairline-strong py-2 text-sm text-signal-ink hover:border-signal"
							>
								＋ Add an item
							</button>

							<label class="mt-2 block text-xs text-steel">
								Note (optional)
								<textarea
									bind:value={draft.sections[section].note}
									rows="2"
									maxlength={CUSTOM_WORKOUT_LIMITS.maxNoteLen}
									placeholder="Anything to remember for this part."
									class="mt-1 w-full resize-none rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none"
								></textarea>
							</label>
						{/if}
					</section>
				{/each}

				{#if problems.length}
					<ul role="alert" class="mt-4 space-y-1 rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
						{#each problems as p (p)}<li>{p}</li>{/each}
					</ul>
				{/if}
			</div>

			<div
				class="sg-overlay-pad sticky bottom-0 flex gap-2 border-t border-hairline bg-paper px-4 py-3"
				style="--overlay-pad: 0.75rem"
			>
				<button
					type="button"
					onclick={onClose}
					class="flex-1 rounded-md border border-hairline px-4 py-3 text-sm hover:border-signal hover:text-signal-ink"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={save}
					disabled={!canSave}
					aria-busy={saving}
					class="flex-1 rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
				>
					{saving ? 'Saving…' : 'Save workout'}
				</button>
			</div>
		</div>
	</div>
{/if}

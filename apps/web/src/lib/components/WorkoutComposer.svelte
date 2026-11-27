<script lang="ts">
	import { tick, untrack } from 'svelte';
	import {
		CUSTOM_WORKOUT_CATEGORIES,
		CUSTOM_WORKOUT_LIMITS,
		CUSTOM_WORKOUT_SECTION_IDS,
		CUSTOM_WORKOUT_SECTION_LABELS,
		RUN_ARCHETYPE_LABELS,
		addItem,
		cleanDraft,
		imageForName,
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
	/** True once the runner has changed the name themselves. */
	let nameEdited = $state(false);
	/** The id the current draft saves to; null until a new workout is created. */
	let editingId = $state<string | null>(null);
	/** The workout id the current draft was seeded from, so a prop change reseeds. */
	let seededFrom: string | null = null;
	/** Bumped on every seed, so a save that lands after a newer edit is ignored. */
	let session = 0;
	let wasOpen = false;
	const addRefs: Record<string, HTMLButtonElement | undefined> = {};

	/**
	 * Load a draft: an existing workout's contents (snapshotted so a reactive prop
	 * cannot be mutated through the draft), or the category's preset. Ties the
	 * update id to the draft, so a save can never land on a different workout.
	 */
	function seed(next: CustomWorkout | null) {
		const source = next ? $state.snapshot(next) : null;
		draft = source
			? { name: source.name, category: source.category, sections: source.sections }
			: presetDraft(category, untrack(() => context));
		editingId = source?.id ?? null;
		seededFrom = source?.id ?? null;
		nameEdited = source !== null;
		pickerSection = null;
		error = null;
		saving = false;
		session += 1;
	}

	// Seed when the sheet opens, and reseed if the parent swaps to another
	// workout while it stays open, so Save always writes the workout on screen.
	$effect(() => {
		const incoming = workout?.id ?? null;
		if (open && (!wasOpen || incoming !== seededFrom)) {
			seed(workout);
		}
		wasOpen = open;
	});

	const problems = $derived(validateCustomWorkout(draft));
	const canSave = $derived(problems.length === 0 && !saving);
	const titleId = `composer-title-${crypto.randomUUID()}`;

	/** Seconds as a short length: 20s, 12 min, or 12 min 30s. */
	function fmtDuration(sec: number): string {
		if (sec < 60) return `${sec}s`;
		const min = Math.floor(sec / 60);
		const rest = sec % 60;
		return rest ? `${min} min ${rest}s` : `${min} min`;
	}

	/** The two lines a saved item shows: its name and its dose. */
	function summary(item: CustomWorkoutItem): { label: string; detail: string } {
		if (item.kind === 'strength') {
			const parts = [`${item.sets ?? 1} ${item.sets === 1 ? 'set' : 'sets'}`];
			if (item.reps) parts.push(`${item.reps} reps`);
			if (item.durationSec) parts.push(fmtDuration(item.durationSec));
			return { label: item.ref, detail: parts.join(' · ') };
		}
		if (item.kind === 'mobility') {
			const parts: string[] = [];
			if (item.sets && item.sets > 1) parts.push(`${item.sets} rounds`);
			if (item.durationSec) parts.push(fmtDuration(item.durationSec));
			return { label: item.ref, detail: parts.join(' · ') || 'Hold' };
		}
		const parts: string[] = [];
		if (item.distanceKm) parts.push(fmtDistance(item.distanceKm));
		if (item.durationSec) parts.push(fmtDuration(item.durationSec));
		const label = RUN_ARCHETYPE_LABELS[item.ref as keyof typeof RUN_ARCHETYPE_LABELS] ?? item.ref;
		return { label, detail: parts.join(' · ') || 'Run step' };
	}

	function changeCategory(next: CustomWorkoutCategory) {
		if (next === draft.category) return;
		const preset = presetDraft(next, context);
		draft = { ...preset, name: nameEdited ? draft.name : preset.name };
		pickerSection = null;
	}

	function setItem(section: CustomWorkoutSectionId, index: number, delta: number) {
		draft = shiftItem(draft, section, index, delta);
	}

	/** Close the picker and put focus back on the section's add control. */
	function closePicker() {
		const prev = pickerSection;
		pickerSection = null;
		if (prev) tick().then(() => addRefs[prev]?.focus());
	}

	async function save() {
		if (saving) return;
		const cleaned = cleanDraft(draft);
		const found = validateCustomWorkout(cleaned);
		if (found.length) {
			error = found[0]!;
			return;
		}
		// Capture the session and id, so a request that lands after the sheet
		// reopened (or after another save started) cannot touch the newer draft.
		const mySession = session;
		const id = editingId;
		saving = true;
		error = null;
		try {
			const res = id
				? await api.updateCustomWorkout(id, cleaned)
				: await api.createCustomWorkout(cleaned);
			if (mySession !== session) return;
			editingId = res.workout.id;
			onSaved(res.workout);
			onClose();
		} catch (e) {
			if (mySession !== session) return;
			error = e instanceof Error ? e.message : 'Could not save the workout. Try again.';
		} finally {
			if (mySession === session) saving = false;
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
				<!-- Every draft control sits in one fieldset, so a save in flight
				     locks the draft instead of letting an edit be overwritten. -->
				<fieldset disabled={saving} class="contents">
					<label class="block text-xs text-steel">
						Name
						<input
							bind:value={draft.name}
							oninput={() => (nameEdited = true)}
							maxlength={CUSTOM_WORKOUT_LIMITS.maxNameLen}
							placeholder="Machine circuit"
							class="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
						/>
					</label>

					<p class="mt-4 text-xs text-steel">Category</p>
					<div
						class="mt-1 inline-flex rounded-lg border border-hairline p-0.5"
						role="group"
						aria-label="Workout category"
					>
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
					<p class="mt-1 text-xs text-steel">
						Switching category starts that category's preset; you can change anything after.
					</p>

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
											closePicker();
										}}
										onClose={closePicker}
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
											{@const img = item.kind === 'run' ? undefined : imageForName(item.ref)}
											<li class="flex items-center gap-2 rounded-lg border border-hairline bg-paper px-3 py-2">
												{#if img}
													<img
														src={img}
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
														{item.kind === 'run' ? '→' : '·'}
													</span>
												{/if}
												<span class="min-w-0 flex-1">
													<span class="block break-words text-sm">{s.label}</span>
													<span class="tabular block break-words text-xs text-steel">{s.detail}</span>
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
									bind:this={addRefs[section]}
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
						<ul
							role="alert"
							class="mt-4 space-y-1 rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
						>
							{#each problems as p (p)}<li>{p}</li>{/each}
						</ul>
					{/if}
				</fieldset>
			</div>

			<div
				class="sg-overlay-pad sticky bottom-0 border-t border-hairline bg-paper px-4 py-3"
				style="--overlay-pad: 0.75rem"
			>
				{#if error}
					<p role="alert" class="mb-2 text-sm text-danger">{error}</p>
				{/if}
				<div class="flex gap-2">
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
	</div>
{/if}

<script lang="ts">
	import {
		ALL_MOVES,
		WORKOUT_LIBRARY,
		findMove,
		moveCategory,
		type LibraryWorkout,
	} from '@strideguide/shared/plan';
	import { milesToKm } from '@strideguide/shared/units';
	import { prefs } from '$lib/prefs.svelte';
	import { modal } from '$lib/actions';
	import type { CustomWorkoutInput } from '$lib/api';

	let {
		date,
		asPage = false,
		onPick,
		onCustom,
		onClose,
	}: {
		date: string;
		/** True when this is a route, so it renders in flow instead of as a sheet. */
		asPage?: boolean;
		onPick: (w: LibraryWorkout) => void;
		onCustom?: (c: CustomWorkoutInput) => void;
		onClose: () => void;
	} = $props();

	const FILTERS: { key: string; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'running', label: 'Run' },
		{ key: 'walking', label: 'Walk' },
		{ key: 'strength', label: 'Strength' },
		{ key: 'mobility', label: 'Mobility' },
		{ key: 'recovery', label: 'Recovery' },
		{ key: 'cross-train', label: 'Cross' },
	];
	let mode = $state<'list' | 'custom'>('list');
	let filter = $state('all');
	let q = $state('');
	let myKit = $state(false);

	// --- custom workout state ---
	let customType = $state<'strength' | 'run' | 'other'>('strength');
	let title = $state('');
	let moveQ = $state('');
	let pickedMoves = $state<{ machine: string; sets: { reps: number; weight: number }[] }[]>([]);
	let durationText = $state('30');
	let distanceText = $state('');
	let notes = $state('');
	let customError = $state<string | null>(null);

	const weightUnit = $derived(prefs.units === 'imperial' ? 'lb' : 'kg');
	const distUnit = $derived(prefs.units === 'imperial' ? 'mi' : 'km');

	const tokens = $derived(
		q
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 0),
	);

	/** True when a strength workout's moves all fit the runner's equipment. */
	function fitsKit(w: LibraryWorkout): boolean {
		const items = prefs.equipmentItems;
		if (!items?.length || w.modality !== 'strength') return true;
		for (const block of w.workout.blocks) {
			for (const step of block.steps ?? []) {
				if (step.kind !== 'work') continue;
				const move = findMove(step.label);
				if (!move) continue;
				const cat = moveCategory(move);
				if (cat !== 'bodyweight' && !items.includes(cat)) return false;
			}
		}
		return true;
	}

	/** Every search token must appear somewhere in the workout's text. */
	function matches(w: LibraryWorkout): boolean {
		if (tokens.length === 0) return true;
		const hay = [w.title, w.summary, w.purpose, w.type, w.modality, ...w.tags]
			.join(' ')
			.toLowerCase();
		return tokens.every((t) => hay.includes(t));
	}

	const byFilter = $derived(
		filter === 'all'
			? WORKOUT_LIBRARY
			: filter === 'cross-train'
				? WORKOUT_LIBRARY.filter((w) => w.type === 'cross-train')
				: WORKOUT_LIBRARY.filter((w) => w.modality === filter),
	);
	const shown = $derived(byFilter.filter((w) => matches(w) && (!myKit || fitsKit(w))));

	/** Every catalog move once, narrowed to the runner's kit when they have one. */
	const kitMoves = $derived.by(() => {
		const items = prefs.equipmentItems;
		const seen = new Set<string>();
		const out: typeof ALL_MOVES = [];
		for (const m of ALL_MOVES) {
			if (seen.has(m.name)) continue;
			seen.add(m.name);
			if (items?.length) {
				const cat = moveCategory(m);
				if (cat !== 'bodyweight' && !items.includes(cat)) continue;
			}
			out.push(m);
		}
		return out;
	});
	const moveTokens = $derived(
		moveQ
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 0),
	);
	const moveMatches = $derived(
		kitMoves
			.filter((m) => moveTokens.every((t) => m.name.toLowerCase().includes(t)))
			.filter((m) => !pickedMoves.some((p) => p.machine === m.name))
			.slice(0, 40),
	);

	const dateLabel = $derived(
		new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: 'UTC',
		}),
	);
	const heading = $derived(mode === 'custom' ? 'Custom workout' : 'Pick a workout');

	/** mm:ss (or a bare minute count) to whole seconds. Null when unusable. */
	function parseClock(text: string): number | null {
		const raw = text.trim();
		if (!raw) return null;
		if (!raw.includes(':')) {
			const mins = Number(raw);
			return Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : null;
		}
		const parts = raw.split(':').map(Number);
		if (parts.some((n) => Number.isNaN(n))) return null;
		let secs = 0;
		for (const p of parts) secs = secs * 60 + p;
		return secs > 0 ? secs : null;
	}

	function defaultTitle(type: typeof customType): string {
		return type === 'strength' ? 'Custom circuit' : type === 'run' ? 'Custom run' : 'Custom session';
	}

	function setType(type: typeof customType) {
		customType = type;
		title = defaultTitle(type);
		durationText = type === 'strength' ? '30' : type === 'run' ? '30:00' : '20';
		customError = null;
	}

	function addMove(name: string) {
		pickedMoves = [
			...pickedMoves,
			{ machine: name, sets: Array.from({ length: 3 }, () => ({ reps: 10, weight: 0 })) },
		];
		moveQ = '';
	}

	function removeMove(name: string) {
		pickedMoves = pickedMoves.filter((m) => m.machine !== name);
	}

	function addSet(move: (typeof pickedMoves)[number]) {
		const last = move.sets[move.sets.length - 1] ?? { reps: 10, weight: 0 };
		move.sets = [...move.sets, { ...last }];
	}

	function removeSet(move: (typeof pickedMoves)[number], index: number) {
		if (move.sets.length <= 1) return;
		move.sets = move.sets.filter((_, i) => i !== index);
	}

	function buildSummary(): string {
		if (customType === 'strength') {
			return `${pickedMoves.length} moves, the sets and weights you picked.`;
		}
		if (customType === 'run') {
			const km = prefs.units === 'imperial' ? milesToKm(Number(distanceText) || 0) : Number(distanceText) || 0;
			return `A ${Math.round(km * 10) / 10} km run you set up yourself.`;
		}
		return notes.trim() ? notes.trim().slice(0, 300) : 'A one-off session you set up yourself.';
	}

	function submitCustom() {
		customError = null;
		if (!onCustom) return;
		const name = title.trim() || defaultTitle(customType);
		const emit = onCustom;

		if (customType === 'strength') {
			if (!pickedMoves.length) {
				customError = 'Add at least one move.';
				return;
			}
			const mins = Number(durationText);
			if (!Number.isFinite(mins) || mins < 1) {
				customError = 'How many minutes is it?';
				return;
			}
			emit({
				modality: 'strength',
				type: 'machine-circuit',
				title: name,
				durationMin: Math.round(mins),
				summary: buildSummary(),
				blocks: pickedMoves.map((m) => ({
					machine: m.machine,
					sets: m.sets.map((s) => ({
						reps: Math.max(1, Math.round(Number(s.reps) || 1)),
						weightKg:
							prefs.units === 'imperial'
								? Math.round((Number(s.weight || 0) / 2.20462) * 10) / 10
								: Number(s.weight || 0),
					})),
				})),
			});
			return;
		}

		if (customType === 'run') {
			const dist = Number(distanceText);
			const secs = parseClock(durationText);
			if (!Number.isFinite(dist) || dist <= 0) {
				customError = `How far did you go, in ${distUnit}?`;
				return;
			}
			if (!secs) {
				customError = 'How long did it take? (mm:ss)';
				return;
			}
			const km = prefs.units === 'imperial' ? milesToKm(dist) : dist;
			emit({
				modality: 'running',
				type: 'easy',
				title: name,
				durationMin: Math.max(1, Math.round(secs / 60)),
				summary: buildSummary(),
				distanceKm: Math.round(km * 100) / 100,
			});
			return;
		}

		const secs = parseClock(durationText);
		if (!secs) {
			customError = 'How long was it, in minutes?';
			return;
		}
		emit({
			modality: 'recovery',
			type: 'cross-train',
			title: name,
			durationMin: Math.max(1, Math.round(secs / 60)),
			summary: buildSummary(),
			...(notes.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
		});
	}

	function startCustom() {
		mode = 'custom';
		customError = null;
		if (!title) title = defaultTitle(customType);
		if (!durationText) durationText = customType === 'run' ? '30:00' : '30';
	}
</script>

<div
	class={asPage
		? 'w-full'
		: 'fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4'}
	role={asPage ? undefined : 'dialog'}
	aria-modal={asPage ? undefined : 'true'}
	aria-label={asPage ? undefined : 'Add a workout'}
	use:modal={{ onClose, enabled: !asPage }}
>
	{#if !asPage}
		<button type="button" aria-label="Close" onclick={onClose} class="overlay-fade absolute inset-0 bg-ink/30"></button>
	{/if}
	<div
		class={asPage
			? 'relative mx-auto flex w-full max-w-2xl flex-col rounded-2xl border border-hairline bg-paper'
			: 'overlay-sheet relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-hairline bg-paper sm:rounded-2xl'}
		style="padding-bottom: env(safe-area-inset-bottom)"
	>
		<div class="flex items-center justify-between gap-3 border-b border-hairline p-4">
			<div class="min-w-0">
				<p class="tabular text-xs uppercase tracking-widest text-steel">Add to {dateLabel}</p>
				<h2 class="font-display text-lg font-bold">{heading}</h2>
			</div>
			{#if mode === 'custom'}
				<button
					type="button"
					onclick={() => (mode = 'list')}
					class="shrink-0 rounded-md border border-hairline px-3 py-2 text-xs text-signal-ink hover:border-signal"
				>
					‹ Back
				</button>
			{/if}
			<button type="button" onclick={onClose} aria-label="Close" class="flex h-11 w-11 shrink-0 items-center justify-center text-steel hover:text-ink">✕</button>
		</div>

		{#if mode === 'list'}
			<div class="shrink-0 border-b border-hairline px-4 py-3">
				<input
					type="search"
					bind:value={q}
					enterkeyhint="search"
					aria-label="Search workouts"
					placeholder="Search workouts"
					class="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
				/>
			</div>

			<div class="scroll-modern flex shrink-0 gap-2 overflow-x-auto border-b border-hairline px-4 py-2">
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
				{#if prefs.equipmentItems?.length}
					<button
						type="button"
						aria-pressed={myKit}
						onclick={() => (myKit = !myKit)}
						class="ml-auto shrink-0 rounded-full border px-3 py-1.5 text-xs {myKit
							? 'border-signal-ink bg-signal-wash font-medium text-signal-ink'
							: 'border-hairline text-steel hover:border-steel'}"
					>
						My kit
					</button>
				{/if}
			</div>

			<div class="scroll-modern min-h-0 flex-1 overflow-y-auto p-4">
				{#if onCustom}
					<button
						type="button"
						onclick={startCustom}
						class="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong py-3 text-sm text-signal-ink hover:border-signal"
					>
						＋ Custom workout
					</button>
				{/if}
				{#if shown.length === 0}
					<p class="px-1 py-8 text-center text-sm text-steel">
						No workouts match "{q.trim()}". Try another word, clear the search, or write your own.
					</p>
				{:else}
				<ul class="grid gap-2 sm:grid-cols-2">
					{#each shown as w (w.id)}
						<li>
							<button
								type="button"
								onclick={() => onPick(w)}
								class="flex h-full w-full flex-col rounded-xl border border-hairline p-3 text-left transition-colors hover:border-signal-ink"
							>
								<span class="flex items-baseline justify-between gap-2">
									<span class="font-display font-medium">{w.title}</span>
									<span class="tabular shrink-0 text-xs text-steel">{w.durationMin} min</span>
								</span>
								<span class="mt-1 text-xs leading-relaxed text-steel">{w.summary}</span>
							</button>
						</li>
					{/each}
				</ul>
				{/if}
			</div>
		{:else}
			<div class="scroll-modern min-h-0 flex-1 overflow-y-auto p-4">
				<div class="inline-flex rounded-lg border border-hairline p-0.5" role="group" aria-label="Workout type">
					{#each [{ key: 'strength', label: 'Strength' }, { key: 'run', label: 'Run' }, { key: 'other', label: 'Other' }] as t (t.key)}
						<button
							type="button"
							aria-pressed={customType === t.key}
							onclick={() => setType(t.key as typeof customType)}
							class="min-h-9 rounded-md px-3 py-1.5 text-xs {customType === t.key
								? 'bg-ink font-medium text-paper'
								: 'text-steel hover:text-ink'}"
						>
							{t.label}
						</button>
					{/each}
				</div>

				<label class="mt-4 block text-xs text-steel">
					Name
					<input
						bind:value={title}
						maxlength="120"
						placeholder={defaultTitle(customType)}
						class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none"
					/>
				</label>

				{#if customType === 'strength'}
					<label class="mt-4 block text-xs text-steel">
						How long? (minutes)
						<input
							bind:value={durationText}
							inputmode="numeric"
							class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
						/>
					</label>

					<label class="mt-4 block text-xs text-steel">
						Add a move
						<input
							type="search"
							bind:value={moveQ}
							enterkeyhint="search"
							placeholder="Search moves"
							class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm placeholder:text-steel focus:border-signal-ink focus:outline-none"
						/>
					</label>
					{#if moveQ.trim() && moveMatches.length}
						<ul class="mt-2 max-h-40 overflow-y-auto rounded-lg border border-hairline">
							{#each moveMatches as m (m.name)}
								<li>
									<button
										type="button"
										onclick={() => addMove(m.name)}
										class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-sunken"
									>
										<span>{m.name}</span>
										<span class="shrink-0 text-xs text-signal-ink">Add</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else if moveQ.trim()}
						<p class="mt-2 text-xs text-steel">No moves match that search.</p>
					{/if}

					{#if pickedMoves.length === 0}
						<p class="mt-4 rounded-lg bg-sunken p-3 text-sm text-steel">
							No moves yet. Search above and add the machines you want, like lat pulldown or chest
							press.
						</p>
					{:else}
						<div class="mt-4 space-y-3">
							{#each pickedMoves as move (move.machine)}
								<div class="rounded-lg border border-hairline p-3">
									<div class="flex items-center justify-between gap-2">
										<p class="text-sm font-medium">{move.machine}</p>
										<button
											type="button"
											onclick={() => removeMove(move.machine)}
											aria-label="Remove {move.machine}"
											class="flex h-8 w-8 items-center justify-center text-steel hover:text-danger"
										>
											✕
										</button>
									</div>
									<div class="mt-2 space-y-1">
										{#each move.sets as set, i (i)}
											<div class="flex min-w-0 items-center gap-2">
												<span class="tabular w-5 shrink-0 text-xs text-steel">{i + 1}</span>
												<input
													bind:value={set.reps}
													type="number"
													inputmode="numeric"
													aria-label="{move.machine} set {i + 1} reps"
													class="tabular w-14 min-w-0 rounded-md border border-hairline-strong bg-paper px-2 py-1.5 text-sm"
												/>
												<span class="shrink-0 text-xs text-steel">×</span>
												<input
													bind:value={set.weight}
													type="number"
													inputmode="decimal"
													aria-label="{move.machine} set {i + 1} weight"
													class="tabular w-16 min-w-0 rounded-md border border-hairline-strong bg-paper px-2 py-1.5 text-sm"
												/>
												<span class="shrink-0 text-xs text-steel">{weightUnit}</span>
												<button
													type="button"
													onclick={() => removeSet(move, i)}
													aria-label="Remove set {i + 1}"
													class="ml-auto flex h-8 w-8 shrink-0 items-center justify-center text-steel hover:text-danger"
												>
													✕
												</button>
											</div>
										{/each}
									</div>
									<button
										type="button"
										onclick={() => addSet(move)}
										class="mt-1 flex h-9 items-center px-1 text-xs text-signal-ink hover:underline"
									>
										+ set
									</button>
								</div>
							{/each}
						</div>
					{/if}
				{:else if customType === 'run'}
					<div class="mt-4 grid grid-cols-2 gap-3">
						<label class="text-xs text-steel">
							Distance ({distUnit})
							<input
								bind:value={distanceText}
								inputmode="decimal"
								placeholder={distUnit === 'mi' ? '3.1' : '5'}
								class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
							/>
						</label>
						<label class="text-xs text-steel">
							Duration (mm:ss)
							<input
								bind:value={durationText}
								inputmode="numeric"
								placeholder="30:00"
								class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
							/>
						</label>
					</div>
				{:else}
					<label class="mt-4 block text-xs text-steel">
						How long? (minutes)
						<input
							bind:value={durationText}
							inputmode="numeric"
							class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
						/>
					</label>
					<label class="mt-4 block text-xs text-steel">
						Notes (optional)
						<textarea
							bind:value={notes}
							rows="3"
							placeholder="What did you do?"
							class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm placeholder:text-steel"
						></textarea>
					</label>
				{/if}

				{#if customError}
					<p class="mt-3 text-sm text-signal-ink">{customError}</p>
				{/if}

				<button
					type="button"
					onclick={submitCustom}
					class="mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
				>
					Add to {dateLabel}
				</button>
			</div>
		{/if}
	</div>
</div>
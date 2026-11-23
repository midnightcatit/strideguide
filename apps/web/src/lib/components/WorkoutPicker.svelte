<script lang="ts">
	import { WORKOUT_LIBRARY, type LibraryWorkout } from '@strideguide/shared/plan';
	import { modal } from '$lib/actions';

	let {
		date,
		onPick,
		onClose,
	}: {
		date: string;
		onPick: (w: LibraryWorkout) => void;
		onClose: () => void;
	} = $props();

	const FILTERS: { key: string; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'running', label: 'Run' },
		{ key: 'walking', label: 'Walk' },
		{ key: 'strength', label: 'Strength' },
		{ key: 'mobility', label: 'Mobility' },
		{ key: 'recovery', label: 'Recovery' },
	];
	let filter = $state('all');
	const shown = $derived(
		filter === 'all' ? WORKOUT_LIBRARY : WORKOUT_LIBRARY.filter((w) => w.modality === filter),
	);

	const dateLabel = $derived(
		new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: 'UTC',
		}),
	);
</script>

<div
	class="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Add a workout"
	use:modal={onClose}
>
	<button type="button" aria-label="Close" onclick={onClose} class="overlay-fade absolute inset-0 bg-ink/30"></button>
	<div
		class="overlay-sheet relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-hairline bg-paper sm:rounded-2xl"
		style="padding-bottom: env(safe-area-inset-bottom)"
	>
		<div class="flex items-center justify-between gap-3 border-b border-hairline p-4">
			<div class="min-w-0">
				<p class="tabular text-xs uppercase tracking-widest text-steel">Add to {dateLabel}</p>
				<h2 class="font-display text-lg font-bold">Pick a workout</h2>
			</div>
			<button type="button" onclick={onClose} aria-label="Close" class="flex h-11 w-11 shrink-0 items-center justify-center text-steel hover:text-ink">✕</button>
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
		</div>

		<div class="scroll-modern min-h-0 flex-1 overflow-y-auto p-4">
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
		</div>
	</div>
</div>

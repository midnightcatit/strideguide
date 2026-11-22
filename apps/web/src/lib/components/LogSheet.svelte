<script lang="ts">
	import type { ClientLog, ClientSession } from '$lib/plan';
	import { api } from '$lib/api';
	import { fmtPace, prefs } from '$lib/prefs.svelte';
	import { milesToKm } from '@strideguide/shared/units';

	let {
		session,
		eyebrow,
		onClose,
		onSaved,
	}: {
		session: ClientSession;
		eyebrow: string;
		onClose: () => void;
		onSaved: (log: ClientLog) => void;
	} = $props();

	const isStrength = $derived(session.modality === 'strength');
	const machines = $derived(session.prescription?.blocks ?? []);

	// --- run state ---
	const unit = $derived(prefs.units === 'imperial' ? 'mi' : 'km');
	let runDistance = $state('');
	let runDuration = $state('');
	let runHr = $state('');
	let rpe = $state<number | null>(null);
	let notes = $state('');

	// --- strength state ---
	function initialRows() {
		return (session.prescription?.blocks ?? []).map((m) => ({
			machine: m.machine,
			sets: (m.sets?.length ? m.sets : [{ reps: 10, weightKg: 0 }]).map((s) => ({
				reps: s.reps,
				weightKg: s.weightKg,
			})),
		}));
	}
	let rows = $state(initialRows());

	let saving = $state(false);
	let error = $state<string | null>(null);

	// Prefill from the prescription.
	$effect(() => {
		if (isStrength) return;
		const km = session.prescription?.targetDistanceKm;
		if (km != null && !runDistance) {
			const v = prefs.units === 'imperial' ? km / 1.609344 : km;
			runDistance = String(Math.round(v * 100) / 100);
		}
		if (session.durationMin && !runDuration) {
			const m = Math.floor(session.durationMin);
			const s = Math.round((session.durationMin - m) * 60);
			runDuration = `${m}:${String(s).padStart(2, '0')}`;
		}
	});

	function parseClock(text: string): number | null {
		const parts = text.trim().split(':').map(Number);
		if (!parts.length || parts.some((n) => Number.isNaN(n))) return null;
		let secs = 0;
		for (const p of parts) secs = secs * 60 + p;
		return secs > 0 ? secs : null;
	}

	const distanceKm = $derived.by(() => {
		const v = Number(runDistance);
		if (!v) return null;
		return prefs.units === 'imperial' ? milesToKm(v) : v;
	});
	const durationSec = $derived(parseClock(runDuration));
	const paceSecPerKm = $derived.by(() => {
		if (!distanceKm || !durationSec) return null;
		return durationSec / distanceKm;
	});

	function repeatLast(row: (typeof rows)[number]) {
		const last = row.sets[row.sets.length - 1];
		if (last) row.sets.push({ ...last });
	}
	function addSet(row: (typeof rows)[number]) {
		const last = row.sets[row.sets.length - 1] ?? { reps: 10, weightKg: 0 };
		row.sets.push({ ...last });
	}
	function removeSet(row: (typeof rows)[number]) {
		if (row.sets.length > 1) row.sets.pop();
	}

	async function save() {
		saving = true;
		error = null;
		try {
			const body = isStrength
				? { sessionId: session.id, strengthSets: rows, rpe, notes: notes || undefined }
				: {
						sessionId: session.id,
						runStats: {
							...(distanceKm ? { distanceKm } : {}),
							...(durationSec ? { durationSec } : {}),
							...(runHr ? { avgHr: Number(runHr) } : {}),
							...(paceSecPerKm ? { avgPaceSecPerKm: paceSecPerKm } : {}),
						},
						rpe,
						notes: notes || undefined,
					};
			const res = await api.log(body);
			onSaved(res.log as ClientLog);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not save.';
			saving = false;
		}
	}
</script>

<div
	class="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl rounded-t-2xl border border-hairline bg-paper p-4 shadow-lg"
	role="dialog"
	aria-label="Log session"
>
	<div class="flex items-center justify-between">
		<div>
			<p class="text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
			<h2 class="font-display text-lg font-medium">{session.title ?? 'Log session'}</h2>
		</div>
		<button type="button" onclick={onClose} class="px-2 py-1 text-steel hover:text-ink" aria-label="Close">
			✕
		</button>
	</div>

	<hr class="my-3 border-hairline" />

	{#if !isStrength}
		<div class="grid grid-cols-2 gap-3">
			<label class="text-xs text-steel">
				Distance ({unit})
				<input
					bind:value={runDistance}
					inputmode="decimal"
					class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
				/>
			</label>
			<label class="text-xs text-steel">
				Duration (mm:ss)
				<input
					bind:value={runDuration}
					inputmode="numeric"
					placeholder="45:00"
					class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
				/>
			</label>
		</div>
		<div class="mt-3 flex items-baseline justify-between">
			<span class="text-xs text-steel">Pace (auto)</span>
			<span class="tabular text-lg">{paceSecPerKm ? fmtPace(paceSecPerKm) : '–'}</span>
		</div>
		<label class="mt-3 block text-xs text-steel">
			Avg HR (optional)
			<input
				bind:value={runHr}
				inputmode="numeric"
				class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
			/>
		</label>
	{:else}
		<div class="space-y-3">
			{#each rows as row (row.machine)}
				<div class="rounded-lg border border-hairline p-3">
					<p class="text-sm font-medium">{row.machine}</p>
					<div class="mt-2 space-y-1">
						{#each row.sets as set, i (i)}
							<div class="flex items-center gap-2">
								<span class="tabular w-6 text-xs text-steel">{i + 1}</span>
								<input
									bind:value={set.reps}
									type="number"
									inputmode="numeric"
									aria-label="{row.machine} set {i + 1} reps"
									class="tabular w-16 rounded-md border border-hairline bg-paper px-2 py-1 text-sm"
								/>
								<span class="text-xs text-steel">reps ×</span>
								<input
									bind:value={set.weightKg}
									type="number"
									inputmode="decimal"
									aria-label="{row.machine} set {i + 1} weight"
									class="tabular w-20 rounded-md border border-hairline bg-paper px-2 py-1 text-sm"
								/>
								<span class="text-xs text-steel">kg</span>
							</div>
						{/each}
					</div>
					<div class="mt-2 flex gap-2 text-xs">
						<button type="button" onclick={() => repeatLast(row)} class="text-signal-ink hover:underline"
							>↻ same</button
						>
						<button type="button" onclick={() => addSet(row)} class="text-steel hover:text-ink">+ set</button>
						<button type="button" onclick={() => removeSet(row)} class="text-steel hover:text-ink"
							>− set</button
						>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<fieldset class="mt-4">
		<legend class="text-xs uppercase tracking-widest text-steel">Effort (RPE)</legend>
		<div class="mt-2 grid grid-cols-5 gap-1">
			{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as v (v)}
				<button
					type="button"
					aria-pressed={rpe === v}
					onclick={() => (rpe = rpe === v ? null : v)}
					class="tabular h-11 rounded-md text-sm transition-colors {rpe === v
						? 'bg-ink text-paper font-bold'
						: 'border border-hairline text-steel hover:border-steel'}"
				>
					{v}
				</button>
			{/each}
		</div>
	</fieldset>

	<label class="mt-3 block text-xs text-steel">
		Notes (optional)
		<textarea
			bind:value={notes}
			rows="2"
			class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
		></textarea>
	</label>

	{#if error}
		<p class="mt-3 text-sm text-signal-ink">{error}</p>
	{/if}

	<button
		type="button"
		onclick={save}
		disabled={saving}
		class="mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
	>
		{saving ? 'Saving…' : 'Save session'}
	</button>
</div>

<button
	type="button"
	aria-label="Close log sheet"
	onclick={onClose}
	class="fixed inset-0 z-10 bg-ink/20"
></button>

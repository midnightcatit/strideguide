<script lang="ts">
	import type { ClientLog, ClientSession } from '$lib/plan';
	import { api } from '$lib/api';
	import { fmtPace, prefs } from '$lib/prefs.svelte';
	import { milesToKm } from '@strideguide/shared/units';
	import { modal } from '$lib/actions';
	import InfoButton from '$lib/components/InfoButton.svelte';
	let {
		session,
		eyebrow,
		asPage = false,
		/** 'reflection' is the goal day's wrap up: no distance or strength, just
		 * how it went, so a plan-complete card can be logged like a session. */
		variant = 'session',
		/** A goal day has no session behind it, so its log stands on its own. */
		standalone = false,
		/** The civil date to date a standalone log with. */
		startedAtDate,
		onClose,
		onSaved,
	}: {
		session: ClientSession;
		eyebrow: string;
		/** True when this is a route, so it renders in flow instead of as a sheet. */
		asPage?: boolean;
		variant?: 'session' | 'reflection';
		standalone?: boolean;
		startedAtDate?: string;
		onClose: () => void;
		onSaved: (log: ClientLog) => void;
	} = $props();

	const isReflection = $derived(variant === 'reflection');
	const isStrength = $derived(session.modality === 'strength' && !isReflection);
	const isCross = $derived(session.type === 'cross-train');
	const machines = $derived(session.prescription?.blocks ?? []);

	// --- run state ---
	const unit = $derived(prefs.units === 'imperial' ? 'mi' : 'km');
	const weightUnit = $derived(prefs.units === 'imperial' ? 'lb' : 'kg');
	let runDistance = $state('');
	let runDuration = $state('');
	let runHr = $state('');
	let rpe = $state<number | null>(null);
	let feedback = $state<'up' | 'down' | null>(null);
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
	const titleId = `log-title-${crypto.randomUUID()}`;
	const errorId = `log-error-${crypto.randomUUID()}`;

	// Prefill from the prescription.
	$effect(() => {
		if (isStrength) return;
		// The whole run: warm-up, reps and cool-down, not just the main effort.
		const km =
			session.prescription?.workout?.totalDistanceKm ?? session.prescription?.targetDistanceKm;
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
			const strengthSets = rows.map((r) => ({
				machine: r.machine,
				sets: r.sets.map((s) => ({
					reps: s.reps,
					weightKg:
						weightUnit === 'lb' ? Math.round((s.weightKg / 2.20462) * 10) / 10 : s.weightKg,
				})),
			}));
			const base = {
				...(standalone ? {} : { sessionId: session.id }),
				...(standalone && startedAtDate ? { startedAt: `${startedAtDate}T12:00:00` } : {}),
			};
			const body = isStrength
				? { ...base, strengthSets, rpe, feedback, notes: notes || undefined }
				: isReflection
					? { ...base, rpe, feedback, notes: notes || undefined }
					: isCross
						? {
								...base,
								runStats: { ...(durationSec ? { durationSec } : {}) },
								rpe,
								feedback,
								notes: notes || undefined,
							}
						: {
								...base,
								runStats: {
									...(distanceKm ? { distanceKm } : {}),
									...(durationSec ? { durationSec } : {}),
									...(runHr ? { avgHr: Number(runHr) } : {}),
									...(paceSecPerKm ? { avgPaceSecPerKm: paceSecPerKm } : {}),
								},
								rpe,
								feedback,
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
	class={asPage
		? 'w-full'
		: 'sg-sheet fixed inset-0 flex items-end justify-center sm:items-center sm:p-4'}
	role={asPage ? undefined : 'dialog'}
	aria-modal={asPage ? undefined : 'true'}
	aria-labelledby={asPage ? undefined : titleId}
	use:modal={{ onClose, enabled: !asPage }}
>
	{#if !asPage}
		<button type="button" aria-label="Close" data-modal-backdrop onclick={onClose} class="overlay-fade absolute inset-0 bg-ink/30"></button>
	{/if}
	<div
		data-modal-panel
		tabindex="-1"
		class={asPage
			? 'relative mx-auto w-full max-w-2xl rounded-2xl border border-hairline bg-paper p-4'
			: 'sg-overlay-pad overlay-sheet relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl border border-hairline bg-paper p-4 outline-none sm:rounded-2xl'}
		style="--overlay-pad: 1rem"
	>
	<div class="sticky {asPage ? 'top-16' : 'top-0'} z-10 -mx-4 -mt-4 flex items-center justify-between border-b border-hairline bg-paper px-4 pb-3 pt-4">
		<div class="min-w-0">
			<p class="text-xs uppercase tracking-widest text-steel">{eyebrow}</p>
			<h2 id={titleId} class="font-display truncate text-lg font-medium">{session.title ?? 'Log session'}</h2>
		</div>
		<button type="button" onclick={onClose} class="flex h-11 w-11 shrink-0 items-center justify-center text-steel hover:text-ink" aria-label="Close">
			✕
		</button>
	</div>

	<div class="mt-3"></div>

	{#if isReflection}
		<p class="mt-1 text-sm leading-relaxed text-steel">
			Mark the day. Add a note about how the plan went, and how you feel now.
		</p>
	{:else if isCross}
		<label class="block text-xs text-steel">
			How long did you play? (mm:ss)
			<input
				bind:value={runDuration}
				inputmode="numeric"
				placeholder="60:00"
				class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
			/>
		</label>
		<p class="mt-2 text-xs text-steel">Duration and effort tell your coach how much the sport took out of you, so the plan can lighten the running when it needs to.</p>
	{:else if !isStrength}
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
			<span class="tabular text-base">{paceSecPerKm ? fmtPace(paceSecPerKm) : ''}</span>
		</div>
		<label class="mt-4 block border-t border-hairline pt-3 text-xs text-steel">
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
							<div class="flex min-w-0 items-center gap-2">
								<span class="tabular w-5 shrink-0 text-xs text-steel">{i + 1}</span>
								<input
									bind:value={set.reps}
									type="number"
									inputmode="numeric"
									aria-label="{row.machine} set {i + 1} reps"
									class="tabular w-14 min-w-0 rounded-md border border-hairline-strong bg-paper px-2 py-1.5 text-sm"
								/>
								<span class="shrink-0 text-xs text-steel">×</span>
								<input
									bind:value={set.weightKg}
									type="number"
									inputmode="decimal"
									aria-label="{row.machine} set {i + 1} weight"
									class="tabular w-16 min-w-0 rounded-md border border-hairline-strong bg-paper px-2 py-1.5 text-sm"
								/>
								<span class="shrink-0 text-xs text-steel">{weightUnit}</span>
							</div>
						{/each}
					</div>
					<div class="mt-1 flex gap-1 text-xs">
						<button type="button" onclick={() => repeatLast(row)} class="flex h-11 items-center px-2 text-signal-ink hover:underline">↻ same</button>
						<button type="button" onclick={() => addSet(row)} class="flex h-11 items-center px-2 text-steel hover:text-ink">+ set</button>
						<button type="button" onclick={() => removeSet(row)} class="flex h-11 items-center px-2 text-steel hover:text-ink">− set</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<fieldset class="mt-4">
		<legend class="flex items-center gap-1 text-xs uppercase tracking-widest text-steel">
			Effort, optional (RPE)
			<InfoButton
				term="RPE"
				definition="How hard the session felt, on a scale of 1 to 10. One is a walk, ten is everything you have."
			/>
		</legend>
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

	<fieldset class="mt-4 border-t border-hairline pt-3">
		<legend class="text-xs uppercase tracking-widest text-steel">Did this suit you?</legend>
		<div class="mt-2 grid grid-cols-2 gap-2">
			<button
				type="button"
				aria-pressed={feedback === 'up'}
				onclick={() => (feedback = feedback === 'up' ? null : 'up')}
				class="flex h-11 items-center justify-center rounded-md text-sm transition-colors {feedback === 'up'
					? 'bg-ink font-bold text-paper'
					: 'border border-hairline text-steel hover:border-steel'}"
			>
				Felt good
			</button>
			<button
				type="button"
				aria-pressed={feedback === 'down'}
				onclick={() => (feedback = feedback === 'down' ? null : 'down')}
				class="flex h-11 items-center justify-center rounded-md text-sm transition-colors {feedback === 'down'
					? 'bg-ink font-bold text-paper'
					: 'border border-hairline text-steel hover:border-steel'}"
			>
				Felt off
			</button>
		</div>
		<p class="mt-1 text-xs text-steel">Optional. It tells your coach which sessions work for you, so the plan leans toward them.</p>
	</fieldset>

	<label class="mt-4 block border-t border-hairline pt-3 text-xs text-steel">
		Notes (optional)
		<textarea
			bind:value={notes}
			rows="2"
			class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
		></textarea>
	</label>

	{#if error}
		<p id={errorId} role="alert" class="mt-3 text-sm text-danger">{error}</p>
	{/if}
	<p class="sr-only" role="status" aria-live="polite">{saving ? 'Saving session' : ''}</p>

	<!-- As a page the primary button rides the bottom of the viewport, clearing
	     the phone tab bar and the home indicator, so it stays reachable without
	     scrolling a long form to its end. As a sheet it stays at the foot of the
	     scroll, where the sheet's own frame already holds it. -->
	<div
		class={asPage
			? 'sticky z-20 -mx-4 -mb-4 mt-4 border-t border-hairline bg-paper px-4 py-3 bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))] sm:bottom-0'
			: 'mt-4'}
	>
		<button
			type="button"
			onclick={save}
			disabled={saving}
			aria-busy={saving}
			class="w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
		>
			{saving ? 'Saving…' : isReflection ? 'Save' : 'Save session'}
		</button>
	</div>
	</div>
</div>

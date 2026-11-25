<script lang="ts">
	import { untrack } from 'svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import SettingsSaveBar from '$lib/components/SettingsSaveBar.svelte';
	import SettingsDraftGuard from '$lib/components/SettingsDraftGuard.svelte';
	import { prefs, setHealthGoals } from '$lib/prefs.svelte';
	import { GOAL_DEFAULTS } from '$lib/chartTheme';

	// The three daily activity goals the health charts draw a line at. Each field
	// edits a draft; one save writes them all. Discard throws the draft away and
	// restores what is stored. A goal the runner has never set shows the app
	// default, which is also what the charts fall back to.
	type Draft = { steps: string; energy: string; zones: string };
	function readDraft(): Draft {
		return {
			steps: String(prefs.stepGoal ?? GOAL_DEFAULTS.steps),
			energy: String(prefs.activeEnergyGoalKcal ?? GOAL_DEFAULTS.active_energy_kcal),
			zones: String(prefs.activeZoneGoalMin ?? GOAL_DEFAULTS.active_zone_min),
		};
	}
	function clone(d: Draft): Draft {
		return { ...d };
	}
	function same(a: Draft, b: Draft): boolean {
		return a.steps === b.steps && a.energy === b.energy && a.zones === b.zones;
	}

	let draft = $state<Draft>(readDraft());
	// The values the draft was last seeded from, so an untouched draft can adopt
	// stored prefs once they load, without clobbering edits in progress.
	let seeded = $state<Draft>(readDraft());
	const saved = $derived(readDraft());
	const dirty = $derived(!same(draft, saved));

	$effect(() => {
		const s = saved;
		if (untrack(() => same(draft, seeded))) {
			draft = clone(s);
			seeded = clone(s);
		}
	});

	let saving = $state(false);
	let message = $state('');

	function discard() {
		const s = readDraft();
		draft = clone(s);
		seeded = clone(s);
		message = '';
	}

	/** A whole number inside the stored range, or the app default when unusable. */
	function parseGoal(v: string, min: number, max: number, fallback: number): number {
		const n = Math.round(Number(v));
		return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
	}

	async function save() {
		saving = true;
		message = '';
		try {
			await setHealthGoals({
				stepGoal: parseGoal(draft.steps, 500, 100000, GOAL_DEFAULTS.steps),
				activeEnergyGoalKcal: parseGoal(draft.energy, 50, 5000, GOAL_DEFAULTS.active_energy_kcal),
				activeZoneGoalMin: parseGoal(draft.zones, 5, 300, GOAL_DEFAULTS.active_zone_min),
			});
			draft = readDraft();
			seeded = clone(draft);
			message = 'Saved. Your health charts now draw these lines.';
		} finally {
			saving = false;
		}
	}
</script>

<SettingsHeader title="Daily goals" />

<section class="grid gap-4">
	<label class="block">
		<span class="flex items-baseline justify-between gap-2">
			<span class="text-sm font-medium">Steps</span>
			<span class="text-xs text-steel">{saved.steps}</span>
		</span>
		<input
			type="number"
			value={draft.steps}
			min="500"
			max="100000"
			step="500"
			oninput={(e) => (draft.steps = (e.currentTarget as HTMLInputElement).value)}
			class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
		<span class="mt-1 block text-xs text-steel">The Steps chart draws its goal line here.</span>
	</label>

	<label class="block">
		<span class="flex items-baseline justify-between gap-2">
			<span class="text-sm font-medium">Active energy</span>
			<span class="text-xs text-steel">{saved.energy} kcal</span>
		</span>
		<input
			type="number"
			value={draft.energy}
			min="50"
			max="5000"
			step="50"
			oninput={(e) => (draft.energy = (e.currentTarget as HTMLInputElement).value)}
			class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
		<span class="mt-1 block text-xs text-steel">The active calories your device records, not your total burn.</span>
	</label>

	<label class="block">
		<span class="flex items-baseline justify-between gap-2">
			<span class="text-sm font-medium">Active zone minutes</span>
			<span class="text-xs text-steel">{saved.zones} min</span>
		</span>
		<input
			type="number"
			value={draft.zones}
			min="5"
			max="300"
			step="1"
			oninput={(e) => (draft.zones = (e.currentTarget as HTMLInputElement).value)}
			class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
		<span class="mt-1 block text-xs text-steel">The default of 21 is the WHO weekly target of 150 spread across the week.</span>
	</label>

	{#if message}<p class="text-xs text-signal-ink">{message}</p>{/if}
</section>

<SettingsSaveBar {dirty} {saving} onSave={save} onDiscard={discard} />

<SettingsDraftGuard {dirty} onDiscard={discard} />

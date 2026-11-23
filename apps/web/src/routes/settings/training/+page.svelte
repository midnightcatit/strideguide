<script lang="ts">
	import { untrack } from 'svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import { api } from '$lib/api';
	import {
		prefs,
		setAutoAdvance,
		setCountdownSec,
		setEquipment,
		setEquipmentItems,
		setGymPreset,
		setMachineItems,
		setUnits,
		setWeekStart,
	} from '$lib/prefs.svelte';
	import { GYM_PRESETS, PF_MACHINES, EXTRA_MACHINES } from '@strideguide/shared/plan';
	import type { Units, Prefs } from '@strideguide/shared/units';

	const countdown = $derived(prefs.countdownSec ?? 5);
	const autoNext = $derived(prefs.autoAdvance ?? true);
	const MACHINES = [...PF_MACHINES, ...EXTRA_MACHINES].map((m) => m.name);

	// Equipment and gym are edited as a draft: taps only change local state, and one
	// rebuild happens when the runner saves. Discard throws the draft away.
	type Draft = {
		equipment: Prefs['equipment'];
		equipmentItems: NonNullable<Prefs['equipmentItems']>;
		gymPreset: Prefs['gymPreset'];
		machineItems: NonNullable<Prefs['machineItems']>;
	};
	function readPrefs(): Draft {
		return {
			equipment: prefs.equipment,
			equipmentItems: prefs.equipmentItems ?? [],
			gymPreset: prefs.gymPreset,
			machineItems: prefs.machineItems ?? [],
		};
	}
	function same(a: Draft, b: Draft): boolean {
		return (
			a.equipment === b.equipment &&
			a.gymPreset === b.gymPreset &&
			[...a.equipmentItems].sort().join() === [...b.equipmentItems].sort().join() &&
			[...a.machineItems].sort().join() === [...b.machineItems].sort().join()
		);
	}

	let draft = $state<Draft>(readPrefs());
	// The values the draft was last seeded from, so an untouched draft can adopt
	// stored prefs once they load, without clobbering edits in progress.
	let seeded = $state<Draft>(readPrefs());
	const saved = $derived(readPrefs());
	const dirty = $derived(!same(draft, saved));
	const machineMode = $derived(
		draft.equipment === 'machines' || draft.equipment === 'both' || draft.equipment === 'full-gym',
	);

	$effect(() => {
		const s = saved;
		if (untrack(() => same(draft, seeded))) {
			draft = s;
			seeded = s;
		}
	});

	let saving = $state(false);
	let message = $state('');

	function pickEquipment(v: Draft['equipment']) {
		draft.equipment = v;
	}
	function toggleItem(v: Item) {
		const cur = draft.equipmentItems;
		draft.equipmentItems = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
	}
	function pickGym(id: string) {
		const preset = GYM_PRESETS.find((p) => p.id === id);
		if (draft.gymPreset === id || !preset) {
			draft.gymPreset = undefined;
			return;
		}
		// Choosing a gym also suggests its free-weight mode and clears per-machine overrides.
		draft.gymPreset = id;
		draft.equipment = preset.mode;
		draft.machineItems = [];
	}
	function toggleMachine(name: string) {
		const cur = draft.machineItems;
		draft.machineItems = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
	}

	function bump(d: number) {
		void setCountdownSec(countdown + d);
	}
	function discard() {
		draft = readPrefs();
		seeded = draft;
		message = '';
	}

	async function save() {
		saving = true;
		message = '';
		const next: Draft = {
			...draft,
			equipmentItems: [...draft.equipmentItems],
			machineItems: [...draft.machineItems],
		};
		try {
			await setEquipment(next.equipment);
			await setEquipmentItems(next.equipmentItems);
			await setGymPreset(next.gymPreset);
			await setMachineItems(next.machineItems);
			const res = await api.adaptPlan({
				equipment: next.equipment,
				equipmentItems: next.equipmentItems,
				gymPreset: next.gymPreset,
				machineItems: next.machineItems,
			});
			message = res.changed
				? 'Updated. The weeks ahead now match your equipment.'
				: 'Saved. Your current weeks already match.';
		} catch {
			message = 'Saved, but the weeks ahead could not be rebuilt just now.';
		} finally {
			seeded = next;
			saving = false;
		}
	}

	type Item = 'machines' | 'dumbbells' | 'barbell' | 'kettlebell' | 'bands';
	const ITEMS: { v: Item; name: string }[] = [
		{ v: 'machines', name: 'Machines' },
		{ v: 'dumbbells', name: 'Dumbbells' },
		{ v: 'barbell', name: 'Barbell' },
		{ v: 'kettlebell', name: 'Kettlebell' },
		{ v: 'bands', name: 'Bands' },
	];
	const EQUIPMENT: { v: NonNullable<Prefs['equipment']>; name: string }[] = [
		{ v: 'machines', name: 'Machines' },
		{ v: 'bodyweight', name: 'Bodyweight' },
		{ v: 'bodyweight-dumbbells', name: 'Bodyweight plus dumbbells' },
		{ v: 'dumbbells', name: 'Dumbbells' },
		{ v: 'barbell', name: 'Barbell' },
		{ v: 'kettlebell', name: 'Kettlebell' },
		{ v: 'bands', name: 'Bands and home kit' },
		{ v: 'both', name: 'A mix' },
		{ v: 'full-gym', name: 'Full gym' },
	];
</script>

<SettingsHeader title="Training" />

<section class="grid gap-6">
	<div>
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Units</h2>
		<div class="mt-2 flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Units">
			{#each [{ v: 'metric', l: 'Metric (km)' }, { v: 'imperial', l: 'Imperial (mi)' }] as opt (opt.v)}
				<button
					type="button"
					aria-pressed={prefs.units === opt.v}
					onclick={() => setUnits(opt.v as Units)}
					class="flex-1 px-3 py-2.5 text-sm transition-colors {prefs.units === opt.v
						? 'bg-ink text-paper'
						: 'text-steel hover:text-ink'}"
				>
					{opt.l}
				</button>
			{/each}
		</div>
		<p class="mt-2 text-xs text-steel">Distances, paces and weights update across the app.</p>
	</div>

	<div>
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Week starts on</h2>
		<div class="mt-2 flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Week start">
			{#each [{ v: 0, l: 'Monday' }, { v: 1, l: 'Sunday' }] as opt (opt.v)}
				<button
					type="button"
					aria-pressed={prefs.weekStart === opt.v}
					onclick={() => setWeekStart(opt.v as 0 | 1)}
					class="flex-1 px-3 py-2.5 text-sm transition-colors {prefs.weekStart === opt.v
						? 'bg-ink text-paper'
						: 'text-steel hover:text-ink'}"
				>
					{opt.l}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Countdown before a step</h2>
		<div class="mt-2 flex items-center gap-3">
			<button type="button" onclick={() => bump(-1)} disabled={countdown <= 0} aria-label="Less" class="flex h-11 w-11 items-center justify-center rounded-md border border-hairline text-lg disabled:opacity-40">−</button>
			<span class="tabular w-20 text-center text-lg font-medium">{countdown === 0 ? 'Off' : `${countdown}s`}</span>
			<button type="button" onclick={() => bump(1)} disabled={countdown >= 15} aria-label="More" class="flex h-11 w-11 items-center justify-center rounded-md border border-hairline text-lg disabled:opacity-40">+</button>
		</div>
		<p class="mt-2 text-xs text-steel">How long the player waits before the workout and each step starts. Off starts straight away.</p>
	</div>

	<div class="flex items-center justify-between gap-4">
		<div class="min-w-0">
			<h2 class="text-sm font-medium">Auto next</h2>
			<p class="mt-0.5 text-xs text-steel">Move to the next step by itself. Off means you tap Go to next.</p>
		</div>
		<Switch checked={autoNext} label="Auto next" onChange={(v) => setAutoAdvance(v)} />
	</div>

	<div class="border-t border-hairline pt-6">
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Strength equipment</h2>
		<div class="mt-2 grid gap-2 sm:grid-cols-2">
			{#each EQUIPMENT as opt (opt.v)}
				<button
					type="button"
					aria-pressed={draft.equipment === opt.v}
					onclick={() => pickEquipment(opt.v)}
					class="rounded-xl border px-4 py-3 text-left text-sm transition-colors {draft.equipment === opt.v
						? 'border-signal-ink bg-signal-wash'
						: 'border-hairline hover:border-steel'}"
				>
					{opt.name}
				</button>
			{/each}
		</div>
		{#if draft.equipment && draft.equipment !== 'bodyweight'}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each ITEMS as item (item.v)}
					<button
						type="button"
						aria-pressed={draft.equipmentItems.includes(item.v)}
						onclick={() => toggleItem(item.v)}
						class="rounded-full border px-3 py-1.5 text-sm transition-colors {draft.equipmentItems.includes(
							item.v,
						)
							? 'border-signal-ink bg-signal-wash text-signal-ink'
							: 'border-hairline text-steel hover:border-steel'}"
					>
						{item.name}
					</button>
				{/each}
			</div>
		{/if}
		<p class="mt-2 text-xs text-steel">Changing this rebuilds the weeks ahead with the right moves. Save to apply.</p>
		{#if machineMode}
			<p class="tabular mt-5 text-xs uppercase tracking-widest text-steel">Your gym</p>
			<div class="mt-2 grid gap-2 sm:grid-cols-2">
				{#each GYM_PRESETS as gym (gym.id)}
					<button
						type="button"
						aria-pressed={draft.gymPreset === gym.id}
						onclick={() => pickGym(gym.id)}
						class="rounded-xl border px-4 py-2.5 text-left text-sm transition-colors {draft.gymPreset ===
						gym.id
							? 'border-signal-ink bg-signal-wash'
							: 'border-hairline hover:border-steel'}"
					>
						{gym.name}
					</button>
				{/each}
			</div>
			<details class="mt-3">
				<summary class="cursor-pointer text-xs text-steel">Fine-tune the machines</summary>
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each MACHINES as name (name)}
						<button
							type="button"
							aria-pressed={draft.machineItems.includes(name)}
							onclick={() => toggleMachine(name)}
							class="rounded-full border px-2.5 py-1 text-xs transition-colors {draft.machineItems.includes(
								name,
							)
								? 'border-signal-ink bg-signal-wash text-signal-ink'
								: 'border-hairline text-steel hover:border-steel'}"
						>
							{name}
						</button>
					{/each}
				</div>
				<p class="mt-2 text-xs text-steel">Tap the machines you have. This overrides the gym choice.</p>
			</details>
		{/if}
		{#if message}<p class="mt-2 text-xs text-signal-ink">{message}</p>{/if}
	</div>

	<div class="border-t border-hairline pt-6">
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Plan</h2>
		<a href="/onboarding" class="mt-2 block rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink">
			Rebuild plan
		</a>
		<p class="mt-2 text-xs text-steel">Builds a fresh plan from your goal and current race paces.</p>
	</div>
</section>

<div
	class="sticky z-30 -mx-4 border-t border-hairline bg-paper/95 px-4 py-3 backdrop-blur bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))] sm:bottom-0"
>
	<div class="flex items-center gap-2">
		<button
			type="button"
			onclick={discard}
			disabled={!dirty || saving}
			class="flex-1 rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-steel disabled:opacity-40"
		>
			Discard
		</button>
		<button
			type="button"
			onclick={save}
			disabled={!dirty || saving}
			class="flex-1 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
		>
			{saving ? 'Saving…' : 'Save'}
		</button>
	</div>
</div>

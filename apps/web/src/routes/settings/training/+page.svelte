<script lang="ts">
	import { untrack } from 'svelte';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import SettingsSaveBar from '$lib/components/SettingsSaveBar.svelte';
	import SettingsDraftGuard from '$lib/components/SettingsDraftGuard.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import ScheduleGrid from '$lib/components/ScheduleGrid.svelte';
	import { api } from '$lib/api';
	import { today } from '$lib/today.svelte';
	import {
		prefs,
		setAutoAdvance,
		setCountdownSec,
		setEquipment,
		setEquipmentItems,
		setGymPreset,
		setMachineItems,
		setSchedule,
		setUnits,
		setWeekStart,
	} from '$lib/prefs.svelte';
	import { GYM_PRESETS, PF_MACHINES, EXTRA_MACHINES } from '@strideguide/shared/plan';
	import type { Units, Prefs } from '@strideguide/shared/units';

	const MACHINES = [...PF_MACHINES, ...EXTRA_MACHINES].map((m) => m.name);

	// Every control on the page edits a draft. Taps only change local state, and
	// one save writes them all and triggers a single plan rebuild. Discard throws
	// the draft away and restores what is stored.
	type Draft = {
		units: Units;
		weekStart: 0 | 1;
		countdownSec: number;
		autoAdvance: boolean;
		equipment: Prefs['equipment'];
		equipmentItems: NonNullable<Prefs['equipmentItems']>;
		gymPreset: Prefs['gymPreset'];
		machineItems: NonNullable<Prefs['machineItems']>;
		schedule: NonNullable<Prefs['schedule']>;
	};
	function readPrefs(): Draft {
		return {
			units: prefs.units,
			weekStart: prefs.weekStart,
			countdownSec: prefs.countdownSec ?? 5,
			autoAdvance: prefs.autoAdvance ?? true,
			equipment: prefs.equipment,
			equipmentItems: prefs.equipmentItems ?? [],
			gymPreset: prefs.gymPreset,
			machineItems: prefs.machineItems ?? [],
			schedule: prefs.schedule ?? [],
		};
	}
	function clone(d: Draft): Draft {
		return {
			...d,
			equipmentItems: [...d.equipmentItems],
			machineItems: [...d.machineItems],
			schedule: d.schedule.map((b) => ({ ...b })),
		};
	}
	function sameItems(a: string[], b: string[]): boolean {
		return [...a].sort().join() === [...b].sort().join();
	}
	function sameSchedule(a: Draft['schedule'], b: Draft['schedule']): boolean {
		return JSON.stringify(a) === JSON.stringify(b);
	}
	function same(a: Draft, b: Draft): boolean {
		return (
			a.units === b.units &&
			a.weekStart === b.weekStart &&
			a.countdownSec === b.countdownSec &&
			a.autoAdvance === b.autoAdvance &&
			a.equipment === b.equipment &&
			a.gymPreset === b.gymPreset &&
			sameItems(a.equipmentItems, b.equipmentItems) &&
			sameItems(a.machineItems, b.machineItems) &&
			sameSchedule(a.schedule, b.schedule)
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
			draft = clone(s);
			seeded = clone(s);
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
		draft.countdownSec = Math.max(0, Math.min(15, draft.countdownSec + d));
	}
	function discard() {
		const s = readPrefs();
		draft = clone(s);
		seeded = clone(s);
		message = '';
	}

	async function save() {
		saving = true;
		message = '';
		const next = clone(draft);
		try {
			await setUnits(next.units);
			await setWeekStart(next.weekStart);
			await setCountdownSec(next.countdownSec);
			await setAutoAdvance(next.autoAdvance);
			await setEquipment(next.equipment);
			await setEquipmentItems(next.equipmentItems);
			await setGymPreset(next.gymPreset);
			await setMachineItems(next.machineItems);
			// The windows are prefs only; they do not change the built weeks, so they
			// are saved on their own rather than through the plan rebuild below.
			await setSchedule(next.schedule);
			const res = await api.adaptPlan({
				equipment: next.equipment,
				equipmentItems: next.equipmentItems,
				gymPreset: next.gymPreset,
				machineItems: next.machineItems,
				today: today.iso,
			});
			message = res.changed
				? 'Updated. The weeks ahead now match your equipment.'
				: 'Saved. Your current weeks already match.';
		} catch {
			message = 'Saved, but the weeks ahead could not be rebuilt just now.';
		} finally {
			seeded = clone(next);
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
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Units</h2>
			<span class="text-xs text-steel">{saved.units === 'imperial' ? 'Miles' : 'Kilometers'}</span>
		</div>
		<div class="mt-2 flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Units">
			{#each [{ v: 'metric', l: 'Metric (km)' }, { v: 'imperial', l: 'Imperial (mi)' }] as opt (opt.v)}
				<button
					type="button"
					aria-pressed={draft.units === opt.v}
					onclick={() => (draft.units = opt.v as Units)}
					class="flex-1 px-3 py-2.5 text-sm transition-colors {draft.units === opt.v
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
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Week starts on</h2>
			<span class="text-xs text-steel">{saved.weekStart === 1 ? 'Sunday' : 'Monday'}</span>
		</div>
		<div class="mt-2 flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Week start">
			{#each [{ v: 0, l: 'Monday' }, { v: 1, l: 'Sunday' }] as opt (opt.v)}
				<button
					type="button"
					aria-pressed={draft.weekStart === opt.v}
					onclick={() => (draft.weekStart = opt.v as 0 | 1)}
					class="flex-1 px-3 py-2.5 text-sm transition-colors {draft.weekStart === opt.v
						? 'bg-ink text-paper'
						: 'text-steel hover:text-ink'}"
				>
					{opt.l}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Countdown before a step</h2>
			<span class="text-xs text-steel">{saved.countdownSec === 0 ? 'Off' : `${saved.countdownSec}s`}</span>
		</div>
		<div class="mt-2 flex items-center gap-3">
			<button type="button" onclick={() => bump(-1)} disabled={draft.countdownSec <= 0} aria-label="Less" class="flex h-11 w-11 items-center justify-center rounded-md border border-hairline text-lg disabled:opacity-40">−</button>
			<span class="tabular w-20 text-center text-lg font-medium">{draft.countdownSec === 0 ? 'Off' : `${draft.countdownSec}s`}</span>
			<button type="button" onclick={() => bump(1)} disabled={draft.countdownSec >= 15} aria-label="More" class="flex h-11 w-11 items-center justify-center rounded-md border border-hairline text-lg disabled:opacity-40">+</button>
		</div>
		<p class="mt-2 text-xs text-steel">How long the player waits before the workout and each step starts. Off starts straight away.</p>
	</div>

	<div class="flex items-center justify-between gap-4">
		<div class="min-w-0">
			<div class="flex items-baseline gap-2">
				<h2 class="text-sm font-medium">Auto next</h2>
				<span class="text-xs text-steel">{saved.autoAdvance ? 'On' : 'Off'}</span>
			</div>
			<p class="mt-0.5 text-xs text-steel">Move to the next step by itself. Off means you tap Go to next.</p>
		</div>
		<Switch checked={draft.autoAdvance} label="Auto next" onChange={(v) => (draft.autoAdvance = v)} />
	</div>

	<div class="border-t border-hairline pt-6">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Strength equipment</h2>
			<span class="text-xs text-steel">{EQUIPMENT.find((e) => e.v === saved.equipment)?.name ?? 'Not set'}</span>
		</div>
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
			<div class="mt-5 flex items-baseline justify-between gap-3">
				<p class="tabular text-xs uppercase tracking-widest text-steel">Your gym</p>
				<span class="text-xs text-steel">{GYM_PRESETS.find((g) => g.id === saved.gymPreset)?.name ?? 'None'}</span>
			</div>
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
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Training windows</h2>
		<p class="mt-2 text-xs text-steel">
			The times you are usually free on each day. The plan can fit sessions inside these windows.
			Tap or drag on the grid to add a window, or use the controls, and tap a window to remove it.
		</p>
		<div class="mt-3">
			<ScheduleGrid blocks={draft.schedule} onChange={(b) => (draft.schedule = b)} />
		</div>
	</div>

	<div class="border-t border-hairline pt-6">
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Plan</h2>
		<a href="/onboarding" class="mt-2 block rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink">
			Rebuild plan
		</a>
		<p class="mt-2 text-xs text-steel">Builds a fresh plan from your goal and current race paces.</p>
	</div>
</section>

<SettingsSaveBar {dirty} {saving} onSave={save} onDiscard={discard} />

<SettingsDraftGuard {dirty} onDiscard={discard} />

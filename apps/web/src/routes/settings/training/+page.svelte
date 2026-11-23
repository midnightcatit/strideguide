<script lang="ts">
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
	import type { Units } from '@strideguide/shared/units';

	const countdown = $derived(prefs.countdownSec ?? 5);
	const autoNext = $derived(prefs.autoAdvance ?? true);
	const MACHINES = [...PF_MACHINES, ...EXTRA_MACHINES].map((m) => m.name);
	const machineMode = $derived(
		prefs.equipment === 'machines' || prefs.equipment === 'both' || prefs.equipment === 'full-gym',
	);

	async function rebuildGym(
		gymPreset: string | undefined,
		machineItems: string[] | undefined,
		mode: typeof prefs.equipment = prefs.equipment,
	) {
		saving = true;
		message = '';
		try {
			await setEquipment(mode);
			await setGymPreset(gymPreset);
			await setMachineItems(machineItems);
			const res = await api.adaptPlan({
				equipment: mode,
				equipmentItems: prefs.equipmentItems,
				gymPreset,
				machineItems,
			});
			message = res.changed
				? 'Updated. The weeks ahead now match your gym.'
				: 'Saved. Your current weeks already match.';
		} catch {
			message = 'Saved, but the weeks ahead could not be rebuilt just now.';
		} finally {
			saving = false;
		}
	}
	function pickGym(id: string) {
		const preset = GYM_PRESETS.find((p) => p.id === id);
		if (prefs.gymPreset === id || !preset) {
			void rebuildGym(undefined, prefs.machineItems);
			return;
		}
		// Choosing a gym also suggests its free-weight mode.
		void rebuildGym(id, undefined, preset.mode);
	}
	function toggleMachine(name: string) {
		const cur = prefs.machineItems ?? [];
		const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
		void rebuildGym(prefs.gymPreset, next);
	}


	function bump(d: number) {
		void setCountdownSec(countdown + d);
	}

	type Item = 'machines' | 'dumbbells' | 'barbell' | 'kettlebell' | 'bands';
	const ITEMS: { v: Item; name: string }[] = [
		{ v: 'machines', name: 'Machines' },
		{ v: 'dumbbells', name: 'Dumbbells' },
		{ v: 'barbell', name: 'Barbell' },
		{ v: 'kettlebell', name: 'Kettlebell' },
		{ v: 'bands', name: 'Bands' },
	];
	const EQUIPMENT: { v: NonNullable<typeof prefs.equipment>; name: string }[] = [
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

	let saving = $state(false);
	let message = $state('');

	async function rebuild(equipment: typeof prefs.equipment, items: typeof prefs.equipmentItems) {
		saving = true;
		message = '';
		try {
			await setEquipment(equipment);
			await setEquipmentItems(items);
			const res = await api.adaptPlan({ equipment, equipmentItems: items });
			message = res.changed
				? 'Updated. The weeks ahead now use this equipment.'
				: 'Saved. Your current weeks already match.';
		} catch {
			message = 'Saved, but the weeks ahead could not be rebuilt just now.';
		} finally {
			saving = false;
		}
	}

	function pick(equipment: typeof prefs.equipment) {
		void rebuild(equipment, prefs.equipmentItems);
	}
	function toggleItem(v: Item) {
		const cur = prefs.equipmentItems ?? [];
		const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
		void rebuild(prefs.equipment, next);
	}
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
					aria-pressed={prefs.equipment === opt.v}
					disabled={saving}
					onclick={() => pick(opt.v)}
					class="rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:opacity-60 {prefs.equipment === opt.v
						? 'border-signal-ink bg-signal-wash'
						: 'border-hairline hover:border-steel'}"
				>
					{opt.name}
				</button>
			{/each}
		</div>
		{#if prefs.equipment && prefs.equipment !== 'bodyweight'}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each ITEMS as item (item.v)}
					<button
						type="button"
						aria-pressed={(prefs.equipmentItems ?? []).includes(item.v)}
						disabled={saving}
						onclick={() => toggleItem(item.v)}
						class="rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 {(prefs.equipmentItems ?? []).includes(
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
		<p class="mt-2 text-xs text-steel">Changing this rebuilds the weeks ahead with the right moves.</p>
		{#if machineMode}
			<p class="tabular mt-5 text-xs uppercase tracking-widest text-steel">Your gym</p>
			<div class="mt-2 grid gap-2 sm:grid-cols-2">
				{#each GYM_PRESETS as gym (gym.id)}
					<button
						type="button"
						aria-pressed={prefs.gymPreset === gym.id}
						disabled={saving}
						onclick={() => pickGym(gym.id)}
						class="rounded-xl border px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-60 {prefs.gymPreset ===
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
							aria-pressed={(prefs.machineItems ?? []).includes(name)}
							disabled={saving}
							onclick={() => toggleMachine(name)}
							class="rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-60 {(prefs.machineItems ?? []).includes(
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

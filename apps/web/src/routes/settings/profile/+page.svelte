<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import SettingsSaveBar from '$lib/components/SettingsSaveBar.svelte';
	import SettingsDraftGuard from '$lib/components/SettingsDraftGuard.svelte';
	import { prefs, setPersonal, setVitals } from '$lib/prefs.svelte';
	import { api, type ConnectionStatus } from '$lib/api';
	import type { HealthDay } from '@strideguide/shared/plan';

	// The linked-device state comes from the server, not from a value captured at
	// build time, so the row is right the moment the runner returns from linking.
	let device = $state<ConnectionStatus | null>(null);
	// The daily readings the connector has already supplied. They decide which
	// vitals Google Health owns and which ones stay hand typed.
	let days = $state<HealthDay[]>([]);

	async function loadDevice() {
		try {
			const res = await api.connections();
			device = res.providers.find((p) => p.id === 'google-health') ?? null;
		} catch {
			// Leave the state unknown; the button still offers to link.
		}
		try {
			const res = await api.recovery();
			days = res.available ? res.days : [];
		} catch {
			// No health data yet; the manual fields stay in charge.
		}
	}

	onMount(loadDevice);
	// Refresh whenever the runner navigates back to this page, for example after
	// finishing the Google Health link in another view.
	afterNavigate((nav) => {
		if (nav && nav.type === 'enter') return;
		void loadDevice();
	});

	const deviceConnected = $derived(Boolean(device?.connected));
	const deviceConfigured = $derived(device ? device.configured : true);

	// The recovery route answers newest first, so the first day that carries a
	// resting heart rate is the latest reading Google Health has given us.
	const synced = $derived.by(() => {
		if (!deviceConnected) return null;
		const day = days.find((d) => d.restingHr);
		return day?.restingHr ? { bpm: day.restingHr, date: day.date } : null;
	});
	const syncedDate = $derived(
		synced
			? new Date(`${synced.date}T00:00:00`).toLocaleDateString(undefined, {
					month: 'short',
					day: 'numeric',
				})
			: '',
	);

	function linkDevice() {
		window.location.href = api.connectionConnectUrl('google-health', '/settings/profile');
	}

	// Every field edits a draft. Typing only changes local state, and one save
	// writes them all. Discard throws the draft away and restores what is stored.
	// The numbers are held as text so a half-typed value never fights the input,
	// and each is parsed back on save the same way the old blur handlers did.
	type Draft = {
		name: string;
		birthYear: string;
		eventName: string;
		height: string;
		weight: string;
		restingHr: string;
	};
	function displayHeight(cm: number): number {
		return Math.round((cm / 2.54) * 10) / 10;
	}
	function displayWeight(kg: number): number {
		return Math.round(kg * 2.20462 * 10) / 10;
	}
	function readDraft(): Draft {
		return {
			name: prefs.name ?? '',
			birthYear: prefs.birthYear != null ? String(prefs.birthYear) : '',
			eventName: prefs.eventName ?? '',
			height: prefs.heightCm != null ? String(displayHeight(prefs.heightCm)) : '',
			weight: prefs.weightKg != null ? String(displayWeight(prefs.weightKg)) : '',
			restingHr: prefs.restingHr != null ? String(prefs.restingHr) : '',
		};
	}
	function same(a: Draft, b: Draft): boolean {
		return (
			a.name === b.name &&
			a.birthYear === b.birthYear &&
			a.eventName === b.eventName &&
			a.height === b.height &&
			a.weight === b.weight &&
			a.restingHr === b.restingHr
		);
	}
	function clone(d: Draft): Draft {
		return { ...d };
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

	// The saved vitals as one muted line, so the stored numbers stay visible
	// beside the fields while the draft is being edited.
	const vitalsSummary = $derived.by(() => {
		const bits: string[] = [];
		if (saved.height) bits.push(`${saved.height} ${prefs.units === 'imperial' ? 'in' : 'cm'}`);
		if (saved.weight) bits.push(`${saved.weight} ${prefs.units === 'imperial' ? 'lb' : 'kg'}`);
		if (saved.restingHr) bits.push(`${saved.restingHr} bpm`);
		return bits.length ? bits.join(' · ') : 'Not set';
	});

	let saving = $state(false);

	function discard() {
		const s = readDraft();
		draft = clone(s);
		seeded = clone(s);
	}

	function parseBirthYear(v: string): number | null {
		const n = Number(v);
		return Number.isInteger(n) && n > 1900 ? n : null;
	}
	function parseHeight(v: string): number | null {
		const n = Number(v);
		return n > 48 && n < 96 ? Math.round(n * 2.54 * 10) / 10 : null;
	}
	function parseWeight(v: string): number | null {
		const n = Number(v);
		return n > 55 && n < 550 ? Math.round((n / 2.20462) * 10) / 10 : null;
	}
	function parseRestingHr(v: string): number | null {
		const n = Number(v);
		return n > 30 && n < 120 ? n : null;
	}

	async function save() {
		saving = true;
		const next = clone(draft);
		try {
			await setPersonal({
				name: next.name.trim(),
				birthYear: parseBirthYear(next.birthYear),
				eventName: next.eventName.trim(),
			});
			const vitals: {
				heightCm?: number | null;
				weightKg?: number | null;
				restingHr?: number | null;
			} = {
				heightCm: parseHeight(next.height),
				weightKg: parseWeight(next.weight),
			};
			// When Google Health owns resting heart rate, the field is hidden, so
			// leave it to the connector rather than writing a stale value back.
			if (!synced) vitals.restingHr = parseRestingHr(next.restingHr);
			await setVitals(vitals);
		} finally {
			seeded = clone(next);
			saving = false;
		}
	}
</script>

<SettingsHeader title="You" />

<section class="grid gap-4">
	<label class="block">
		<span class="flex items-baseline justify-between gap-2">
			<span class="text-sm font-medium">What should we call you?</span>
			<span class="text-xs text-steel">{saved.name || 'Not set'}</span>
		</span>
		<input
			type="text"
			value={draft.name}
			maxlength="40"
			placeholder="First name"
			oninput={(e) => (draft.name = (e.currentTarget as HTMLInputElement).value)}
			class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
	</label>

	<label class="block">
		<span class="flex items-baseline justify-between gap-2">
			<span class="text-sm font-medium">Birth year</span>
			<span class="text-xs text-steel">{saved.birthYear || 'Not set'}</span>
		</span>
		<input
			type="number"
			value={draft.birthYear}
			min="1900"
			max={new Date().getUTCFullYear() - 10}
			placeholder="1990"
			oninput={(e) => (draft.birthYear = (e.currentTarget as HTMLInputElement).value)}
			class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
		<span class="mt-1 block text-xs text-steel">
			Stored as a year so your age stays right over time. We use it only to tune a few training settings, and never show it to anyone else.
		</span>
	</label>

	<label class="block">
		<span class="flex items-baseline justify-between gap-2">
			<span class="text-sm font-medium">What are you training for?</span>
			<span class="max-w-[45%] truncate text-xs text-steel">{saved.eventName || 'Not set'}</span>
		</span>
		<input
			type="text"
			value={draft.eventName}
			maxlength="80"
			placeholder="e.g. Chicago Marathon"
			oninput={(e) => (draft.eventName = (e.currentTarget as HTMLInputElement).value)}
			class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
		<span class="mt-1 block text-xs text-steel">Names your race day when your plan does not already name it.</span>
	</label>

	<div class="mt-4 border-t border-hairline pt-4">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="tabular text-xs uppercase tracking-widest text-steel">Vitals, optional</h2>
			<span class="text-xs text-steel">{vitalsSummary}</span>
		</div>
		<p class="mt-1 text-xs text-steel">Stored for later, for training zones and load. Never shown to anyone else.</p>
		<div class="mt-3 grid grid-cols-3 gap-2">
			<label class="block">
				<span class="text-sm font-medium">Height</span>
				<input
					type="number"
					value={draft.height}
					min="48"
					max="96"
					oninput={(e) => (draft.height = (e.currentTarget as HTMLInputElement).value)}
					class="tabular mt-1 w-full min-w-0 rounded-md border border-hairline bg-paper px-2 py-2.5 text-sm"
				/>
				<span class="mt-1 block text-[10px] uppercase tracking-wide text-steel">
					{prefs.units === 'imperial' ? 'inches' : 'cm'}
				</span>
			</label>
			<label class="block">
				<span class="text-sm font-medium">Weight</span>
				<input
					type="number"
					value={draft.weight}
					min="55"
					max="550"
					oninput={(e) => (draft.weight = (e.currentTarget as HTMLInputElement).value)}
					class="tabular mt-1 w-full min-w-0 rounded-md border border-hairline bg-paper px-2 py-2.5 text-sm"
				/>
				<span class="mt-1 block text-[10px] uppercase tracking-wide text-steel">
					{prefs.units === 'imperial' ? 'lb' : 'kg'}
				</span>
			</label>
			{#if synced}
				<div class="block">
					<span class="text-sm font-medium">Resting HR</span>
					<div class="tabular mt-1 w-full min-w-0 rounded-md border border-hairline bg-sunken px-2 py-2.5 text-sm">
						{synced.bpm} bpm
					</div>
					<span class="mt-1 block text-[10px] uppercase tracking-wide text-signal-ink">from Google Health</span>
				</div>
			{:else}
				<label class="block">
					<span class="text-sm font-medium">Resting HR</span>
					<input
						type="number"
						value={draft.restingHr}
						min="30"
						max="120"
						placeholder="60"
						oninput={(e) => (draft.restingHr = (e.currentTarget as HTMLInputElement).value)}
						class="tabular mt-1 w-full min-w-0 rounded-md border border-hairline bg-paper px-2 py-2.5 text-sm"
					/>
					<span class="mt-1 block text-[10px] uppercase tracking-wide text-steel">bpm</span>
				</label>
			{/if}
		</div>
		<p class="mt-3 text-xs text-steel">
			{#if synced}
				Resting heart rate comes from Google Health, last read {syncedDate}. Weight and height stay yours to enter.
			{:else if deviceConnected}
				Google Health is linked, so its next sync fills in resting heart rate. Until then, and for weight and height, type the numbers yourself.
			{:else}
				Link Google Health and its resting heart rate reading takes over from anything typed here. Weight and height are always yours to enter.
			{/if}
		</p>

		{#if deviceConnected}
			<div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline px-4 py-2.5">
				<span class="flex items-center gap-2 text-sm">
					<svg class="h-4 w-4 text-signal-ink" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M5 10.5l3 3 7-7" />
					</svg>
					{device?.label ?? 'Google Health'} linked
				</span>
				<a href="/settings/connections" class="text-sm text-signal-ink hover:underline">Manage</a>
			</div>
		{:else if deviceConfigured}
			<button
				type="button"
				onclick={linkDevice}
				class="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink"
			>
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
					<circle cx="10" cy="10" r="7" />
					<path d="M10 6.5v3.5l2.5 1.5" />
				</svg>
				Link a device
			</button>
		{:else}
			<button
				type="button"
				disabled
				title="Not available"
				class="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-hairline px-4 py-2.5 text-sm text-steel opacity-70"
			>
				Link a device
				<span class="text-xs">Not available</span>
			</button>
		{/if}
	</div>
</section>

<SettingsSaveBar {dirty} {saving} onSave={save} onDiscard={discard} />

<SettingsDraftGuard {dirty} onDiscard={discard} />

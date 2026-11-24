<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
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
</script>

<SettingsHeader title="You" />

<section class="grid gap-4">
	<label class="block">
		<span class="text-sm font-medium">What should we call you?</span>
		<input
			type="text"
			value={prefs.name ?? ''}
			maxlength="40"
			placeholder="First name"
			onblur={(e) => setPersonal({ name: (e.currentTarget as HTMLInputElement).value.trim() })}
			class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
	</label>

	<label class="block">
		<span class="text-sm font-medium">Birth year</span>
		<input
			type="number"
			value={prefs.birthYear ?? ''}
			min="1900"
			max={new Date().getUTCFullYear() - 10}
			placeholder="1990"
			onblur={(e) => {
				const v = Number((e.currentTarget as HTMLInputElement).value);
				setPersonal({ birthYear: Number.isInteger(v) && v > 1900 ? v : null });
			}}
			class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
		<span class="mt-1 block text-xs text-steel">
			Stored as a year so your age stays right over time. We use it only to tune a few training heuristics, and never show it to anyone else.
		</span>
	</label>

	<label class="block">
		<span class="text-sm font-medium">What are you training for?</span>
		<input
			type="text"
			value={prefs.eventName ?? ''}
			maxlength="80"
			placeholder="e.g. Chicago Marathon"
			onblur={(e) => setPersonal({ eventName: (e.currentTarget as HTMLInputElement).value.trim() })}
			class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2.5 text-sm"
		/>
		<span class="mt-1 block text-xs text-steel">Shown on your dashboard, next to your greeting.</span>
	</label>

	<div class="mt-4 border-t border-hairline pt-4">
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Vitals, optional</h2>
		<p class="mt-1 text-xs text-steel">Stored for later, for training zones and load. Never shown to anyone else.</p>
		<div class="mt-3 grid grid-cols-3 gap-2">
			<label class="block">
				<span class="text-sm font-medium">Height</span>
				<input
					type="number"
					value={prefs.heightCm ? Math.round(prefs.heightCm * 2.20462 === 0 ? 0 : (prefs.heightCm / 2.54) * 10) / 10 : ''}
					min="48"
					max="96"
					onblur={(e) => {
						const v = Number((e.currentTarget as HTMLInputElement).value);
						setVitals({ heightCm: v > 48 && v < 96 ? Math.round(v * 2.54 * 10) / 10 : null });
					}}
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
					value={prefs.weightKg ? Math.round(prefs.weightKg * 2.20462 * 10) / 10 : ''}
					min="55"
					max="550"
					onblur={(e) => {
						const v = Number((e.currentTarget as HTMLInputElement).value);
						setVitals({ weightKg: v > 55 && v < 550 ? Math.round(v / 2.20462 * 10) / 10 : null });
					}}
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
						value={prefs.restingHr ?? ''}
						min="30"
						max="120"
						placeholder="60"
						onblur={(e) => {
							const v = Number((e.currentTarget as HTMLInputElement).value);
							setVitals({ restingHr: v > 30 && v < 120 ? v : null });
						}}
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

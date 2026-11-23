<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import { prefs, setPersonal, setVitals } from '$lib/prefs.svelte';
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
		</div>

		<button
			type="button"
			disabled
			title="Coming soon"
			class="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-hairline px-4 py-2.5 text-sm text-steel opacity-70"
		>
			<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
				<circle cx="10" cy="10" r="7" />
				<path d="M10 6.5v3.5l2.5 1.5" />
			</svg>
			Link a device
			<span class="text-xs">Coming soon</span>
		</button>
	</div>
</section>

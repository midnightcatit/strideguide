<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import { prefs, setPersonal } from '$lib/prefs.svelte';
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
</section>

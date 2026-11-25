<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import SettingsSaveBar from '$lib/components/SettingsSaveBar.svelte';
	import SettingsDraftGuard from '$lib/components/SettingsDraftGuard.svelte';
	import { getLandingTab, LANDING_TABS, setLandingTab, type LandingTab } from '$lib/prefs.svelte';

	let draft = $state<LandingTab>(getLandingTab());
	let saved = $state<LandingTab>(getLandingTab());

	const dirty = $derived(draft !== saved);

	function discard() {
		draft = saved;
	}

	function save() {
		setLandingTab(draft);
		saved = draft;
	}
</script>

<SettingsHeader title="Start tab" />

<div class="flex items-baseline justify-between gap-3">
	<h2 class="tabular text-xs uppercase tracking-widest text-steel">Open on</h2>
	<span class="text-xs text-steel">{LANDING_TABS.find((tab) => tab.key === saved)?.label}</span>
</div>

<div class="mt-2 grid gap-2">
	{#each LANDING_TABS as tab (tab.key)}
		<button
			type="button"
			aria-pressed={draft === tab.key}
			class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors {draft === tab.key
				? 'border-signal-ink bg-signal-wash'
				: 'border-hairline hover:border-steel'}"
			onclick={() => (draft = tab.key)}
		>
			<span>
				<span class="font-medium">{tab.label}</span>
				<span class="block text-sm text-steel">{tab.description}</span>
			</span>
			{#if draft === tab.key}<span aria-hidden="true">✓</span>{/if}
		</button>
	{/each}
</div>

<p class="mt-4 text-sm text-steel">
	This is the tab you see when the app opens. Every tab stays one tap away in the nav.
</p>

<SettingsSaveBar {dirty} onSave={save} onDiscard={discard} />

<SettingsDraftGuard {dirty} onDiscard={discard} />

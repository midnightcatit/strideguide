<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import SettingsSaveBar from '$lib/components/SettingsSaveBar.svelte';
	import SettingsDraftGuard from '$lib/components/SettingsDraftGuard.svelte';
	import { applyTheme, getTheme, type Theme } from '$lib/theme';

	const OPTIONS: { v: Theme; l: string; d: string }[] = [
		{ v: 'system', l: 'System', d: 'Follow your device setting' },
		{ v: 'light', l: 'Light', d: 'Always light' },
		{ v: 'dark', l: 'Dark', d: 'Always dark' },
	];

	// The choice edits a draft and the theme only changes on save, so a tap that
	// is never saved leaves the app as it was. Discard puts the draft back.
	let draft = $state<Theme>(getTheme());
	let saved = $state<Theme>(getTheme());
	const dirty = $derived(draft !== saved);
	const savedLabel = $derived(OPTIONS.find((o) => o.v === saved)?.l ?? 'System');

	function discard() {
		draft = saved;
	}

	function save() {
		applyTheme(draft);
		saved = draft;
	}
</script>

<SettingsHeader title="Appearance" />

<div class="flex items-baseline justify-between gap-3">
	<h2 class="tabular text-xs uppercase tracking-widest text-steel">Theme</h2>
	<span class="text-xs text-steel">{savedLabel}</span>
</div>

<div class="mt-2 grid gap-2">
	{#each OPTIONS as opt (opt.v)}
		<button
			type="button"
			aria-pressed={draft === opt.v}
			onclick={() => (draft = opt.v)}
			class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors {draft === opt.v
				? 'border-signal-ink bg-signal-wash'
				: 'border-hairline hover:border-steel'}"
		>
			<span>
				<span class="font-medium">{opt.l}</span>
				<span class="block text-sm text-steel">{opt.d}</span>
			</span>
			{#if draft === opt.v}<span class="text-signal-ink" aria-hidden="true">✓</span>{/if}
		</button>
	{/each}
</div>

<SettingsSaveBar {dirty} onSave={save} onDiscard={discard} />

<SettingsDraftGuard {dirty} onDiscard={discard} />

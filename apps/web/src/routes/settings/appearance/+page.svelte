<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import { applyTheme, getTheme, type Theme } from '$lib/theme';

	const OPTIONS: { v: Theme; l: string; d: string }[] = [
		{ v: 'system', l: 'System', d: 'Follow your device setting' },
		{ v: 'light', l: 'Light', d: 'Always light' },
		{ v: 'dark', l: 'Dark', d: 'Always dark' },
	];
	let theme = $state<Theme>(getTheme());
	function choose(t: Theme) {
		theme = t;
		applyTheme(t);
	}
</script>

<SettingsHeader title="Appearance" />

<div class="grid gap-2">
	{#each OPTIONS as opt (opt.v)}
		<button
			type="button"
			aria-pressed={theme === opt.v}
			onclick={() => choose(opt.v)}
			class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors {theme === opt.v
				? 'border-signal-ink bg-signal-wash'
				: 'border-hairline hover:border-steel'}"
		>
			<span>
				<span class="font-medium">{opt.l}</span>
				<span class="block text-sm text-steel">{opt.d}</span>
			</span>
			{#if theme === opt.v}<span class="text-signal-ink" aria-hidden="true">✓</span>{/if}
		</button>
	{/each}
</div>

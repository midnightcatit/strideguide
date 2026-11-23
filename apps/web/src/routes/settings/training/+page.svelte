<script lang="ts">
	import SettingsHeader from '$lib/components/SettingsHeader.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import { prefs, setAutoAdvance, setCountdownSec, setUnits, setWeekStart } from '$lib/prefs.svelte';
	import type { Units } from '@strideguide/shared/units';

	const countdown = $derived(prefs.countdownSec ?? 5);
	const autoNext = $derived(prefs.autoAdvance ?? true);

	function bump(d: number) {
		void setCountdownSec(countdown + d);
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
		<h2 class="tabular text-xs uppercase tracking-widest text-steel">Plan</h2>
		<a href="/onboarding" class="mt-2 block rounded-md border border-hairline px-4 py-2.5 text-sm hover:border-signal hover:text-signal-ink">
			Rebuild plan
		</a>
		<p class="mt-2 text-xs text-steel">Builds a fresh plan from your goal and current race paces.</p>
	</div>
</section>

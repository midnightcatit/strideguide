<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type GeneratePlanInput } from '$lib/api';
	import { DAY_INITIALS } from '$lib/plan';

	interface ProfileLite {
		slug: string;
		name: string;
		description: string;
		requiredInputs: string[];
	}

	let profiles = $state<ProfileLite[]>([]);
	let slug = $state('half-marathon');
	let targetDate = $state('');
	let experience = $state<'beginner' | 'intermediate' | 'advanced'>('beginner');
	let weeklyKm = $state<string>('');
	let fiveK = $state('');
	let tenK = $state('');
	let days = $state<number[]>([0, 2, 4, 6]);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const selected = $derived(profiles.find((p) => p.slug === slug));
	const needsRaceDate = $derived(slug !== 'whole-fitness');

	onMount(async () => {
		try {
			const res = await api.profiles();
			profiles = res.profiles;
		} catch {
			error = 'Could not load goal profiles.';
		}
	});

	function toggleDay(d: number) {
		days = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b);
	}

	async function submit() {
		if (needsRaceDate && !targetDate) {
			error = 'Pick a race date.';
			return;
		}
		if (days.length === 0) {
			error = 'Choose at least one training day.';
			return;
		}
		submitting = true;
		error = null;
		const recentTimes: Record<string, string> = {};
		if (fiveK.trim()) recentTimes['5k'] = fiveK.trim();
		if (tenK.trim()) recentTimes['10k'] = tenK.trim();
		const body: GeneratePlanInput = {
			goalProfileSlug: slug,
			availableDays: days,
			baseline: {
				experience,
				...(Object.keys(recentTimes).length ? { recentTimes } : {}),
				...(weeklyKm.trim() ? { weeklyKm: Number(weeklyKm) } : {}),
			},
			...(needsRaceDate && targetDate ? { targetDate } : {}),
		};
		try {
			await api.generatePlan(body);
			window.location.href = '/';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not generate the plan.';
			submitting = false;
		}
	}
</script>

<section class="mx-auto max-w-xl">
	<p class="text-xs uppercase tracking-widest text-steel">New plan</p>
	<h1 class="font-display mt-1 text-2xl font-bold">Set up your training</h1>

	<!-- Goal profile -->
	<fieldset class="mt-6">
		<legend class="text-xs uppercase tracking-widest text-steel">Goal</legend>
		<div class="mt-3 grid gap-2">
			{#each profiles as p (p.slug)}
				<label
					class="flex cursor-pointer flex-col rounded-lg border px-4 py-3 transition-colors {slug ===
					p.slug
						? 'border-signal bg-signal-wash'
						: 'border-hairline hover:border-steel'}"
				>
					<input type="radio" name="profile" value={p.slug} bind:group={slug} class="sr-only" />
					<span class="font-display font-medium">{p.name}</span>
					<span class="mt-0.5 text-sm text-steel">{p.description}</span>
				</label>
			{/each}
		</div>
	</fieldset>

	{#if needsRaceDate}
		<div class="mt-6">
			<label for="race" class="text-xs uppercase tracking-widest text-steel">Race date</label>
			<input
				id="race"
				type="date"
				bind:value={targetDate}
				class="tabular mt-2 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
			/>
		</div>
	{/if}

	<!-- Baseline -->
	<fieldset class="mt-6">
		<legend class="text-xs uppercase tracking-widest text-steel">Baseline (optional)</legend>
		<div class="mt-3 grid grid-cols-2 gap-3">
			<div>
				<label for="5k" class="text-xs text-steel">Recent 5K (mm:ss)</label>
				<input
					id="5k"
					bind:value={fiveK}
					placeholder="22:00"
					class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
				/>
			</div>
			<div>
				<label for="10k" class="text-xs text-steel">Recent 10K (mm:ss)</label>
				<input
					id="10k"
					bind:value={tenK}
					placeholder="45:00"
					class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
				/>
			</div>
			<div>
				<label for="km" class="text-xs text-steel">Typical weekly km</label>
				<input
					id="km"
					type="number"
					bind:value={weeklyKm}
					placeholder="25"
					class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
				/>
			</div>
			<div>
				<label for="exp" class="text-xs text-steel">Experience</label>
				<select
					id="exp"
					bind:value={experience}
					class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm"
				>
					<option value="beginner">Beginner</option>
					<option value="intermediate">Intermediate</option>
					<option value="advanced">Advanced</option>
				</select>
			</div>
		</div>
	</fieldset>

	<!-- Available days -->
	<fieldset class="mt-6">
		<legend class="text-xs uppercase tracking-widest text-steel">Training days</legend>
		<div class="mt-3 flex justify-between gap-1">
			{#each DAY_INITIALS as initial, d (d)}
				<button
					type="button"
					aria-pressed={days.includes(d)}
					onclick={() => toggleDay(d)}
					class="flex h-11 flex-1 items-center justify-center rounded-md text-sm tabular transition-colors {days.includes(
						d,
					)
						? 'bg-ink text-paper font-bold'
						: 'border border-hairline text-steel hover:border-steel'}"
				>
					{initial}
				</button>
			{/each}
		</div>
	</fieldset>

	{#if error}
		<p class="mt-4 text-sm text-signal-ink">{error}</p>
	{/if}

	<button
		type="button"
		onclick={submit}
		disabled={submitting}
		class="mt-8 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
	>
		{submitting ? 'Generating…' : `Generate my ${selected?.name ?? ''} plan`}
	</button>
</section>

<script lang="ts">
	import { onMount } from 'svelte';
	import { parseTime, pacesFromVdot, vdotFromRace } from '@strideguide/shared/plan';
	import { milesToKm } from '@strideguide/shared/units';
	import { api, type GeneratePlanInput } from '$lib/api';
	import { prefs, distanceUnit, fmtPace, fmtPaceBand } from '$lib/prefs.svelte';
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
	let weeklyKm = $state('');
	let days = $state<number[]>([0, 2, 4, 6]);
	let submitting = $state(false);
	let generating = $state(false);
	let stage = $state(0);
	let stageTimer: ReturnType<typeof setInterval> | undefined;
	const STAGES = [
		'Writing your weeks',
		'Balancing running and strength',
		'Adding the reasons behind each session',
		'Finishing your plan',
	];
	let error = $state<string | null>(null);

	// Race anchor (M4d): a recent race time drives training paces.
	const RACE_DISTANCES: { key: string; label: string; meters: number }[] = [
		{ key: '5k', label: '5K', meters: 5000 },
		{ key: '10k', label: '10K', meters: 10000 },
		{ key: 'half', label: 'Half marathon', meters: 21097.5 },
	];
	let raceKey = $state('10k');
	let raceTime = $state('');

	const selected = $derived(profiles.find((p) => p.slug === slug));
	const needsRaceDate = $derived(slug !== 'whole-fitness');

	const vdot = $derived.by(() => {
		const dist = RACE_DISTANCES.find((d) => d.key === raceKey);
		const secs = parseTime(raceTime);
		if (!dist || !secs || secs <= 0) return undefined;
		return vdotFromRace(dist.meters, secs);
	});
	const paces = $derived(vdot ? pacesFromVdot(vdot) : undefined);
	const goalPace = $derived.by(() => {
		if (!paces) return undefined;
		switch (slug) {
			case 'marathon':
				return paces.marathon;
			case 'half-marathon':
				return (paces.marathon + paces.threshold) / 2;
			case '10k':
				return paces.threshold;
			case '5k':
				return (paces.threshold + paces.interval) / 2;
			default:
				return paces.threshold;
		}
	});

	onMount(async () => {
		try {
			profiles = (await api.profiles()).profiles;
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
		generating = true;
		stage = 0;
		stageTimer = setInterval(() => {
			stage = Math.min(STAGES.length - 1, stage + 1);
		}, 2200);

		const recentTimes =
			vdot && raceTime.trim() && RACE_DISTANCES.some((d) => d.key === raceKey)
				? { [raceKey]: raceTime.trim() }
				: undefined;

		const body: GeneratePlanInput = {
			goalProfileSlug: slug,
			availableDays: days,
			baseline: {
				experience,
				...(recentTimes ? { recentTimes } : {}),
				...(weeklyKm.trim()
					? {
							weeklyKm:
								prefs.units === 'imperial'
									? Math.round(milesToKm(Number(weeklyKm)) * 10) / 10
									: Number(weeklyKm),
						}
					: {}),
			},
			...(needsRaceDate && targetDate ? { targetDate } : {}),
		};
		try {
			await Promise.race([
				api.generatePlan(body),
				new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
			]);
			window.location.href = '/';
		} catch (e) {
			error =
				e instanceof Error && e.message === 'timeout'
					? 'That took longer than expected. Your answers are still here, so give it another go.'
					: 'We could not build the plan just now. Try again.';
			generating = false;
		} finally {
			if (stageTimer) clearInterval(stageTimer);
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
					class="flex cursor-pointer flex-col rounded-lg border px-4 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-signal-ink {slug === p.slug
						? 'border-signal-ink bg-signal-wash'
						: 'border-hairline hover:border-steel'}"
				>
					<input type="radio" name="profile" value={p.slug} bind:group={slug} class="sr-only" />
					<span class="font-display font-medium">{p.name}</span>
					<span class="mt-0.5 text-sm text-steel">{p.description}</span>
				</label>
			{/each}
		</div>
	</fieldset>

	<!-- Race anchor -->
	<fieldset class="mt-6">
		<legend class="text-xs uppercase tracking-widest text-steel">Recent race (sets your paces)</legend>
		<div class="mt-3 flex gap-2">
			<select
				bind:value={raceKey}
				aria-label="Race distance"
				class="tabular max-w-[45%] shrink-0 rounded-md border border-hairline-strong bg-paper px-3 py-2 text-sm"
			>
				{#each RACE_DISTANCES as d (d.key)}
					<option value={d.key}>{d.label}</option>
				{/each}
			</select>
			<input
				bind:value={raceTime}
				placeholder="45:00"
				inputmode="numeric"
				aria-label="Race time (mm:ss)"
				class="tabular min-w-0 flex-1 rounded-md border border-hairline-strong bg-paper px-3 py-2 text-sm"
			/>
		</div>

		{#if paces && goalPace}
			<div class="mt-3 rounded-lg border border-hairline p-3">
				<p class="text-xs uppercase tracking-widest text-steel">Your training paces</p>
				<ul class="mt-2 space-y-1 text-sm">
					<li class="flex justify-between"><span>Easy</span><span class="tabular">{fmtPaceBand(paces.easy)}</span></li>
					<li class="flex justify-between"><span>Threshold</span><span class="tabular">{fmtPace(paces.threshold)}</span></li>
					<li class="flex justify-between"><span>Interval</span><span class="tabular">{fmtPace(paces.interval)}</span></li>
					<li class="flex justify-between text-signal-ink"><span>Goal pace</span><span class="tabular">{fmtPace(goalPace)}</span></li>
				</ul>
				<p class="mt-2 text-xs text-steel">Estimated from your {RACE_DISTANCES.find((d) => d.key === raceKey)?.label} in {raceTime} (VDOT {Math.round(vdot!)}).</p>
			</div>
		{:else}
			<p class="mt-2 text-xs text-steel">
				Optional. Without a recent race, we'll estimate paces from your experience, and recalibrate after your first runs.
			</p>
		{/if}
	</fieldset>

	{#if needsRaceDate}
		<div class="mt-6">
			<label for="race" class="text-xs uppercase tracking-widest text-steel">Race date</label>
			<input id="race" type="date" bind:value={targetDate} class="tabular mt-2 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm" />
		</div>
	{/if}

	<!-- Current training -->
	<fieldset class="mt-6">
		<legend class="text-xs uppercase tracking-widest text-steel">Current training</legend>
		<div class="mt-3 grid grid-cols-2 gap-3">
			<div>
				<label for="km" class="text-xs text-steel">Typical weekly {distanceUnit()}</label>
				<input id="km" type="number" bind:value={weeklyKm} placeholder="25" class="tabular mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm" />
			</div>
			<div>
				<label for="exp" class="text-xs text-steel">Experience</label>
				<select id="exp" bind:value={experience} class="mt-1 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm">
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
					class="flex h-11 flex-1 items-center justify-center rounded-md text-sm tabular transition-colors {days.includes(d)
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

{#if generating}
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-paper/95 px-6 text-center backdrop-blur">
		<span class="breathe h-3 w-3 rounded-full bg-signal-ink" aria-hidden="true"></span>
		<div role="status" aria-live="polite">
			<p class="font-display text-lg font-medium">{STAGES[stage]}…</p>
			<p class="mt-1 text-sm text-steel">This usually takes a few seconds.</p>
		</div>
	</div>
{/if}

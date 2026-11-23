<script lang="ts">
	import { onMount } from 'svelte';
	import { parseTime, pacesFromVdot, vdotFromRace } from '@strideguide/shared/plan';
	import { milesToKm } from '@strideguide/shared/units';
	import { api, type GeneratePlanInput } from '$lib/api';
	import { reportClientError } from '$lib/clientErrors';
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
	let notes = $state('');

	let stepIndex = $state(0);
	let dir = $state<1 | -1>(1);
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

	interface Step {
		id: string;
		title: string;
		lede: string;
		guide: string[];
	}

	// One question per screen. Guides are plain-English, and where we can we give
	// ranges so the choice is easy: what is typical, what is better, what is a lot.
	const steps = $derived.by<Step[]>(() => {
		const out: Step[] = [
			{
				id: 'goal',
				title: 'What are you training for?',
				lede: 'Your goal decides the shape of the plan: how much easy running, how much quality, and how much strength work sits alongside it. Everything else is built backwards from here.',
				guide: [
					'Race goals (5K to marathon) lean on easy running, with one or two harder sessions a week.',
					'General fitness spreads effort across running, strength and mobility instead of chasing a time.',
					'Pick the one you are actually training for, not the one that sounds best.',
				],
			},
		];
		if (needsRaceDate) {
			out.push({
				id: 'date',
				title: 'When is your race?',
				lede: 'We count backwards from race day to set the length of each block: a long base, a build, a short peak, then a taper. A far-off date just means a longer base.',
				guide: [
					'Most plans want 10 to 20 weeks. Under 8 weeks is a compressed build.',
					'If you are unsure, pick the date you are aiming for. You can rebuild later.',
				],
			});
		}
		out.push(
			{
				id: 'race',
				title: 'How fit are you right now?',
				lede: 'A recent race or time trial is the most accurate way to set your training paces, so easy days stay easy and hard days stay honest. It is a starting point, not a target you have to beat.',
				guide: [
					'Any recent hard effort works: a race, a parkrun, or a solo time trial.',
					'No recent effort? Skip it. We will estimate from your weekly volume and adjust after your first runs.',
				],
			},
			{
				id: 'experience',
				title: 'How long have you been running?',
				lede: 'This sets your starting weekly volume when you do not give one, and how quickly the plan builds.',
				guide: [
					'Match your last two months, not your best ever.',
					'Beginner: new to running, or back after a long break, often 15 to 25 km a week.',
					'Intermediate: running consistently for a year or more, 25 to 50 km a week.',
					'Advanced: years of steady training, 50 km a week or more.',
				],
			},
			{
				id: 'volume',
				title: 'What does a normal week look like?',
				lede: `Your typical weekly distance in ${distanceUnit()}. This is where the plan starts and how fast it builds.`,
				guide: [
					'Use a normal recent week, not your biggest ever.',
					'The plan builds gradually, around 10 percent a week, with a lighter week every fourth week.',
					'Starting honest is the single best way to stay injury-free.',
				],
			},
			{
				id: 'days',
				title: 'Which days can you train?',
				lede: 'The plan puts its long run on your last chosen day and spreads the harder sessions and strength work around it.',
				guide: [
					'Three or four days is enough to make progress.',
					'Keep quality days apart, and put strength after an easy run or on a rest day.',
					'Fewer days is fine. The plan scales to what you can do.',
				],
			},
			{
				id: 'notes',
				title: 'Anything your coach should know?',
				lede: 'This goes straight into the prompt that writes your plan, so write it as a note to a coach.',
				guide: [
					'For example: a hilly course, only dumbbells at home, a day you want kept free.',
					'Leave it blank if there is nothing to add.',
				],
			},
		);
		return out;
	});

	const step = $derived(steps[Math.min(stepIndex, steps.length - 1)]);
	const isLast = $derived(stepIndex >= steps.length - 1);
	const progress = $derived((Math.min(stepIndex, steps.length - 1) + 1) / steps.length);

	const EXPERIENCE: { v: 'beginner' | 'intermediate' | 'advanced'; name: string; range: string; note: string }[] = [
		{ v: 'beginner', name: 'Beginner', range: '15 to 25 km a week', note: 'New to running, or back after a long break.' },
		{ v: 'intermediate', name: 'Intermediate', range: '25 to 50 km a week', note: 'Running consistently for a year or more.' },
		{ v: 'advanced', name: 'Advanced', range: '50 km a week or more', note: 'Years of steady, structured training.' },
	];

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

	function validate(): boolean {
		if (step.id === 'date' && !targetDate) {
			error = 'Pick a race date.';
			return false;
		}
		if (step.id === 'days' && days.length === 0) {
			error = 'Choose at least one training day.';
			return false;
		}
		error = null;
		return true;
	}

	function next() {
		if (!validate()) return;
		dir = 1;
		stepIndex = Math.min(steps.length - 1, stepIndex + 1);
	}
	function back() {
		error = null;
		dir = -1;
		stepIndex = Math.max(0, stepIndex - 1);
	}

	async function submit() {
		if (!validate()) return;
		submitting = true;
		error = null;
		generating = true;
		stage = 0;
		try {
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
					...(notes.trim() ? { notes: notes.trim() } : {}),
				},
				...(needsRaceDate && targetDate ? { targetDate } : {}),
			};

			await Promise.race([
				api.generatePlan(body),
				new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
			]);
			window.location.href = '/';
		} catch (e) {
			const timedOut = e instanceof Error && e.message === 'timeout';
			error = timedOut
				? 'That took longer than expected. Your answers are still here, so give it another go.'
				: 'We could not build the plan just now. Try again.';
			reportClientError('generate-failed', timedOut ? 'timeout' : String(e), e);
			// Always re-enable the button, so a failed attempt is never a dead end.
			generating = false;
			submitting = false;
		} finally {
			if (stageTimer) {
				clearInterval(stageTimer);
				stageTimer = undefined;
			}
		}
	}
</script>

<section class="mx-auto max-w-xl">
	<header>
		<div class="flex items-center justify-between gap-3">
			<p class="tabular text-xs uppercase tracking-widest text-steel">
				Step {Math.min(stepIndex, steps.length - 1) + 1} of {steps.length}
			</p>
			<p class="tabular text-xs text-steel">{Math.round(progress * 100)}%</p>
		</div>
		<div class="mt-2 h-1 w-full overflow-hidden rounded-full bg-hairline">
			<div class="h-full rounded-full bg-signal-ink transition-[width] duration-500 ease-out" style="width: {progress * 100}%"></div>
		</div>
	</header>

	{#key step.id}
		<div class={dir === 1 ? 'sg-enter-right' : 'sg-enter-left'}>
			<h1 class="font-display mt-6 text-2xl font-bold">{step.title}</h1>
			<p class="mt-2 text-sm leading-relaxed text-steel">{step.lede}</p>

			<div class="mt-5">
				{#if step.id === 'goal'}
					<div class="grid gap-2">
						{#each profiles as p (p.slug)}
							<button
								type="button"
								aria-pressed={slug === p.slug}
								onclick={() => (slug = p.slug)}
								class="flex flex-col rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {slug === p.slug
									? 'border-signal-ink bg-signal-wash'
									: 'border-hairline hover:border-steel'}"
							>
								<span class="font-display font-medium">{p.name}</span>
								<span class="mt-0.5 text-sm text-steel">{p.description}</span>
							</button>
						{/each}
					</div>
				{:else if step.id === 'date'}
					<input
						type="date"
						bind:value={targetDate}
						aria-label="Race date"
						class="tabular w-full rounded-xl border border-hairline bg-paper px-4 py-3 text-sm"
					/>
				{:else if step.id === 'race'}
					<div class="flex gap-2">
						<select
							bind:value={raceKey}
							aria-label="Race distance"
							class="tabular max-w-[45%] shrink-0 rounded-xl border border-hairline-strong bg-paper px-3 py-3 text-sm"
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
							class="tabular min-w-0 flex-1 rounded-xl border border-hairline-strong bg-paper px-4 py-3 text-sm"
						/>
					</div>
					{#if paces && goalPace}
						<div class="mt-3 rounded-xl border border-hairline p-4">
							<p class="text-xs uppercase tracking-widest text-steel">Your training paces</p>
							<ul class="mt-2 space-y-1 text-sm">
								<li class="flex justify-between"><span>Easy</span><span class="tabular">{fmtPaceBand(paces.easy)}</span></li>
								<li class="flex justify-between"><span>Threshold</span><span class="tabular">{fmtPace(paces.threshold)}</span></li>
								<li class="flex justify-between"><span>Interval</span><span class="tabular">{fmtPace(paces.interval)}</span></li>
								<li class="flex justify-between text-signal-ink"><span>Goal pace</span><span class="tabular">{fmtPace(goalPace)}</span></li>
							</ul>
							<p class="mt-2 text-xs text-steel">
								From your {RACE_DISTANCES.find((d) => d.key === raceKey)?.label} in {raceTime} (VDOT {Math.round(vdot!)}).
							</p>
						</div>
					{/if}
				{:else if step.id === 'experience'}
					<div class="grid gap-2">
						{#each EXPERIENCE as opt (opt.v)}
							<button
								type="button"
								aria-pressed={experience === opt.v}
								onclick={() => (experience = opt.v)}
								class="flex flex-col rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {experience === opt.v
									? 'border-signal-ink bg-signal-wash'
									: 'border-hairline hover:border-steel'}"
							>
								<span class="flex items-baseline justify-between gap-3">
									<span class="font-display font-medium">{opt.name}</span>
									<span class="tabular shrink-0 text-xs text-steel">{opt.range}</span>
								</span>
								<span class="mt-0.5 text-sm text-steel">{opt.note}</span>
							</button>
						{/each}
					</div>
				{:else if step.id === 'volume'}
					<div class="flex items-center gap-2">
						<input
							type="number"
							bind:value={weeklyKm}
							placeholder="25"
							aria-label="Typical weekly distance"
							class="tabular w-32 rounded-xl border border-hairline bg-paper px-4 py-3 text-sm"
						/>
						<span class="text-sm text-steel">{distanceUnit()} per week</span>
					</div>
				{:else if step.id === 'days'}
					<div class="flex justify-between gap-1">
						{#each DAY_INITIALS as initial, d (d)}
							<button
								type="button"
								aria-pressed={days.includes(d)}
								onclick={() => toggleDay(d)}
								class="tabular flex h-12 flex-1 items-center justify-center rounded-lg text-sm transition-colors {days.includes(d)
									? 'bg-ink font-bold text-paper'
									: 'border border-hairline text-steel hover:border-steel'}"
							>
								{initial}
							</button>
						{/each}
					</div>
					<p class="mt-3 text-sm text-steel">{days.length} {days.length === 1 ? 'day' : 'days'} a week.</p>
				{:else if step.id === 'notes'}
					<textarea
						bind:value={notes}
						rows="5"
						maxlength="600"
						placeholder="Anything that should shape the plan…"
						aria-label="Notes for your coach"
						class="w-full rounded-xl border border-hairline bg-paper px-4 py-3 text-sm leading-relaxed"
					></textarea>
				{/if}
			</div>

			<ul class="mt-5 space-y-1.5">
				{#each step.guide as g (g)}
					<li class="flex gap-2 text-xs leading-relaxed text-steel">
						<span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal-ink" aria-hidden="true"></span>
						<span>{g}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/key}

	{#if error}
		<p class="mt-4 text-sm text-signal-ink">{error}</p>
	{/if}

	<div class="mt-8 flex items-center gap-3">
		{#if stepIndex > 0}
			<button
				type="button"
				onclick={back}
				class="rounded-md border border-hairline-strong px-5 py-3 text-sm text-steel hover:border-signal hover:text-signal-ink"
			>
				Back
			</button>
		{/if}
		{#if isLast}
			<button
				type="button"
				onclick={submit}
				disabled={submitting}
				class="flex-1 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
			>
				{submitting ? 'Generating…' : `Build my ${selected?.name ?? ''} plan`}
			</button>
		{:else}
			<button
				type="button"
				onclick={next}
				class="flex-1 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90"
			>
				Continue
			</button>
		{/if}
	</div>
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

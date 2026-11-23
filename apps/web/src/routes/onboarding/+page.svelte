<script lang="ts">
	import { onMount } from 'svelte';
	import { VDOT_MAX, VDOT_MIN, pacesFromVdot, vdotFromRace } from '@strideguide/shared/plan';
	import TimeInput from '$lib/components/TimeInput.svelte';
	import { milesToKm } from '@strideguide/shared/units';
	import { api, type GeneratePlanInput } from '$lib/api';
	import { reportClientError } from '$lib/clientErrors';
	import { prefs, distanceUnit, fmtPace, fmtPaceBand } from '$lib/prefs.svelte';
	import { DAY_INITIALS, DAY_NAMES, type ClientSession, type CurrentPlan } from '$lib/plan';

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

	// Strength and body preferences.
	let equipment = $state<'machines' | 'bodyweight' | 'both'>('both');
	let strengthDays = $state(2);
	let sessionMinutes = $state(45);
	let flexCurrent = $state(3);
	let flexGoal = $state(4);
	let stretching = $state<'after-runs' | 'rest-days' | 'both' | 'none'>('after-runs');
	let crossTraining = $state<string[]>([]);
	let terrain = $state<'flat' | 'hilly' | 'mixed'>('mixed');
	let niggles = $state('');

	// Preview: after generation, a local, unsaved look at week one.
	let draft = $state<CurrentPlan | null>(null);
	let stretchDays = $state<Set<number>>(new Set());

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
	// Race time is held in seconds and edited with pickers, so nothing is misread.
	let raceSecs = $state(0);

	const selected = $derived(profiles.find((p) => p.slug === slug));
	const needsRaceDate = $derived(slug !== 'whole-fitness');

	const vdot = $derived.by(() => {
		const dist = RACE_DISTANCES.find((d) => d.key === raceKey);
		if (!dist || raceSecs <= 0) return undefined;
		const v = vdotFromRace(dist.meters, raceSecs);
		// Ignore an implausible time rather than set impossible paces.
		return v >= VDOT_MIN && v <= VDOT_MAX ? v : undefined;
	});
	const raceTimeLooksOff = $derived(raceSecs > 0 && !vdot);
	function fmtRace(secs: number): string {
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		const sec = secs % 60;
		return h > 0
			? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
			: `${m}:${String(sec).padStart(2, '0')}`;
	}
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
				id: 'equipment',
				title: 'What will you train strength with?',
				lede: 'Machines fix the path, so it is easy to load and progress. Bodyweight and free weights ask more of your balance and control, and sit closer to the way running works. Both is a good default.',
				guide: [
					'Machines: simple to load, easy to repeat week to week.',
					'Bodyweight: no equipment, and it trains balance and single-leg control.',
					'Both: legs from bodyweight, a machine or two for the upper body.',
				],
			},
			{
				id: 'strength',
				title: 'How should the strength work fit?',
				lede: 'Strength protects joints and supports running economy. Two sessions a week is enough; three helps if you have the time. Session length sets how many moves we include.',
				guide: [
					'Two sessions a week is the usual sweet spot for runners.',
					'30 minutes is about 5 moves, 45 about 6, 60 or more is 8.',
					'Make the lowering phase the slow part, then add load or harder variations over time.',
				],
			},
			{
				id: 'flexibility',
				title: 'How flexible are you, and where do you want to be?',
				lede: 'Rate your flexibility today and where you would like it. We build the stretching toward your goal, and only as far as helps.',
				guide: [
					'For running, more range is not always better. Train toward the range you need, then hold it.',
					'Tighter runners often gain most from gentle, regular static stretching.',
					'Long static holds before hard running can cost a little power, so we place them after.',
				],
			},
			{
				id: 'stretching',
				title: 'When do you want to stretch?',
				lede: 'Dynamic work before running and static stretching after is the usual split. We can add it where it suits you.',
				guide: [
					'After easy runs: it fits neatly into the cool-down.',
					'On rest days: a short mobility session of its own.',
					'Both, or none: your call. None keeps the plan lean.',
				],
			},
			{
				id: 'crossTraining',
				title: 'Any cross-training you can do?',
				lede: 'Low-impact aerobic work builds fitness while sparing the running legs. Useful when you are sore, or building back from a break.',
				guide: [
					'Bike, pool or rower are the usual options. Pick any you can get to.',
					'We only use it where it fits, never in place of key running.',
				],
			},
			{
				id: 'terrain',
				title: 'What do you mostly run on?',
				lede: 'Terrain shapes the harder sessions. Hills build power and economy, so on hilly ground we lean toward hill work.',
				guide: [
					'Flat: road speed work.',
					'Hilly: hill reps that build strength-endurance.',
					'Mixed: a blend. Pick this if you are not sure.',
				],
			},
			{
				id: 'niggles',
				title: 'Anything niggling or sore?',
				lede: 'Tell us what to be careful with, and we will keep it in mind when we build the plan. This is not medical advice.',
				guide: [
					'For example: a cranky Achilles, a knee that aches on downhills, a tight hamstring.',
					'If something is sharp or getting worse, see a professional first.',
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

	const EQUIPMENT: { v: 'machines' | 'bodyweight' | 'both'; name: string; note: string }[] = [
		{ v: 'machines', name: 'Machines', note: 'Fixed path, easy to load and repeat.' },
		{ v: 'bodyweight', name: 'Bodyweight', note: 'No equipment; trains balance and single-leg control.' },
		{ v: 'both', name: 'Both', note: 'Legs from bodyweight, a machine or two up top.' },
	];
	const STRETCHING: { v: 'after-runs' | 'rest-days' | 'both' | 'none'; name: string; note: string }[] = [
		{ v: 'after-runs', name: 'After easy runs', note: 'Fits into the cool-down.' },
		{ v: 'rest-days', name: 'On rest days', note: 'A short mobility session.' },
		{ v: 'both', name: 'Both', note: 'After runs and on rest days.' },
		{ v: 'none', name: 'None', note: 'Keep the plan lean.' },
	];
	const TERRAIN: { v: 'flat' | 'hilly' | 'mixed'; name: string; note: string }[] = [
		{ v: 'flat', name: 'Flat', note: 'Road speed work.' },
		{ v: 'hilly', name: 'Hilly', note: 'Hill reps for power and economy.' },
		{ v: 'mixed', name: 'Mixed', note: 'A blend. Pick this if unsure.' },
	];
	const CROSS: { v: string; name: string }[] = [
		{ v: 'bike', name: 'Bike' },
		{ v: 'pool', name: 'Pool' },
		{ v: 'rower', name: 'Rower' },
	];

	onMount(async () => {
		try {
			profiles = (await api.profiles()).profiles;
		} catch {
			error = 'Could not load goal profiles.';
		}
	});

	/** A number input binds as a number, a text input as a string; normalise both. */
	function str(v: unknown): string {
		return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
	}

	function toggleDay(d: number) {
		days = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b);
	}

	function toggleCross(v: string) {
		crossTraining = crossTraining.includes(v)
			? crossTraining.filter((x) => x !== v)
			: [...crossTraining, v];
	}

	// Preview helpers: local, unsaved edits to the first week.
	function sessionsForDay(d: number): ClientSession[] {
		return (draft?.weeks[0]?.sessions ?? []).filter((s) => s.day === d);
	}
	function shiftDay(s: ClientSession, delta: number) {
		s.day = Math.min(6, Math.max(0, s.day + delta));
	}
	function removeSession(s: ClientSession) {
		const week = draft?.weeks[0];
		if (!week) return;
		week.sessions = week.sessions.filter((x) => x.id !== s.id);
	}
	function toggleStretch(d: number) {
		const next = new Set(stretchDays);
		if (next.has(d)) next.delete(d);
		else next.add(d);
		stretchDays = next;
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

			const recentTimes = vdot ? { [raceKey]: fmtRace(raceSecs) } : undefined;

			const weeklyNum = str(weeklyKm) ? Number(str(weeklyKm)) : undefined;

			const body: GeneratePlanInput = {
				goalProfileSlug: slug,
				availableDays: days,
				baseline: {
					experience,
					equipment,
					strengthDays,
					sessionMinutes,
					flexibility: { current: flexCurrent, goal: flexGoal },
					stretching,
					terrain,
					...(crossTraining.length ? { crossTraining } : {}),
					...(str(niggles) ? { niggles: str(niggles) } : {}),
					...(recentTimes ? { recentTimes } : {}),
					...(weeklyNum != null && Number.isFinite(weeklyNum) && weeklyNum > 0
						? {
								weeklyKm:
									prefs.units === 'imperial'
										? Math.round(milesToKm(weeklyNum) * 10) / 10
										: weeklyNum,
							}
						: {}),
					...(str(notes) ? { notes: str(notes) } : {}),
				},
				...(needsRaceDate && targetDate ? { targetDate } : {}),
			};

			await Promise.race([
				api.generatePlan(body),
				new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
			]);
			// Show a preview of the first week instead of jumping straight in.
			draft = await api.currentPlan();
			generating = false;
			submitting = false;
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

{#if draft}
	<section class="mx-auto max-w-xl">
		<p class="tabular text-xs uppercase tracking-widest text-steel">Preview</p>
		<h1 class="font-display mt-1 text-2xl font-bold">Your first week</h1>
		<p class="mt-2 text-sm text-steel">Have a play with it. This is a preview, so nothing you change here is saved. Your plan is already built and waiting.</p>

		<div class="mt-5">
			{#each DAY_NAMES as name, d (d)}
				{@const daySess = sessionsForDay(d)}
				<div class="flex items-start gap-3 border-b border-hairline py-3">
					<span class="tabular w-9 shrink-0 pt-1 text-xs uppercase tracking-widest text-steel">{name.slice(0, 3)}</span>
					<div class="flex min-w-0 flex-1 flex-wrap gap-2">
						{#each daySess as s (s.id)}
							<div class="flex items-center gap-1 rounded-lg border border-hairline bg-paper px-2 py-1 text-sm">
								<span class="max-w-[10rem] truncate">{s.title ?? s.type}</span>
								<button type="button" aria-label="Move earlier" onclick={() => shiftDay(s, -1)} class="px-1 text-steel hover:text-signal-ink">‹</button>
								<button type="button" aria-label="Move later" onclick={() => shiftDay(s, 1)} class="px-1 text-steel hover:text-signal-ink">›</button>
								<button type="button" aria-label="Remove" onclick={() => removeSession(s)} class="px-1 text-steel hover:text-signal-ink">✕</button>
							</div>
						{/each}
						{#if stretchDays.has(d)}
							<span class="rounded-lg border border-dashed border-hairline px-2 py-1 text-sm text-steel">Mobility</span>
						{/if}
						<button type="button" onclick={() => toggleStretch(d)} class="rounded-lg border border-dashed border-hairline px-2 py-1 text-xs text-steel hover:border-signal hover:text-signal-ink">
							{stretchDays.has(d) ? 'Remove stretch' : '+ stretch'}
						</button>
					</div>
				</div>
			{/each}
		</div>

		<p class="mt-4 text-xs text-steel">Editing here only shows how it feels. Rebuild any time to change the plan for real.</p>

		<button type="button" onclick={() => (window.location.href = '/')} class="mt-6 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">Looks good, take me in</button>
	</section>
{:else}
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
					<select
						bind:value={raceKey}
						aria-label="Race distance"
						class="tabular w-full rounded-xl border border-hairline-strong bg-paper px-3 py-3 text-sm"
					>
						{#each RACE_DISTANCES as d (d.key)}
							<option value={d.key}>{d.label}</option>
						{/each}
					</select>
					<div class="mt-3">
						<TimeInput seconds={raceSecs} onChange={(secs) => (raceSecs = secs)} />
					</div>
					{#if raceTimeLooksOff}
						<p class="mt-2 text-xs text-warn">
							That time looks off for {RACE_DISTANCES.find((d) => d.key === raceKey)?.label}. Check the pickers, or leave them at zero if you are not sure.
						</p>
					{/if}
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
								From your {RACE_DISTANCES.find((d) => d.key === raceKey)?.label} in {fmtRace(raceSecs)} (VDOT {Math.round(vdot!)}).
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
				{:else if step.id === 'equipment'}
					<div class="grid gap-2">
						{#each EQUIPMENT as opt (opt.v)}
							<button
								type="button"
								aria-pressed={equipment === opt.v}
								onclick={() => (equipment = opt.v)}
								class="flex flex-col rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {equipment === opt.v
									? 'border-signal-ink bg-signal-wash'
									: 'border-hairline hover:border-steel'}"
							>
								<span class="font-display font-medium">{opt.name}</span>
								<span class="mt-0.5 text-sm text-steel">{opt.note}</span>
							</button>
						{/each}
					</div>
				{:else if step.id === 'strength'}
					<p class="tabular text-xs uppercase tracking-widest text-steel">Sessions a week</p>
					<div class="mt-2 flex gap-2">
						{#each [1, 2, 3] as n (n)}
							<button type="button" aria-pressed={strengthDays === n} onclick={() => (strengthDays = n)} class="tabular flex h-12 flex-1 items-center justify-center rounded-lg text-sm transition-colors {strengthDays === n ? 'bg-ink font-bold text-paper' : 'border border-hairline text-steel hover:border-steel'}">{n}</button>
						{/each}
					</div>
					<p class="tabular mt-5 text-xs uppercase tracking-widest text-steel">Session length</p>
					<div class="mt-2 flex gap-2">
						{#each [30, 45, 60] as n (n)}
							<button type="button" aria-pressed={sessionMinutes === n} onclick={() => (sessionMinutes = n)} class="tabular flex h-12 flex-1 items-center justify-center rounded-lg text-sm transition-colors {sessionMinutes === n ? 'bg-ink font-bold text-paper' : 'border border-hairline text-steel hover:border-steel'}">{n} min</button>
						{/each}
					</div>
				{:else if step.id === 'flexibility'}
					<p class="tabular text-xs uppercase tracking-widest text-steel">Flexibility today</p>
					<div class="mt-2 flex gap-2">
						{#each [1, 2, 3, 4, 5] as n (n)}
							<button type="button" aria-pressed={flexCurrent === n} onclick={() => (flexCurrent = n)} class="tabular flex h-12 flex-1 items-center justify-center rounded-lg text-sm transition-colors {flexCurrent === n ? 'bg-ink font-bold text-paper' : 'border border-hairline text-steel hover:border-steel'}">{n}</button>
						{/each}
					</div>
					<p class="mt-1 text-xs text-steel">1 is tight, 5 is very flexible.</p>
					<p class="tabular mt-5 text-xs uppercase tracking-widest text-steel">Goal flexibility</p>
					<div class="mt-2 flex gap-2">
						{#each [1, 2, 3, 4, 5] as n (n)}
							<button type="button" aria-pressed={flexGoal === n} onclick={() => (flexGoal = n)} class="tabular flex h-12 flex-1 items-center justify-center rounded-lg text-sm transition-colors {flexGoal === n ? 'bg-ink font-bold text-paper' : 'border border-hairline text-steel hover:border-steel'}">{n}</button>
						{/each}
					</div>
				{:else if step.id === 'stretching'}
					<div class="grid gap-2">
						{#each STRETCHING as opt (opt.v)}
							<button type="button" aria-pressed={stretching === opt.v} onclick={() => (stretching = opt.v)} class="flex flex-col rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {stretching === opt.v ? 'border-signal-ink bg-signal-wash' : 'border-hairline hover:border-steel'}">
								<span class="font-display font-medium">{opt.name}</span>
								<span class="mt-0.5 text-sm text-steel">{opt.note}</span>
							</button>
						{/each}
					</div>
				{:else if step.id === 'crossTraining'}
					<div class="flex flex-wrap gap-2">
						{#each CROSS as opt (opt.v)}
							<button type="button" aria-pressed={crossTraining.includes(opt.v)} onclick={() => toggleCross(opt.v)} class="rounded-xl border px-4 py-3 text-sm transition-colors {crossTraining.includes(opt.v) ? 'border-signal-ink bg-signal-wash font-medium' : 'border-hairline text-steel hover:border-steel'}">{opt.name}</button>
						{/each}
					</div>
					<p class="mt-3 text-sm text-steel">{crossTraining.length ? `You can cross-train: ${crossTraining.join(', ')}.` : 'None selected. That is fine.'}</p>
				{:else if step.id === 'terrain'}
					<div class="grid gap-2">
						{#each TERRAIN as opt (opt.v)}
							<button type="button" aria-pressed={terrain === opt.v} onclick={() => (terrain = opt.v)} class="flex flex-col rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {terrain === opt.v ? 'border-signal-ink bg-signal-wash' : 'border-hairline hover:border-steel'}">
								<span class="font-display font-medium">{opt.name}</span>
								<span class="mt-0.5 text-sm text-steel">{opt.note}</span>
							</button>
						{/each}
					</div>
				{:else if step.id === 'niggles'}
					<textarea
						bind:value={niggles}
						rows="3"
						maxlength="400"
						placeholder="For example: a cranky Achilles, a knee that aches on downhills…"
						aria-label="Niggles or injuries"
						class="w-full rounded-xl border border-hairline bg-paper px-4 py-3 text-sm leading-relaxed"
					></textarea>
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
{/if}

{#if generating}
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-paper/95 px-6 text-center backdrop-blur">
		<span class="breathe h-3 w-3 rounded-full bg-signal-ink" aria-hidden="true"></span>
		<div role="status" aria-live="polite">
			<p class="font-display text-lg font-medium">{STAGES[stage]}…</p>
			<p class="mt-1 text-sm text-steel">This usually takes a few seconds.</p>
		</div>
	</div>
{/if}

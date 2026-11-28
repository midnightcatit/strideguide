<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { VDOT_MAX, VDOT_MIN, pacesFromVdot, vdotFromRace } from '@strideguide/shared/plan';
	import TimeInput from '$lib/components/TimeInput.svelte';
	import ScheduleGrid from '$lib/components/ScheduleGrid.svelte';
	import FavoritePicker from '$lib/components/FavoritePicker.svelte';
	import WorkoutComposer from '$lib/components/WorkoutComposer.svelte';
	import WorkoutFilter from '$lib/components/WorkoutFilter.svelte';
	import { recommendSessionMinutes, recommendStrengthDays, recommendWeeklyKm, recommendBuildPreference, GYM_PRESETS, NAMED_WORKOUTS, bodyPartsForWorkout, bodyPartsIn, matchesBodyPart, workoutLengthLabel, type BodyPart, type LibraryWorkout } from '@strideguide/shared/plan';
	import { FAVORITE_CATEGORIES, categoryForLibraryWorkout, type FavoriteCategory } from '$lib/favorite-picker';
	import { previewCategory, PREVIEW_CATEGORY_BLURB, PREVIEW_CATEGORY_LABEL } from '@strideguide/shared/plan';
	import { customWorkoutArchetype, customWorkoutNotes, customWorkoutToStructured, type ComposerContext, type CustomWorkout } from '@strideguide/shared';
	import { milesToKm, type ScheduleBlock } from '@strideguide/shared/units';
	import { api, type GeneratePlanInput, type PreviewSessionInput } from '$lib/api';
	import { reportClientError } from '$lib/clientErrors';
	import { anchor, focusTrap, modal } from '$lib/actions';
	import { dragToDay } from '$lib/actions';
	import { overlayHistory } from '$lib/overlayHistory.svelte';
	import { prefs, distanceUnit, fmtPace, fmtPaceBand, setEquipment, setEquipmentItems, setFavoriteMachines, setFavoriteWorkouts, setGymPreset, setPersonal, setSchedule, setUnits, setVitals } from '$lib/prefs.svelte';
	import { auth } from '$lib/auth.svelte';
	import { reloadPlan } from '$lib/planStore.svelte';
	import { DAY_INITIALS, DAY_NAMES, addDaysIso, dayIndexInWeek, formatIsoDay, localIso, type ClientSession, type CurrentPlan } from '$lib/plan';

	interface ProfileLite {
		slug: string;
		name: string;
		description: string;
		requiredInputs: string[];
	}

	let profiles = $state<ProfileLite[]>([]);
	let showConnectStep = $state(false);
	let slug = $state('half-marathon');
	let targetDate = $state('');
	let startChoice = $state<'today' | 'next' | 'custom'>('today');
	let customStartDate = $state('');
	let experience = $state<'beginner' | 'intermediate' | 'advanced'>('beginner');
	let weeklyKm = $state('');
	let buildPreference = $state<'ease-in' | 'steady' | 'ambitious'>('steady');
	let days = $state<number[]>([0, 2, 4, 6]);
	// The free windows the runner blocks out on those days, in local time. Plain
	// prefs data, saved with the rest; the plan fits sessions inside them later.
	let schedule = $state<ScheduleBlock[]>([]);
	let notes = $state('');

	// Personal details, asked first. The birth year drives the plan (see the
	// engine's age bands), so we ask for the year itself and it stays right as
	// the years pass. The name is only used in the app. Vitals are optional.
	let firstName = $state('');
	const currentYear = new Date().getUTCFullYear();
	// Recent birth years, newest first, down to 1900. Age 10 is the youngest we
	// allow, matching the settings range.
	const birthYears = Array.from(
		{ length: currentYear - 10 - 1900 + 1 },
		(_, i) => currentYear - 10 - i,
	);
	// A fixed default so the picker is never blank before the runner chooses.
	let birthYear = $state(1998);
	let heightInput = $state('');
	let weightInput = $state('');
	let restingHrInput = $state('');

	const age = $derived(currentYear - birthYear);

	// Strength and body preferences.
	let equipment = $state<
		| 'machines'
		| 'bodyweight'
		| 'bodyweight-dumbbells'
		| 'dumbbells'
		| 'barbell'
		| 'kettlebell'
		| 'bands'
		| 'both'
		| 'full-gym'
	>('both');
	let equipmentItems = $state<('machines' | 'dumbbells' | 'barbell' | 'kettlebell' | 'bands')[]>([]);
	let gymPreset = $state<string | undefined>(undefined);
	// Machines and workouts the runner would rather train. A soft preference the
	// plan reaches for when it fits; it is stored in prefs and read at generation.
	let favoriteMachines = $state<string[]>([]);
	let favoriteWorkouts = $state<string[]>([]);
	let strengthDays = $state(2);
	let sessionMinutes = $state(45);
	let tunedStrength = $state(false);
	let tunedMinutes = $state(false);
	let tunedBuild = $state(false);
	let flexCurrent = $state(3);
	let flexGoal = $state(4);
	let customActivity = $state('');
	let showMoreCross = $state(false);
	let crossSchedule = $state<Record<string, number[]>>({});
	let crossTraining = $state<string[]>([]);
	let terrain = $state<'flat' | 'hilly' | 'mixed'>('mixed');
	let niggles = $state('');

	// Preview: after generation, the first week shown for editing. Edits are saved
	// for real when the runner confirms and we rebuild the weeks ahead.
	const todayIso = localIso();

	function weekdayIndex(iso: string): number {
		const d = new Date(`${iso}T00:00:00Z`);
		return (d.getUTCDay() + 6) % 7;
	}

	function addOneMonthIso(iso: string): string {
		const d = new Date(`${iso}T00:00:00Z`);
		const day = d.getUTCDate();
		d.setUTCDate(1);
		d.setUTCMonth(d.getUTCMonth() + 1);
		const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
		d.setUTCDate(Math.min(day, lastDay));
		return d.toISOString().slice(0, 10);
	}

	function fmtShortDate(iso: string): string {
		return formatIsoDay(iso, { day: 'numeric', month: 'short' });
	}

	function weekdayNameFor(iso: string): string {
		return DAY_NAMES[weekdayIndex(iso)];
	}

	let draft = $state<CurrentPlan | null>(null);
	// The day the add action is adding to, and which step it is on: the choice
	// between a curated recipe and the composer, or the composer itself.
	let addDay = $state<string | null>(null);
	let addMode = $state<'choose' | 'compose' | null>(null);
	// The library list's own filter, so a recipe is easy to find by category,
	// body part or name. The body-part row shows only for strength and mobility.
	let libCategory = $state<FavoriteCategory | 'all'>('all');
	let libPart = $state<BodyPart | 'all'>('all');
	let libQ = $state('');
	const libCategoryOptions: { key: FavoriteCategory | 'all'; label: string }[] = [
		{ key: 'all', label: 'All' },
		...FAVORITE_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
	];
	const libTokens = $derived(
		libQ
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 0),
	);
	const showLibParts = $derived(libCategory === 'strength' || libCategory === 'mobility');
	const activeLibPart = $derived(showLibParts ? libPart : 'all');
	/** The recipes the category chip and the search let through, before the body part. */
	const libCategoryMatched = $derived(
		NAMED_WORKOUTS.filter(
			(w) =>
				(libCategory === 'all' || categoryForLibraryWorkout(w) === libCategory) &&
				libTokens.every((t) => `${w.title} ${w.summary}`.toLowerCase().includes(t)),
		),
	);
	const libParts = $derived(bodyPartsIn(libCategoryMatched));
	const shownLibrary = $derived(
		libCategoryMatched.filter((w) => matchesBodyPart(bodyPartsForWorkout(w), activeLibPart)),
	);
	// The runner's own context, so the composer's preset fits their answers.
	const composerContext = $derived<ComposerContext>({
		sessionMinutes,
		equipment,
		equipmentItems,
		level: experience,
		favoriteMachines,
	});
	// The tile whose category blurb is open, with the tile element to anchor to.
	// The preview never opens the full session detail from here; a tap explains
	// the category and the session page keeps the drill-in.
	let previewInfo = $state<{ id: string; anchor: HTMLElement } | null>(null);

	// The preview keeps the add sheet and the category popover as overlays here,
	// so the in-progress onboarding answers stay put. Back closes the top one
	// instead of leaving the flow.
	function closeAdd() {
		addMode = null;
		addDay = null;
	}
	overlayHistory(
		() => !!(addMode || previewInfo),
		() => {
			if (previewInfo) previewInfo = null;
			else closeAdd();
		},
	);
	// True once the weeks ahead have been rebuilt from the edited week one. When
	// there is a connector to offer, this shows the connect screen; otherwise the
	// flow goes straight to the completion state.
	let rebuilt = $state(false);
	// True once the plan is done and the runner is on the completion state. The
	// tab stays here, whether they connect, skip or return from Google.
	let done = $state(false);
	// Set while the completion screen plays its exit before the app opens.
	let leaving = $state(false);
	let rebuilding = $state(false);
	// What the preview rebuild said about the edited week one, if anything. The
	// rebuild only runs once the week is confirmed, so the note shows on the
	// screens the runner lands on after it.
	let rebuildWarnings = $state<string[]>([]);

	let stepIndex = $state(0);
	let dir = $state<1 | -1>(1);
	// The current step's heading, so each move can send focus to the top of the
	// new question instead of leaving it part way down the old one.
	let stepHeading = $state<HTMLElement | null>(null);
	let submitting = $state(false);
	let generating = $state(false);
	// A stable id, so the build overlay can be labelled for assistive tech. The
	// same overlay covers both long waits: the first build and the preview rebuild.
	const buildTitleId = `build-title-${crypto.randomUUID()}`;

	// While the plan builds or the preview rebuilds, the page behind the overlay is
	// not just covered: it cannot be scrolled, and the modal action holds focus
	// inside the overlay, so nothing behind it can be reached with a keyboard or a
	// screen reader.
	$effect(() => {
		if (!generating && !rebuilding) return;
		const root = document.documentElement;
		const previous = root.style.overflow;
		root.style.overflow = 'hidden';
		return () => {
			root.style.overflow = previous;
		};
	});
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
		{ key: 'mile', label: 'Mile', meters: 1609.34 },
		{ key: '5k', label: '5K', meters: 5000 },
		{ key: '10k', label: '10K', meters: 10000 },
		{ key: 'half', label: 'Half marathon', meters: 21097.5 },
		{ key: 'marathon', label: 'Marathon', meters: 42195 },
	];
	let raceKey = $state('mile');
	// Race time is held in seconds and edited with pickers, so nothing is misread.
	let raceSecs = $state(0);

	const selected = $derived(profiles.find((p) => p.slug === slug));
	const needsRaceDate = $derived(slug !== 'whole-fitness');
	// The plan review the API stored on the plan, shown in the review step.
	const planReview = $derived.by(() => {
		const params = draft?.plan?.params as { review?: unknown } | null | undefined;
		return typeof params?.review === 'string' ? params.review : '';
	});

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

	const weekStartWeekday = $derived(prefs.weekStart === 1 ? 6 : 0);
	const nextStartName = $derived(DAY_NAMES[weekStartWeekday]);
	const nextWeekStartDate = $derived.by(() => {
		const todayWeekday = weekdayIndex(todayIso);
		const delta = (weekStartWeekday - todayWeekday + 7) % 7 || 7;
		return addDaysIso(todayIso, delta);
	});
	const maxStartIso = $derived(addOneMonthIso(todayIso));
	const resolvedStartDate = $derived(
		startChoice === 'today' ? todayIso : startChoice === 'next' ? nextWeekStartDate : customStartDate || todayIso,
	);

	interface Step {
		id: string;
		title: string;
		lede: string;
		guide: string[];
	}

	// One question per screen. Guides are plain and concrete, and where we can we
	// give ranges so the choice is easy: what is typical, what is better, what is a lot.
	const steps = $derived.by<Step[]>(() => {
		const out: Step[] = [
			{
				id: 'about',
				title: 'First, a little about you',
				lede: 'Your birth year shapes the plan. It sets how much weekly volume the plan builds and how gently it climbs, because recovery changes with age. Height, weight and resting heart rate are optional and stay private.',
				guide: [
					'The birth year tunes the training. Your name is only how we greet you.',
					'Everything except the birth year is optional.',
					'We never show these details to anyone else.',
				],
			},
			{
				id: 'goal',
				title: 'What are you training for?',
				lede: 'Your goal decides the shape of the plan: how much easy running, how much quality, and how much strength work sits alongside it. Everything else is built backwards from here.',
				guide: [
					'Race goals, from 5K to marathon, lean on easy running with one or two harder sessions a week.',
					'General fitness spreads effort across running, strength and mobility instead of chasing a time.',
					'Pick the goal you are actually training for, not the one that sounds best.',
				],
			},
			{
				id: 'start',
				title: 'When should the plan start?',
				lede: 'Pick the day week one begins. Today keeps things moving. Next week buys you a few days to clear your calendar. A custom date lines the plan up with a holiday or a return from a break.',
				guide: [
					'Today is the default. Week one starts the day you finish here.',
					'Next week starts on the day your week begins, so week one runs cleanly from there.',
					'A custom date can be up to a month out. Past dates are not allowed.',
				],
			},
		];
		if (needsRaceDate) {
			out.push({
				id: 'date',
				title: 'When is your race?',
				lede: 'We count backwards from race day to set the length of each block: a long base, a build, a short peak, then a taper, with easy recovery weeks after the race. A far-off date makes every phase longer, not just the base.',
				guide: [
					'Most plans want 10 to 20 weeks. Under 8 weeks is a compressed build.',
					'Unsure? Pick the date you are aiming for. You can rebuild later.',
				],
			});
		}
		out.push(
			{
				id: 'race',
				title: 'How fit are you right now?',
				lede: 'A recent race or time trial is the best way to set your training paces, so easy days stay easy and hard days stay honest. It is a starting point, not a target you have to beat.',
				guide: [
					'Any recent hard effort works: a race, a parkrun, or a solo time trial.',
					'No recent effort? Skip it. We estimate from your weekly volume and adjust after your first runs.',
					'A slow time is fine. We use the time you give us.',
				],
			},
			{
				id: 'experience',
				title: 'How long have you been running?',
				lede: 'This sets your starting weekly volume when you do not give one, and how quickly the plan builds.',
				guide: [
					'Match the last two months, not your best ever.',
					'Each card shows a typical weekly range for that level.',
					'When in doubt pick the lower level. The plan builds from where you are.',
				],
			},
			{
				id: 'volume',
				title: 'How much do you run a week?',
				lede: `Your distance in a normal week, in ${distanceUnit()}. Week one eases in a little below it to start gently, then the plan builds from there with lighter weeks along the way. This is a starting point, not a limit.`,
				guide: [
					'Use a recent week, not your biggest ever.',
					'The plan builds gradually, around 10 percent a week, with a lighter week every fourth week.',
					'Starting honest is the best way to stay injury-free.',
				],
			},
			{
				id: 'build',
				title: 'How would you like the plan to build?',
				lede: 'Your weekly distance grows from where you are now. This sets how boldly it climbs. It changes the pace of the build, never the hard sessions or the number of days.',
				guide: [
					'Ease me in ramps up slowly and takes more step-back weeks. Good when you are new or coming back.',
					'Steady grows about 10 percent a week, the usual balance of progress and recovery.',
					'Push me climbs a little faster. Best when you have raced recently and are handling the load.',
					'You can rebuild with a different choice any time.',
				],
			},
			{
				id: 'days',
				title: 'When can you train?',
				lede: 'Pick the days you can train, then block the hours you are usually free on those days, so the plan fits sessions into the time you actually have. The plan puts its long run on your last chosen day and spreads the harder sessions and strength work around it.',
				guide: [
					'Three or four days is enough to make progress. Fewer is fine: the plan scales to what you can do.',
					'Block out each stretch of free time on those days, for example 6:00 to 7:30 before work.',
					'The windows are optional. A training day with no window is treated as any time, and a day you leave unpicked is not used.',
					'You can change both any time later in Settings, under Training.',
				],
			},
			{
				id: 'equipment',
				title: 'What will you train strength with?',
				lede: 'First pick the setup, the kind of strength work you want. Then tick what you actually have where you train. The setup decides how the circuit is built, and what you have narrows it to your kit.',
				guide: [
					'Machines fix the path, so it is easy to load and repeat week to week.',
					'Bodyweight needs no equipment and trains balance and single-leg control.',
					'Leave what you have blank to use everything the setup allows.',
				],
			},
			{
				id: 'strength',
				title: 'How should the strength work fit?',
				lede: 'Strength protects joints and supports running economy. Two sessions a week is enough. Three helps if you have the time. The daily time sets how long a session can be, and we keep one workout a day, so a run and strength never share a day.',
				guide: [
					'Two sessions a week is the sweet spot for most runners.',
					'A 30 minute session is about 5 moves, 45 minutes about 6, and an hour about 8.',
					'Make the lowering phase the slow part, then add load or harder variations over time.',
				],
			},
			{
				id: 'favorites',
				title: 'Anything you would rather train?',
				lede: 'Pick machines and workouts you enjoy. When they fit the day, the plan reaches for them first: strength sessions lean on your machines, and a mobility day names one of your workouts. Leave it blank if you have no preference.',
				guide: [
					'A favorite only applies where it fits the day, so the plan is never forced into a session that does not suit it.',
					'Pick as many or as few as you like. The plan fills the rest itself.',
				],
			},
			{
				id: 'flexibility',
				title: 'How flexible are you, and where do you want to be?',
				lede: 'Rate your flexibility today and the range you would like. Every workout starts with a dynamic warm-up and ends with gentle stretches. The gap between now and your goal sets how much mobility work we add.',
				guide: [
					'Every workout starts with a dynamic warm-up and ends with a short stretch.',
					'For running, more range is not always better. Train toward the range you need, then hold it.',
					'Tighter runners often gain the most from gentle, regular static stretching.',
					'Long static holds before hard running can cost a little power, so we place them after.',
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
				title: 'Anything sore or tight?',
				lede: 'Tell us what to be careful with and we keep it in mind when the plan is built. This is not medical advice.',
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

	const recWeekly = $derived(recommendWeeklyKm(experience, slug, prefs.units, age));
	const recStrength = $derived(recommendStrengthDays(slug));
	const recMinutes = $derived(recommendSessionMinutes());
	const recBuild = $derived(recommendBuildPreference(experience));

	// Default the strength answers to the recommendation until the user changes them.
	$effect(() => {
		if (!tunedStrength) strengthDays = recStrength.value;
		if (!tunedMinutes) sessionMinutes = recMinutes.value;
		if (!tunedBuild) buildPreference = recBuild.value;
	});

	const flexGap = $derived(Math.max(0, flexGoal - flexCurrent));
	const flexCadence = $derived.by(() => {
		if (flexGap <= 0)
			return 'You are happy with your range, so we keep a short maintenance stretch after runs.';
		if (flexGap === 1)
			return 'We add one gentle mobility session a week on a rest day, plus stretches after your runs.';
		return 'We add two mobility sessions a week on rest days, plus stretches after your runs, built toward your goal.';
	});

	const EXPERIENCE = $derived.by(() => {
		const toUnit = (km: number) =>
			prefs.units === 'imperial' ? Math.round(km / 1.609344) : km;
		const u = distanceUnit();
		return [
			{ v: 'beginner' as const, name: 'Beginner', range: `${toUnit(15)} to ${toUnit(25)} ${u} a week`, note: 'New to running, or back after a long break.' },
			{ v: 'intermediate' as const, name: 'Intermediate', range: `${toUnit(25)} to ${toUnit(50)} ${u} a week`, note: 'Running consistently for a year or more.' },
			{ v: 'advanced' as const, name: 'Advanced', range: `${toUnit(50)} ${u} a week or more`, note: 'Years of steady, structured training.' },
		];
	});

	const BUILD_PREFS: { v: 'ease-in' | 'steady' | 'ambitious'; name: string; note: string }[] = [
		{ v: 'ease-in', name: 'Ease me in', note: 'Slower ramp, and more step-back weeks.' },
		{ v: 'steady', name: 'Steady', note: 'About 10 percent a week, the usual balance.' },
		{ v: 'ambitious', name: 'Push me', note: 'A bolder climb if you are handling the load.' },
	];

	const EQUIPMENT: {
		v:
			| 'machines'
			| 'bodyweight'
			| 'bodyweight-dumbbells'
			| 'dumbbells'
			| 'barbell'
			| 'kettlebell'
			| 'bands'
			| 'both'
			| 'full-gym';
		name: string;
		note: string;
	}[] = [
		{ v: 'machines', name: 'Machines', note: 'Fixed path, easy to load and repeat.' },
		{ v: 'bodyweight', name: 'Bodyweight', note: 'No equipment; trains balance and single-leg control.' },
		{
			v: 'bodyweight-dumbbells',
			name: 'Bodyweight plus dumbbells',
			note: 'Starts bodyweight, then adds dumbbells as the plan progresses.',
		},
		{ v: 'dumbbells', name: 'Dumbbells', note: 'A pair of dumbbells, plus bodyweight.' },
		{ v: 'barbell', name: 'Barbell', note: 'Barbell and rack work for the heaviest strength.' },
		{ v: 'kettlebell', name: 'Kettlebell', note: 'Swings and single-leg work with a bell or two.' },
		{ v: 'bands', name: 'Bands and home kit', note: 'Resistance bands and a chair, for training at home.' },
		{ v: 'both', name: 'A mix', note: 'Legs from bodyweight, a machine or two up top.' },
		{ v: 'full-gym', name: 'Full gym', note: 'Machines and free weights, a broad circuit.' },
	];

	const EQUIPMENT_ITEMS: { v: 'machines' | 'dumbbells' | 'barbell' | 'kettlebell' | 'bands'; name: string }[] = [
		{ v: 'machines', name: 'Machines' },
		{ v: 'dumbbells', name: 'Dumbbells' },
		{ v: 'barbell', name: 'Barbell' },
		{ v: 'kettlebell', name: 'Kettlebell' },
		{ v: 'bands', name: 'Bands' },
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
		{ v: 'swim', name: 'Swim' },
		{ v: 'rower', name: 'Rower' },
		{ v: 'elliptical', name: 'Elliptical' },
		{ v: 'soccer', name: 'Soccer' },
		{ v: 'tennis', name: 'Tennis' },
		{ v: 'pickleball', name: 'Pickleball' },
		{ v: 'basketball', name: 'Basketball' },
		{ v: 'dance', name: 'Dance' },
		{ v: 'yoga', name: 'Yoga' },
		{ v: 'hiking', name: 'Hiking' },
		{ v: 'skiing', name: 'Skiing' },
	];
	const CROSS_PRIMARY = CROSS.slice(0, 6);
	const CROSS_MORE = CROSS.slice(6);

	onMount(async () => {
		// Returning from the health connector: the callback sends the runner back to
		// this page with connected set. Show the completion state, so the connect
		// path ends on the same screen as the skip path.
		if (page.url.searchParams.has('connected')) {
			try {
				const plan = await api.currentPlan(auth.user?.id ?? null);
				if (plan?.weeks?.length) {
					draft = plan;
					done = true;
					return;
				}
			} catch {
				// No plan to show; fall through to the normal onboarding flow.
			}
		}
		// Prefill the name from the Google sign-in, using the first word. Blank when
		// Google gave us no name.
		const googleName = auth.user?.name?.trim();
		if (googleName) firstName = googleName.split(/\s+/)[0] ?? '';
		try {
			profiles = (await api.profiles()).profiles;
		} catch {
			error = 'Could not load goal profiles.';
		}
		// Offer the connect step only when the server has the connector set up and
		// it is not already linked. Same check the Settings connections page uses.
		try {
			const res = await api.connections();
			const provider = res.providers.find((p) => p.id === 'google-health');
			showConnectStep = Boolean(provider?.configured && !provider.connected);
		} catch {
			// No connections to offer; leave the step out.
		}
	});

	/** Open the connector in a new tab, so the answers on this page are never lost.
	 * The connector returns to this page, which shows the completion state, so the
	 * runner lands on the finish screen whether they connect or skip. */
	function connectHealth() {
		window.open(api.connectionConnectUrl('google-health', '/onboarding'), '_blank', 'noopener');
	}

	/** A number input binds as a number, a text input as a string; normalise both. */
	function str(v: unknown): string {
		return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
	}

	/** Vitals in stored metric, converted from the runner's units. Null when blank or implausible. */
	function vitalsToStore(): { heightCm: number | null; weightKg: number | null; restingHr: number | null } {
		const h = Number(str(heightInput));
		const w = Number(str(weightInput));
		const hr = Number(str(restingHrInput));
		const heightCm = prefs.units === 'imperial' ? h * 2.54 : h;
		const weightKg = prefs.units === 'imperial' ? w / 2.20462 : w;
		return {
			heightCm: Number.isFinite(heightCm) && heightCm >= 120 && heightCm <= 250 ? Math.round(heightCm * 10) / 10 : null,
			weightKg: Number.isFinite(weightKg) && weightKg >= 25 && weightKg <= 300 ? Math.round(weightKg * 10) / 10 : null,
			restingHr: Number.isFinite(hr) && hr >= 30 && hr <= 120 ? Math.round(hr) : null,
		};
	}

	function toggleDay(d: number) {
		days = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b);
	}

	function toggleCrossDay(key: string, d: number) {
		const cur = crossSchedule[key] ?? [];
		const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b);
		crossSchedule = { ...crossSchedule, [key]: next };
	}
	function crossLabel(id: string): string {
		if (id === 'custom') return customActivity.trim() || 'Your activity';
		return CROSS.find((c) => c.v === id)?.name ?? id;
	}

	function toggleCross(v: string) {
		crossTraining = crossTraining.includes(v)
			? crossTraining.filter((x) => x !== v)
			: [...crossTraining, v];
	}

	// Preview helpers: edits to the first week, saved on confirm.
	function sessionsForDay(d: number): ClientSession[] {
		return (draft?.weeks[0]?.sessions ?? []).filter((s) => s.day === d);
	}
	function moveSession(s: ClientSession, day: number) {
		const d = Math.min(6, Math.max(0, day));
		if (s.day !== d) {
			// A moved tile keeps its id but its row is re-rendered, so the open
			// popover would point at a detached tile. Close it on the drop.
			if (previewInfo?.id === s.id) previewInfo = null;
			s.day = d;
		}
	}
	function removeSession(s: ClientSession) {
		if (previewInfo?.id === s.id) previewInfo = null;
		const week = draft?.weeks[0];
		if (!week) return;
		week.sessions = week.sessions.filter((x) => x.id !== s.id);
	}
	// The tile's popover: a tap explains the category, never the workout itself.
	// A second tap on the same tile closes it, the way the info buttons toggle, so
	// the card is never left open with focus parked on the tile outside it. The
	// tile takes focus before the first open, so the focus trap hands focus back
	// here when the card closes.
	function openPreviewInfo(s: ClientSession, el: HTMLElement) {
		if (previewInfo?.id === s.id) {
			previewInfo = null;
			return;
		}
		el.focus();
		previewInfo = { id: s.id, anchor: el };
	}
	// The session the open popover points at, so a move or a removal keeps the
	// card honest. It is null when the session is gone.
	const previewInfoSession = $derived(
		previewInfo ? (draft?.weeks[0]?.sessions ?? []).find((s) => s.id === previewInfo!.id) ?? null : null,
	);
	// One popover at a time. A tap outside or Escape closes it, and Back does too
	// through the overlay history. The card is anchored, not full screen, so the
	// page around it stays live; only the keyboard is held inside it.
	$effect(() => {
		if (!previewInfo) return;
		const onPointerDown = (e: PointerEvent) => {
			const target = e.target;
			if (previewInfo && previewInfo.anchor.contains(target as Node)) return;
			if (target instanceof Element && target.closest('[data-preview-info-card]')) return;
			previewInfo = null;
		};
		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') previewInfo = null;
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeydown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeydown);
		};
	});
	// The plan stores a session's day as an offset from the week's first day, not
	// a weekday. Derive it from week one's own start date, so an added workout
	// lands on the day you picked whatever weekday that week begins on. Reading
	// the date's weekday instead put it a day late whenever week one did not start
	// on a Monday.
	function dayOf(date: string): number {
		const start = draft?.weeks[0]?.startDate ?? todayIso;
		return Math.min(6, Math.max(0, dayIndexInWeek(start, date)));
	}
	function addFromLibrary(w: LibraryWorkout) {
		const week = draft?.weeks[0];
		const date = addDay;
		closeAdd();
		if (!week || !date) return;
		week.sessions = [
			...week.sessions,
			{
				id: `preview-${w.id}-${Date.now()}`,
				day: dayOf(date),
				slot: 'AM',
				modality: w.modality,
				type: w.type,
				title: w.title,
				purpose: w.purpose,
				prescription: {
					summary: w.summary,
					intensity: w.intensity,
					targetRpe: w.targetRpe,
					workout: w.workout,
					added: true,
					libraryId: w.id,
				},
				durationMin: w.durationMin,
			},
		];
	}

	// The composer saved a workout to the profile; put a preview session on the
	// day the runner opened it from, built the same way the API builds one.
	function addFromComposer(workout: CustomWorkout) {
		const week = draft?.weeks[0];
		const date = addDay;
		closeAdd();
		if (!week || !date) return;
		const structured = customWorkoutToStructured(workout);
		const notes = customWorkoutNotes(workout);
		week.sessions = [
			...week.sessions,
			{
				id: `preview-custom-${workout.id}-${Date.now()}`,
				day: dayOf(date),
				slot: 'AM',
				modality: workout.category,
				type: customWorkoutArchetype(workout),
				title: workout.name,
				purpose: 'You added this one yourself.',
				prescription: {
					summary: 'A workout you built yourself.',
					intensity: workout.category === 'strength' ? 'steady' : 'easy',
					workout: structured,
					added: true,
					custom: true,
					...(notes ? { notes } : {}),
				},
				durationMin: structured.estimatedDurationMin ?? 45,
			},
		];
	}

	/** The edited week one in the exact shape the rebuild endpoint expects. */
	function previewSessions(): PreviewSessionInput[] {
		const week = draft?.weeks[0];
		if (!week) return [];
		return [...week.sessions]
			.sort((a, b) => a.day - b.day)
			.map((s): PreviewSessionInput => {
				const libraryId = s.prescription?.libraryId;
				return {
					day: s.day,
					slot: s.slot === 'PM' ? 'PM' : 'AM',
					modality: s.modality,
					type: s.type,
					...(s.title ? { title: s.title } : {}),
					...(s.purpose ? { purpose: s.purpose } : {}),
					...(s.prescription ? { prescription: s.prescription } : {}),
					...(s.durationMin != null ? { durationMin: s.durationMin } : {}),
					...(libraryId ? { libraryId } : {}),
				};
			});
	}

	/** Save the edited week one and rebuild the weeks ahead around it. */
	async function confirmPreview() {
		if (!draft || rebuilding) return;
		rebuilding = true;
		error = null;
		rebuildWarnings = [];
		try {
			const response = await api.rebuildFromPreview(previewSessions());
			draft = response;
			rebuildWarnings = response.warnings ?? [];
			// With a connector to offer, the last screen is the connect prompt.
			// Without one, the plan is done, so go straight to the completion state.
			if (showConnectStep) rebuilt = true;
			else done = true;
		} catch (e) {
			error = 'We could not rebuild the plan just now. Your changes are still here, so give it another go.';
			reportClientError('preview-rebuild-failed', String(e), e);
		} finally {
			rebuilding = false;
		}
	}

	async function enterApp() {
		// Refresh the shared plan store, so the app shows the plan onboarding just
		// built. The store loads once and then bails, and a brand-new runner loads
		// it (empty) before onboarding, so without this the app keeps its
		// "no plan yet" state even though the plan exists.
		await reloadPlan().catch(() => {});
		// Play the completion screen's exit, then open the app as a client-side
		// navigation so the route transition carries the move instead of a reload.
		if (typeof window === 'undefined') return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			await goto('/');
			return;
		}
		leaving = true;
		await new Promise((r) => setTimeout(r, 340));
		await goto('/');
	}
	/** Connect in a new tab, then show the completion state in this tab. */
	function connectFromFinish() {
		connectHealth();
		done = true;
	}

	// Whether the current step is answerable, so Continue can be disabled until
	// it is. Pure, with no side effects on the error message.
	const stepValid = $derived.by(() => {
		if (step.id === 'start' && startChoice === 'custom') {
			return !!customStartDate && customStartDate >= todayIso && customStartDate <= maxStartIso;
		}
		if (step.id === 'date') return !!targetDate;
		if (step.id === 'days') return days.length > 0;
		return true;
	});

	function validate(): boolean {
		if (step.id === 'start' && startChoice === 'custom') {
			if (!customStartDate) {
				error = 'Pick a start date.';
				return false;
			}
			if (customStartDate < todayIso) {
				error = 'The start date cannot be in the past.';
				return false;
			}
			if (customStartDate > maxStartIso) {
				error = 'Pick a start date within the next month.';
				return false;
			}
		}
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

	// Steps swap inside a {#key} block, so the shell keeps the scroll position the
	// last step left and the new question opens part way down. On Continue and
	// Back we move focus to the new step's heading and bring its top into view.
	// The scroll target is found by walking up from the heading to whichever
	// ancestor actually scrolls, rather than assumed to be window; under reduced
	// motion the move is a jump instead of a glide.
	async function landStepAtTop() {
		await tick();
		const heading = stepHeading;
		if (!heading) return;
		// Focus the heading without letting the browser jump to it, so a keyboard
		// or screen reader user starts at the top of the new question.
		heading.focus({ preventScroll: true });
		const behavior: ScrollBehavior = prefersReducedMotion.current ? 'auto' : 'smooth';
		let node = heading.parentElement;
		while (node) {
			const overflowY = getComputedStyle(node).overflowY;
			if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
				node.scrollTo({ top: 0, behavior });
				return;
			}
			node = node.parentElement;
		}
		// No inner scroller carries the flow today, so the document scrolls.
		window.scrollTo({ top: 0, behavior });
	}

	function next() {
		if (!validate()) return;
		dir = 1;
		stepIndex = Math.min(steps.length - 1, stepIndex + 1);
		void landStepAtTop();
	}
	function back() {
		error = null;
		dir = -1;
		stepIndex = Math.max(0, stepIndex - 1);
		void landStepAtTop();
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
				startDate: resolvedStartDate,
				availableDays: days,
				baseline: {
					experience,
					buildPreference,
					equipment,
					...(equipmentItems.length ? { equipmentItems } : {}),
					strengthDays,
					sessionMinutes,
					flexibility: { current: flexCurrent, goal: flexGoal },
					...(customActivity.trim() ? { customActivity: customActivity.trim() } : {}),
					...(() => {
						const schedule = [
							...crossTraining.map((a) => ({ activity: crossLabel(a), days: crossSchedule[a] ?? [] })),
							...(customActivity.trim()
								? [{ activity: customActivity.trim(), days: crossSchedule.custom ?? [] }]
								: []),
						].filter((e) => e.days.length);
						return schedule.length ? { crossTrainingSchedule: schedule } : {};
					})(),
					terrain,
					...(crossTraining.length ? { crossTraining } : {}),
					...(str(niggles) ? { niggles: str(niggles) } : {}),
					...(recentTimes ? { recentTimes } : {}),
					weeklyKm:
						weeklyNum != null && Number.isFinite(weeklyNum) && weeklyNum > 0
							? prefs.units === 'imperial'
								? Math.round(milesToKm(weeklyNum) * 10) / 10
								: weeklyNum
							: recWeekly.value,
					...(str(notes) ? { notes: str(notes) } : {}),
				},
				...(needsRaceDate && targetDate ? { targetDate } : {}),
			};

			// Store the personal details first, so plan generation reads the age.
			// The birth year is stored as a year so it stays right over time.
			await setPersonal({ name: str(firstName), birthYear });
			await setVitals(vitalsToStore());

			// Store the equipment choice first, so plan generation reads it.
			await setEquipment(equipment);
			await setEquipmentItems(equipmentItems);
			await setGymPreset(gymPreset);

			// Store the favorites next, so the generated plan can lean on them.
			await setFavoriteMachines(favoriteMachines);
			await setFavoriteWorkouts(favoriteWorkouts);

			// Store the blocked-out windows, if the runner added any.
			await setSchedule(schedule);

			await Promise.race([
				api.generatePlan(body),
				new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
			]);
			// Show a preview of the first week instead of jumping straight in.
			draft = await api.currentPlan(auth.user?.id ?? null);
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
	{#snippet rebuildNotice()}
		{#if rebuildWarnings.length}
			<div class="mt-4 rounded-xl border border-hairline bg-sunken p-4 text-left">
				<p class="tabular text-xs uppercase tracking-widest text-steel">About this plan</p>
				{#each rebuildWarnings as w (w)}
					<p class="mt-2 text-sm leading-relaxed text-ink">{w}</p>
				{/each}
			</div>
		{/if}
	{/snippet}
	{#if done}
		<section class="sg-done-screen mx-auto max-w-xl text-center" class:sg-leaving={leaving}>
			<div class="sg-done-mark mx-auto" aria-hidden="true">
				<svg viewBox="0 0 48 48" fill="none" class="block h-20 w-20">
					<circle
						class="sg-done-ring"
						cx="24"
						cy="24"
						r="21"
						stroke="var(--signal-ink)"
						stroke-width="2"
					></circle>
					<path
						class="sg-done-check"
						d="M15 24.5l6.5 6.5L33 18"
						stroke="var(--signal-ink)"
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
					></path>
				</svg>
			</div>
			<p class="sg-done-item tabular mt-6 text-xs uppercase tracking-widest text-steel" style="--i: 0">
				{draft.weeks.length} weeks ready
			</p>
			<h1 class="sg-done-item font-display mt-2 text-3xl font-bold tracking-tight" style="--i: 1">
				Your plan is built
			</h1>
			<p class="sg-done-item mt-3 text-sm leading-relaxed text-steel" style="--i: 2">
				Saved and ready. It keeps adapting as you train, so the plan meets the runner you are
				becoming.
			</p>
			{@render rebuildNotice()}
			<button
				type="button"
				onclick={enterApp}
				disabled={leaving}
				class="sg-done-item mt-8 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
				style="--i: 3"
			>
				Enter Stride Guide
			</button>
		</section>
	{:else if rebuilt}
		<section class="mx-auto max-w-xl">
			<p class="tabular text-xs uppercase tracking-widest text-steel">One last thing</p>
			<h1 class="font-display mt-1 text-2xl font-bold">Your plan is ready</h1>
			<p class="mt-2 text-sm leading-relaxed text-steel">
				Link Google Health to pull in the runs and rides you do outside the plan, so the work you actually do counts and the plan stays honest. It opens Google in a new tab, so this page stays put.
			</p>
			{@render rebuildNotice()}
			<button type="button" onclick={connectFromFinish} class="mt-6 w-full rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90">
				Connect Google Health
			</button>
			<button type="button" onclick={() => (done = true)} class="mt-3 w-full rounded-md border border-hairline-strong px-5 py-3 text-sm text-steel hover:border-signal hover:text-signal-ink">
				Skip for now
			</button>
			<p class="mt-2 text-xs text-steel">You can connect any time from Settings.</p>
		</section>
	{:else}
		{@const week0 = draft.weeks[0]}
		<section class="mx-auto max-w-xl">
			<p class="tabular text-xs uppercase tracking-widest text-steel">Preview</p>
			<h1 class="font-display mt-1 text-2xl font-bold">Your first week</h1>
			<p class="mt-2 text-sm text-steel">This is a model of your first week, built around what you told us. The training science comes first, then the engine's own choices and variety, then your preferences. Move a workout, add or remove a session, and the weeks ahead rebuild around your changes.</p>
			<p class="mt-2 text-sm text-steel">Your plan starts {weekdayNameFor(resolvedStartDate)}, {fmtShortDate(resolvedStartDate)}.</p>

			{#if planReview}
				<div class="mt-4 rounded-xl border border-hairline bg-sunken p-4">
					<p class="tabular text-xs uppercase tracking-widest text-steel">Your coach's read</p>
					<p class="mt-2 text-sm leading-relaxed text-ink">{planReview}</p>
				</div>
			{/if}

			<div class="mt-5">
				{#each [0, 1, 2, 3, 4, 5, 6] as d (d)}
					{@const name = weekdayNameFor(addDaysIso(week0?.startDate ?? todayIso, d))}
					{@const daySess = sessionsForDay(d)}
					<div
						class="flex items-start gap-3 rounded-lg border-b border-hairline py-3"
						role="listitem"
						data-drop-day={d}
					>
						<span class="tabular w-9 shrink-0 pt-1 text-xs uppercase tracking-widest text-steel">{name.slice(0, 3)}</span>
						<div class="flex min-w-0 flex-1 flex-wrap gap-2">
							{#each daySess as s (s.id)}
								<div
									class="flex touch-manipulation select-none items-center gap-1 rounded-lg border border-hairline bg-paper px-2 py-1 text-sm"
									use:dragToDay={{ onDropDay: (day) => moveSession(s, day) }}
								>
									<button
										type="button"
										onclick={(e) => openPreviewInfo(s, e.currentTarget)}
										aria-expanded={previewInfo?.id === s.id}
										aria-controls={previewInfo?.id === s.id ? 'preview-info-card' : undefined}
										class="max-w-[10rem] cursor-grab truncate hover:text-signal-ink"
										title="Tap for what it is, drag to move"
									>
										{PREVIEW_CATEGORY_LABEL[previewCategory(s)]}
									</button>
									<button type="button" aria-label="Remove" onclick={() => removeSession(s)} class="px-1 text-steel hover:text-danger">✕</button>
								</div>
							{/each}
							<button type="button" onclick={() => { addDay = addDaysIso(week0?.startDate ?? todayIso, d); addMode = 'choose'; }} class="rounded-lg border border-dashed border-hairline px-2 py-1 text-xs text-signal-ink hover:border-signal">
								＋ Add workout
							</button>
						</div>
					</div>
				{/each}
			</div>

			<p class="mt-4 text-xs text-steel">On a computer, click and drag a workout to another day. On a phone, press and hold it, then drag. Tap a workout to see what it is for, or add and remove them.</p>

			<button
				type="button"
				onclick={confirmPreview}
				disabled={rebuilding}
				class="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
			>
				{#if rebuilding}
					<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.25"></circle>
						<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"></path>
					</svg>
					Building the rest
				{:else}
					Looks good, build the rest
				{/if}
			</button>
			<p class="mt-2 text-center text-xs text-steel">This saves your week one and rebuilds the weeks ahead.</p>

			{#if error}
				<p class="mt-3 text-sm text-signal-ink">{error}</p>
			{/if}

			{#if addMode === 'choose' && addDay}
				<div
					class="sg-sheet fixed inset-0 flex items-end justify-center sm:items-center sm:p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="add-workout-title"
					use:modal={{ onClose: closeAdd }}
				>
					<button type="button" aria-label="Close" data-modal-backdrop onclick={closeAdd} class="absolute inset-0 bg-ink/40"></button>
					<div
						data-modal-panel
						tabindex="-1"
						class="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border-t border-hairline bg-paper outline-none sm:rounded-2xl"
						style="padding-bottom: env(safe-area-inset-bottom)"
					>
						<div class="flex items-center justify-between gap-3 border-b border-hairline p-4">
							<div class="min-w-0">
								<p class="tabular text-xs uppercase tracking-widest text-steel">Add to {weekdayNameFor(addDay)}</p>
								<h2 id="add-workout-title" class="font-display text-lg font-bold">Add a workout</h2>
							</div>
							<button type="button" onclick={closeAdd} aria-label="Close" class="flex h-11 w-11 shrink-0 items-center justify-center text-steel hover:text-ink">✕</button>
						</div>
						<div class="scroll-modern min-h-0 flex-1 overflow-y-auto p-4">
							<button
								type="button"
								onclick={() => (addMode = 'compose')}
								class="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong py-3 text-sm text-signal-ink hover:border-signal"
							>
								＋ Build a custom workout
							</button>
							<p class="mb-2 text-xs uppercase tracking-widest text-steel">From the library</p>
							<input
								type="search"
								bind:value={libQ}
								enterkeyhint="search"
								aria-label="Search workouts"
								placeholder="Search workouts"
								class="w-full rounded-xl border border-hairline bg-paper px-3 py-2 text-base text-ink placeholder:text-steel focus:border-signal-ink focus:outline-none sm:text-sm"
							/>
							<div class="mt-3">
								<WorkoutFilter
									categories={libCategoryOptions}
									bind:category={libCategory}
									bodyParts={libParts}
									bind:bodyPart={libPart}
									showBodyParts={showLibParts}
								/>
							</div>
							{#if shownLibrary.length === 0}
								<p class="mt-3 px-1 py-6 text-center text-sm text-steel">
									No workouts match. Try another word or filter, or build your own.
								</p>
							{:else}
								<ul class="mt-3 grid gap-2 sm:grid-cols-2">
									{#each shownLibrary as w (w.id)}
										<li>
											<button
												type="button"
												onclick={() => addFromLibrary(w)}
												class="flex h-full w-full flex-col rounded-xl border border-hairline p-3 text-left transition-colors hover:border-signal-ink"
											>
												<span class="flex flex-wrap items-baseline gap-x-2">
													<span class="font-display font-medium">{w.title}</span>
													{#if workoutLengthLabel(w.durationMin)}
														<span class="tabular text-xs text-steel">· {workoutLengthLabel(w.durationMin)}</span>
													{/if}
												</span>
												<span class="mt-1 text-xs leading-relaxed text-steel">{w.summary}</span>
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				</div>
			{/if}
			<WorkoutComposer
				open={addMode === 'compose'}
				category="strength"
				context={composerContext}
				onSaved={addFromComposer}
				onClose={closeAdd}
			/>
			{#if previewInfo && previewInfoSession}
				{@const category = previewCategory(previewInfoSession)}
				<div
					id="preview-info-card"
					role="dialog"
					aria-labelledby="preview-info-title"
					tabindex="-1"
					data-preview-info-card
					data-modal-panel
					use:focusTrap
					use:anchor={{ anchor: previewInfo.anchor, width: 260 }}
					class="fixed z-[60] w-[260px] rounded-lg border border-hairline bg-paper p-3 text-left shadow-lg outline-none"
				>
					<div class="flex items-start justify-between gap-2">
						<strong id="preview-info-title" class="text-sm font-semibold">{PREVIEW_CATEGORY_LABEL[category]}</strong>
						<button type="button" aria-label="Close" onclick={() => (previewInfo = null)} class="tap-target -mr-1 -mt-1 shrink-0 text-steel hover:text-danger">✕</button>
					</div>
					<p class="mt-1 text-xs leading-relaxed text-steel">{PREVIEW_CATEGORY_BLURB[category]}</p>
				</div>
			{/if}
		</section>
	{/if}
{:else}
	<!-- Extra bottom room so the guide list clears the fixed action bar: the app
	     shell already pads the bottom on phones, this adds the rest for desktop. -->
	<section class="mx-auto max-w-xl pb-8 sm:pb-16">
		<!-- Sticky top bar. The Sign out and close controls live in the app shell
		     as a fixed float on the right, so this reserves room for them and the
		     two read as one bar. z is under the float (40) so they stay tappable. -->
		<header
			class="sticky top-0 z-30 -mx-4 border-b border-hairline bg-paper/95 px-4 backdrop-blur"
			style="padding-top: env(safe-area-inset-top)"
		>
			<div class="flex min-h-[3.25rem] items-center justify-between gap-2 pb-1 pt-2 pr-36 sm:pr-0">
				<p class="tabular text-xs text-steel">
					Step {Math.min(stepIndex, steps.length - 1) + 1} of {steps.length}
				</p>
				<div class="flex items-center gap-2">
					<div class="flex overflow-hidden rounded-md border border-hairline" role="group" aria-label="Units">
						{#each [{ v: 'imperial', l: 'mi' }, { v: 'metric', l: 'km' }] as opt (opt.v)}
							<button
								type="button"
								aria-pressed={prefs.units === opt.v}
								onclick={() => setUnits(opt.v as 'metric' | 'imperial')}
								class="px-2 py-0.5 text-xs {prefs.units === opt.v ? 'bg-ink text-paper' : 'text-steel hover:text-ink'}"
							>
								{opt.l}
							</button>
						{/each}
					</div>
					<p class="tabular w-9 text-right text-xs text-steel">{Math.round(progress * 100)}%</p>
				</div>
			</div>
			<div class="h-1 w-full overflow-hidden rounded-full bg-hairline">
				<div class="h-full rounded-full bg-signal-ink transition-[width] duration-500 ease-out" style="width: {progress * 100}%"></div>
			</div>
		</header>

	{#key step.id}
		<div class={dir === 1 ? 'sg-enter-right' : 'sg-enter-left'}>
			<h1 bind:this={stepHeading} tabindex="-1" class="font-display mt-6 text-2xl font-bold outline-none">{step.title}</h1>
			<p class="mt-2 text-sm leading-relaxed text-steel">{step.lede}</p>

			<div class="mt-5">
				{#if step.id === 'about'}
					<div class="grid gap-4">
						<label class="block">
							<span class="text-sm font-medium">What should we call you?</span>
							<input
								type="text"
								bind:value={firstName}
								maxlength="40"
								placeholder="First name"
								class="mt-1 w-full rounded-xl border border-hairline bg-paper px-4 py-3 text-sm"
							/>
						</label>
						<label class="block">
							<span class="text-sm font-medium">Birth year</span>
							<select
								bind:value={birthYear}
								class="tabular mt-1 w-full rounded-xl border border-hairline bg-paper px-4 py-3 text-sm"
							>
								{#each birthYears as year (year)}
									<option value={year}>{year}</option>
								{/each}
							</select>
							<span class="mt-1 block text-xs text-steel">Used only to tune the plan by age band.</span>
						</label>
						<div class="grid grid-cols-3 gap-2">
							<label class="block">
								<span class="text-sm font-medium">Height</span>
								<input
									type="number"
									bind:value={heightInput}
									placeholder={prefs.units === 'imperial' ? '70' : '178'}
									class="tabular mt-1 w-full min-w-0 rounded-xl border border-hairline bg-paper px-3 py-3 text-sm"
								/>
								<span class="mt-1 block text-[10px] uppercase tracking-wide text-steel">
									{prefs.units === 'imperial' ? 'inches' : 'cm'}
								</span>
							</label>
							<label class="block">
								<span class="text-sm font-medium">Weight</span>
								<input
									type="number"
									bind:value={weightInput}
									placeholder={prefs.units === 'imperial' ? '160' : '72'}
									class="tabular mt-1 w-full min-w-0 rounded-xl border border-hairline bg-paper px-3 py-3 text-sm"
								/>
								<span class="mt-1 block text-[10px] uppercase tracking-wide text-steel">
									{prefs.units === 'imperial' ? 'lb' : 'kg'}
								</span>
							</label>
							<label class="block">
								<span class="text-sm font-medium">Resting HR</span>
								<input
									type="number"
									bind:value={restingHrInput}
									min="30"
									max="120"
									placeholder="60"
									class="tabular mt-1 w-full min-w-0 rounded-xl border border-hairline bg-paper px-3 py-3 text-sm"
								/>
								<span class="mt-1 block text-[10px] uppercase tracking-wide text-steel">bpm</span>
							</label>
						</div>
						<p class="text-xs text-steel">Height, weight and resting heart rate are optional, and never shown to anyone else.</p>
					</div>
				{:else if step.id === 'goal'}
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
				{:else if step.id === 'start'}
					<div class="grid gap-2">
						<button
							type="button"
							aria-pressed={startChoice === 'today'}
							onclick={() => (startChoice = 'today')}
							class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {startChoice === 'today'
								? 'border-signal-ink bg-signal-wash'
								: 'border-hairline hover:border-steel'}"
						>
							<span class="font-display font-medium">Today</span>
							<span class="tabular text-sm text-steel">{fmtShortDate(todayIso)}</span>
						</button>
						<button
							type="button"
							aria-pressed={startChoice === 'next'}
							onclick={() => (startChoice = 'next')}
							class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {startChoice === 'next'
								? 'border-signal-ink bg-signal-wash'
								: 'border-hairline hover:border-steel'}"
						>
							<span class="font-display font-medium">Next {nextStartName}</span>
							<span class="tabular text-sm text-steel">{fmtShortDate(nextWeekStartDate)}</span>
						</button>
						<button
							type="button"
							aria-pressed={startChoice === 'custom'}
							onclick={() => (startChoice = 'custom')}
							class="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {startChoice === 'custom'
								? 'border-signal-ink bg-signal-wash'
								: 'border-hairline hover:border-steel'}"
						>
							<span class="font-display font-medium">Pick a date</span>
							<span class="tabular text-sm text-steel">{customStartDate ? fmtShortDate(customStartDate) : 'Choose a date'}</span>
						</button>
						{#if startChoice === 'custom'}
							<input
								type="date"
								bind:value={customStartDate}
								min={todayIso}
								max={maxStartIso}
								aria-label="Plan start date"
								class="date-field tabular mt-1 rounded-xl border border-hairline bg-paper px-4 py-3 text-base sm:text-sm"
							/>
							<p class="text-xs text-steel">Up to {fmtShortDate(maxStartIso)}. Past dates are not allowed.</p>
						{/if}
					</div>
				{:else if step.id === 'date'}
					<input
						type="date"
						bind:value={targetDate}
						aria-label="Race date"
						class="date-field tabular rounded-xl border border-hairline bg-paper px-4 py-3 text-base sm:text-sm"
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
							That time is not possible for a {RACE_DISTANCES.find((d) => d.key === raceKey)?.label}. Check the pickers, or leave them at zero if you are not sure.
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
							placeholder={prefs.units === 'imperial'
								? String(Math.round(recWeekly.value / 1.609344))
								: String(recWeekly.value)}
							aria-label="Starting weekly distance"
							class="tabular w-24 min-w-0 shrink-0 rounded-xl border border-hairline bg-paper px-4 py-3 text-sm"
						/>
						<span class="min-w-0 text-sm text-steel">{distanceUnit()} per week</span>
					</div>
					<p class="mt-3 rounded-lg bg-sunken p-3 text-sm leading-relaxed text-steel">
						{recWeekly.reason}
						{#if !weeklyKm.trim()} Leave it blank to use this.{/if}
					</p>
				{:else if step.id === 'build'}
					<div class="grid gap-2">
						{#each BUILD_PREFS as opt (opt.v)}
							<button
								type="button"
								aria-pressed={buildPreference === opt.v}
								onclick={() => { buildPreference = opt.v; tunedBuild = true; }}
								class="flex flex-col rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink {buildPreference === opt.v
									? 'border-signal-ink bg-signal-wash'
									: 'border-hairline hover:border-steel'}"
							>
								<span class="font-display font-medium">{opt.name}</span>
								<span class="mt-0.5 text-sm text-steel">{opt.note}</span>
							</button>
						{/each}
					</div>
					<p class="mt-3 rounded-lg bg-sunken p-3 text-sm leading-relaxed text-steel">{recBuild.reason}</p>
				{:else if step.id === 'days'}
					<div class="rounded-xl border border-hairline bg-paper p-4">
						<p class="tabular text-xs uppercase tracking-widest text-steel">Days you can train</p>
						<div class="mt-2 flex justify-between gap-1">
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
						<p class="mt-2 text-sm text-steel">{days.length} {days.length === 1 ? 'day' : 'days'} a week.</p>

						<div class="mt-4 border-t border-hairline pt-4">
							<p class="tabular text-xs uppercase tracking-widest text-steel">Hours you are usually free</p>
							<p class="mt-1 text-xs leading-relaxed text-steel">
								Then block the hours you are usually free on those days, so the plan can fit sessions
								into the time you actually have. Days you have not picked are dimmed, and a training
								day with no window is treated as any time. This part is optional: skip it and any
								time on a training day is open.
							</p>
							<div class="mt-3">
								<ScheduleGrid blocks={schedule} onChange={(b) => (schedule = b)} activeDays={days} />
							</div>
						</div>
					</div>
				{:else if step.id === 'equipment'}
					<p class="tabular text-xs uppercase tracking-widest text-steel">Your setup</p>
					<p class="mt-1 text-xs text-steel">Pick the kind of strength work you want. This decides how a session is built.</p>
					<div class="mt-2 grid gap-2">
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
					{#if equipment !== 'bodyweight'}
						<p class="tabular mt-5 text-xs uppercase tracking-widest text-steel">What you have</p>
						<p class="mt-1 text-xs text-steel">Now tick the kit that is really there when you train. It narrows the moves to what you can do. Leave it blank to use everything the setup allows.</p>
						<div class="mt-2 flex flex-wrap gap-2">
							{#each EQUIPMENT_ITEMS as item (item.v)}
								<button
									type="button"
									aria-pressed={equipmentItems.includes(item.v)}
									onclick={() =>
										(equipmentItems = equipmentItems.includes(item.v)
											? equipmentItems.filter((x) => x !== item.v)
											: [...equipmentItems, item.v])}
									class="rounded-full border px-3 py-1.5 text-sm transition-colors {equipmentItems.includes(item.v)
										? 'border-signal-ink bg-signal-wash text-signal-ink'
										: 'border-hairline text-steel hover:border-steel'}"
								>
									{item.name}
								</button>
							{/each}
						</div>
					{/if}
					{#if equipment === 'machines' || equipment === 'both' || equipment === 'full-gym'}
						<p class="tabular mt-5 text-xs uppercase tracking-widest text-steel">Your gym</p>
						<p class="mt-1 text-xs text-steel">Optional. Pick the chain if you train at one, and we set your setup to match. You can change it any time in Settings.</p>
						<div class="mt-2 flex flex-wrap gap-2">
							{#each GYM_PRESETS as gym (gym.id)}
								<button
									type="button"
									aria-pressed={gymPreset === gym.id}
									onclick={() => {
										if (gymPreset === gym.id) {
											gymPreset = undefined;
										} else {
											gymPreset = gym.id;
											equipment = gym.mode;
										}
									}}
									class="rounded-full border px-3 py-1.5 text-sm transition-colors {gymPreset === gym.id
										? 'border-signal-ink bg-signal-wash text-signal-ink'
										: 'border-hairline text-steel hover:border-steel'}"
								>
									{gym.name}
								</button>
							{/each}
						</div>
					{/if}
				{:else if step.id === 'strength'}
					<p class="tabular text-xs uppercase tracking-widest text-steel">Sessions a week</p>
					<div class="mt-2 flex gap-2">
						{#each [1, 2, 3] as n (n)}
							<button type="button" aria-pressed={strengthDays === n} onclick={() => { strengthDays = n; tunedStrength = true; }} class="tabular flex h-12 flex-1 items-center justify-center rounded-lg text-sm transition-colors {strengthDays === n ? 'bg-ink font-bold text-paper' : 'border border-hairline text-steel hover:border-steel'}">{n}</button>
						{/each}
					</div>
					<p class="mt-3 rounded-lg bg-sunken p-3 text-sm leading-relaxed text-steel">{recStrength.reason}</p>
					<p class="tabular mt-5 text-xs uppercase tracking-widest text-steel">Time you can train in a day</p>
					<div class="mt-2 flex gap-2">
						{#each [30, 45, 60] as n (n)}
							<button type="button" aria-pressed={sessionMinutes === n} onclick={() => { sessionMinutes = n; tunedMinutes = true; }} class="tabular flex h-12 flex-1 items-center justify-center rounded-lg text-sm transition-colors {sessionMinutes === n ? 'bg-ink font-bold text-paper' : 'border border-hairline text-steel hover:border-steel'}">{n} min</button>
						{/each}
					</div>
					<p class="mt-3 rounded-lg bg-sunken p-3 text-sm leading-relaxed text-steel">{recMinutes.reason}</p>
				{:else if step.id === 'favorites'}
					<FavoritePicker bind:favoriteMachines bind:favoriteWorkouts />
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
					<p class="mt-4 rounded-lg bg-sunken p-3 text-sm leading-relaxed text-steel">{flexCadence}</p>
				{:else if step.id === 'crossTraining'}
					<div class="flex flex-wrap gap-2">
						{#each CROSS_PRIMARY as opt (opt.v)}
							<button type="button" aria-pressed={crossTraining.includes(opt.v)} onclick={() => toggleCross(opt.v)} class="rounded-xl border px-4 py-3 text-sm transition-colors {crossTraining.includes(opt.v) ? 'border-signal-ink bg-signal-wash font-medium' : 'border-hairline text-steel hover:border-steel'}">{opt.name}</button>
						{/each}
						{#if showMoreCross}
							{#each CROSS_MORE as opt (opt.v)}
								<button type="button" aria-pressed={crossTraining.includes(opt.v)} onclick={() => toggleCross(opt.v)} class="rounded-xl border px-4 py-3 text-sm transition-colors {crossTraining.includes(opt.v) ? 'border-signal-ink bg-signal-wash font-medium' : 'border-hairline text-steel hover:border-steel'}">{opt.name}</button>
							{/each}
						{:else}
							<button type="button" onclick={() => (showMoreCross = true)} class="rounded-xl border border-dashed border-hairline-strong px-4 py-3 text-sm text-signal-ink hover:border-signal">Show more</button>
						{/if}
					</div>
					<label class="mt-4 block">
						<span class="text-sm">Anything else you do?</span>
						<input
							type="text"
							bind:value={customActivity}
							maxlength="120"
							placeholder="e.g. rock climbing, paddle boarding"
							class="mt-1 w-full rounded-xl border border-hairline bg-paper px-4 py-3 text-sm"
						/>
						<span class="mt-1 block text-xs text-steel">Your coach uses this to shape the plan. Anything you pick or write stays gentle, so it never crowds the running.</span>
					</label>
					{#if crossTraining.length || customActivity.trim()}
						<div class="mt-5 grid gap-4">
							<p class="tabular text-xs uppercase tracking-widest text-steel">Which days?</p>
							{#each [...crossTraining, ...(customActivity.trim() ? ['custom'] : [])] as key (key)}
								<div>
									<p class="text-sm font-medium">{crossLabel(key)}</p>
									<div class="mt-1 flex justify-between gap-1">
										{#each DAY_INITIALS as initial, d (d)}
											<button
												type="button"
												aria-pressed={(crossSchedule[key] ?? []).includes(d)}
												onclick={() => toggleCrossDay(key, d)}
												class="tabular flex h-11 flex-1 items-center justify-center rounded-lg text-sm transition-colors {(crossSchedule[key] ?? []).includes(
													d,
												)
													? 'bg-ink font-bold text-paper'
													: 'border border-hairline text-steel hover:border-steel'}"
											>
												{initial}
											</button>
										{/each}
									</div>
								</div>
							{/each}
							<p class="text-xs text-steel">
								We keep the running off those days and put the sport there instead. Leave a row blank if it varies.
							</p>
						</div>
					{/if}
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
						aria-label="Soreness or injury"
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

	<!-- Sticky action bar: the questions scroll under it. Fixed, not sticky,
	     because the app shell owns the scroll container and its bottom padding,
	     so a sticky bar would drift off the bottom near the end of the page. -->
	<div class="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-paper/95 backdrop-blur">
		<div
			class="mx-auto flex max-w-xl items-center gap-3 px-4 py-3"
			style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom))"
		>
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
					disabled={submitting || !stepValid}
					class="flex-1 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
				>
					{submitting ? 'Generating…' : `Build my ${selected?.name ?? ''} plan`}
				</button>
			{:else}
				<button
					type="button"
					onclick={next}
					disabled={!stepValid}
					class="flex-1 rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
				>
					Continue
				</button>
			{/if}
		</div>
	</div>
	</section>
{/if}

{#if generating || rebuilding}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-paper/95 px-6 text-center backdrop-blur"
		role="dialog"
		aria-modal="true"
		aria-labelledby={buildTitleId}
		use:modal={() => {}}
	>
		<div data-modal-panel tabindex="-1" class="flex flex-col items-center gap-4 outline-none">
			<span class="breathe h-3 w-3 rounded-full bg-signal-ink" aria-hidden="true"></span>
			<div role="status" aria-live="polite">
				<p id={buildTitleId} class="font-display text-lg font-medium">
					{generating ? `${STAGES[stage]}…` : 'Building the rest of your plan…'}
				</p>
				<p class="mt-1 text-sm text-steel">This usually takes a few seconds.</p>
			</div>
		</div>
	</div>
{/if}

<style>
	/*
	 * A native date input carries its own intrinsic width, sized for the longest
	 * date plus the picker icon, and Safari renders it internally as inline-flex.
	 * On iOS 17 and earlier width: 100% is ignored on it, so it spills past the
	 * padded container however small the max-width is; min-width alone cannot fix
	 * it because the intrinsic width is the control's own minimum. Clearing the
	 * appearance makes it size like a normal field. The native picker still opens
	 * on tap, since only the CSS rendering changes.
	 */
	.date-field {
		display: block;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
		-webkit-appearance: none;
		appearance: none;
	}
	/* The completion moment: the mark draws in, then the copy and the button rise
	   in turn, and the whole screen plays an exit before the app opens. The
	   resting state is the finished drawing, so with reduced motion everything is
	   complete at rest. */
	.sg-done-mark {
		width: 5rem;
		height: 5rem;
		animation: sg-done-pop 0.55s var(--ease-out) both;
	}
	.sg-done-ring {
		stroke-dasharray: 132;
		animation: sg-ring-draw 0.75s var(--ease-out) both;
	}
	.sg-done-check {
		stroke-dasharray: 30;
		animation: sg-check-draw 0.45s var(--ease-out) 0.42s both;
	}
	.sg-done-item {
		animation: sg-done-rise 0.5s var(--ease-out) both;
		animation-delay: calc(0.5s + var(--i, 0) * 0.12s);
	}
	.sg-done-screen.sg-leaving {
		animation: sg-done-leave 0.34s ease-in both;
	}
	@keyframes sg-done-pop {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.9);
		}
		60% {
			transform: translateY(0) scale(1.04);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes sg-ring-draw {
		from {
			stroke-dashoffset: 132;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes sg-check-draw {
		from {
			stroke-dashoffset: 30;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes sg-done-rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes sg-done-leave {
		to {
			opacity: 0;
			transform: translateY(-10px) scale(0.97);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sg-done-mark,
		.sg-done-ring,
		.sg-done-check,
		.sg-done-item,
		.sg-done-screen.sg-leaving {
			animation: none;
		}
	}
</style>
